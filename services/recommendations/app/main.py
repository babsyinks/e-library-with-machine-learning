import secrets
from functools import lru_cache

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from pydantic import BaseModel

from .config import settings
from .recommender import Recommender, ScoredItem
from .repository import Repository

app = FastAPI(
    title="ScholarShelf Recommendation Service",
    version="1.0.0",
    description="Explainable TF-IDF and cosine-similarity recommendations",
)


class Recommendation(BaseModel):
    resource_id: str
    score: float
    explanation: str


class RecommendationResponse(BaseModel):
    recommendations: list[Recommendation]
    strategy: str


@lru_cache
def repository() -> Repository:
    return Repository()


@lru_cache
def recommender() -> Recommender:
    return Recommender(repository())


def internal_auth(x_internal_token: str = Header()) -> None:
    if not secrets.compare_digest(x_internal_token, settings.ml_internal_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal token")


def serialize(items: list[ScoredItem]) -> list[Recommendation]:
    return [Recommendation(**item.__dict__) for item in items]


@app.get("/health")
def health() -> dict[str, str]:
    repository().is_ready()
    return {"status": "ok", "service": "scholarshelf-recommendations"}


@app.get(
    "/recommendations/users/{user_id}",
    response_model=RecommendationResponse,
    dependencies=[Depends(internal_auth)],
)
def recommendations_for_user(
    user_id: str,
    limit: int = Query(default=8, ge=1, le=20),
) -> RecommendationResponse:
    items, strategy = recommender().for_user(user_id, limit)
    return RecommendationResponse(recommendations=serialize(items), strategy=strategy)


@app.get(
    "/recommendations/resources/{resource_id}/similar",
    response_model=RecommendationResponse,
    dependencies=[Depends(internal_auth)],
)
def similar_resources(
    resource_id: str,
    limit: int = Query(default=4, ge=1, le=12),
) -> RecommendationResponse:
    items = recommender().similar(resource_id, limit)
    if items is None:
        raise HTTPException(status_code=404, detail="Resource not found in the approved catalog")
    return RecommendationResponse(recommendations=serialize(items), strategy="item_similarity")


@app.post("/evaluation/run", dependencies=[Depends(internal_auth)])
def run_evaluation(k: int = Query(default=5, ge=1, le=20)) -> dict[str, object]:
    return recommender().evaluate(k)
