from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import RLock
from time import monotonic

import numpy as np
from scipy.sparse import csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .config import settings
from .repository import CatalogItem, Interaction, Repository


@dataclass(frozen=True)
class ScoredItem:
    resource_id: str
    score: float
    explanation: str


class ModelStore:
    """Caches catalog vectors; invalidation is time-based to keep the service simple to defend."""

    def __init__(self, repository: Repository) -> None:
        self.repository = repository
        self._lock = RLock()
        self._loaded_at = 0.0
        self.items: list[CatalogItem] = []
        self.index: dict[str, int] = {}
        self.vectorizer: TfidfVectorizer | None = None
        self.matrix: csr_matrix | None = None

    def load(self, force: bool = False) -> None:
        with self._lock:
            if not force and self.matrix is not None and monotonic() - self._loaded_at < settings.model_cache_seconds:
                return
            items = self.repository.catalog()
            self.items = items
            self.index = {item.resource_id: position for position, item in enumerate(items)}
            if not items:
                self.vectorizer = None
                self.matrix = None
                self._loaded_at = monotonic()
                return
            vectorizer = TfidfVectorizer(
                stop_words="english",
                ngram_range=(1, 2),
                min_df=1,
                max_features=50_000,
                sublinear_tf=True,
            )
            self.matrix = vectorizer.fit_transform(item.document for item in items).tocsr()
            self.vectorizer = vectorizer
            self._loaded_at = monotonic()


class Recommender:
    def __init__(self, repository: Repository) -> None:
        self.repository = repository
        self.model = ModelStore(repository)

    def for_user(self, user_id: str, limit: int) -> tuple[list[ScoredItem], str]:
        self.model.load()
        interactions = self.repository.interactions_for_user(user_id)
        known = [event for event in interactions if event.resource_id in self.model.index]
        if not known:
            department = self.repository.user_department(user_id)
            return self.popular(limit, department), "cold_start"
        return self.from_interactions(known, limit), "personalized"

    def from_interactions(
        self,
        interactions: list[Interaction],
        limit: int,
        candidates_to_exclude: set[str] | None = None,
    ) -> list[ScoredItem]:
        self.model.load()
        if self.model.matrix is None:
            return []
        now = datetime.now(timezone.utc)
        indices: list[int] = []
        weights: list[float] = []
        seen = {event.resource_id for event in interactions}
        for event in interactions:
            index = self.model.index.get(event.resource_id)
            if index is None:
                continue
            timestamp = event.created_at
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
            age_days = max((now - timestamp).total_seconds() / 86_400, 0)
            recency = 0.5 ** (age_days / settings.recommendation_half_life_days)
            event_weight = 2.0 if event.event_type == "DOWNLOAD" else 1.0
            indices.append(index)
            weights.append(event_weight * recency)
        if not indices:
            return []
        weight_array = np.asarray(weights, dtype=float)
        weighted = self.model.matrix[indices].multiply(weight_array[:, np.newaxis])
        profile = csr_matrix(weighted.sum(axis=0) / weight_array.sum())
        similarities = cosine_similarity(profile, self.model.matrix).ravel()
        excluded = seen | (candidates_to_exclude or set())
        ranked = np.argsort(similarities)[::-1]
        results: list[ScoredItem] = []
        strongest = self.model.items[indices[int(np.argmax(weight_array))]].title
        for index in ranked:
            item = self.model.items[int(index)]
            if item.resource_id in excluded or similarities[index] <= 0:
                continue
            results.append(
                ScoredItem(
                    item.resource_id,
                    round(float(similarities[index]), 6),
                    f"Similar to resources you used, especially “{strongest}”",
                )
            )
            if len(results) == limit:
                break
        return results

    def similar(self, resource_id: str, limit: int) -> list[ScoredItem] | None:
        self.model.load()
        if self.model.matrix is None or resource_id not in self.model.index:
            return None
        source_index = self.model.index[resource_id]
        scores = cosine_similarity(self.model.matrix[source_index], self.model.matrix).ravel()
        results: list[ScoredItem] = []
        source = self.model.items[source_index]
        for index in np.argsort(scores)[::-1]:
            item = self.model.items[int(index)]
            if item.resource_id == resource_id or scores[index] <= 0:
                continue
            results.append(
                ScoredItem(
                    item.resource_id,
                    round(float(scores[index]), 6),
                    f"Shares topics and keywords with “{source.title}”",
                )
            )
            if len(results) == limit:
                break
        return results

    def popular(self, limit: int, department: str | None = None) -> list[ScoredItem]:
        self.model.load()
        candidates = self.model.items
        if department:
            matching = [item for item in candidates if item.department == department]
            candidates = matching or candidates
        ranked = sorted(candidates, key=lambda item: item.popularity, reverse=True)[:limit]
        highest = max((item.popularity for item in ranked), default=1) or 1
        return [
            ScoredItem(
                item.resource_id,
                round(item.popularity / highest, 6),
                f"Popular in {department}" if department else "Popular across the library",
            )
            for item in ranked
        ]

    def evaluate(self, k: int = 5) -> dict[str, object]:
        self.model.load(force=True)
        grouped: dict[str, list[Interaction]] = defaultdict(list)
        for event in self.repository.all_interactions():
            if event.resource_id in self.model.index:
                grouped[event.user_id].append(event)
        scores: list[tuple[float, float]] = []
        baseline_scores: list[tuple[float, float]] = []
        popular_ids = {item.resource_id for item in self.popular(k)}
        evaluated_events = 0
        for events in grouped.values():
            unique_resources = list(dict.fromkeys(event.resource_id for event in events))
            if len(unique_resources) < 3:
                continue
            split = max(1, int(len(events) * 0.8))
            train, test = events[:split], events[split:]
            test_ids = {event.resource_id for event in test} - {event.resource_id for event in train}
            if not test_ids:
                continue
            predicted = {item.resource_id for item in self.from_interactions(train, k)}
            scores.append(precision_recall_at_k(predicted, test_ids, k))
            baseline_scores.append(precision_recall_at_k(popular_ids, test_ids, k))
            evaluated_events += len(test)
        return {
            "k": k,
            "users_evaluated": len(scores),
            "held_out_events": evaluated_events,
            "method": aggregate_scores(scores),
            "popularity_baseline": aggregate_scores(baseline_scores),
            "split": "Per-user chronological 80/20 split; previously seen items excluded",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }


def precision_recall_at_k(predicted: set[str], relevant: set[str], k: int) -> tuple[float, float]:
    hits = len(predicted & relevant)
    return hits / k, hits / len(relevant) if relevant else 0.0


def aggregate_scores(scores: list[tuple[float, float]]) -> dict[str, float]:
    if not scores:
        return {"precision_at_k": 0.0, "recall_at_k": 0.0}
    return {
        "precision_at_k": round(sum(score[0] for score in scores) / len(scores), 6),
        "recall_at_k": round(sum(score[1] for score in scores) / len(scores), 6),
    }
