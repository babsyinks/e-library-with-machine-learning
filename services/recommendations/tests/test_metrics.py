from app.recommender import aggregate_scores, precision_recall_at_k


def test_precision_and_recall_at_k() -> None:
    precision, recall = precision_recall_at_k({"a", "b", "c"}, {"b", "x"}, 3)
    assert precision == 1 / 3
    assert recall == 1 / 2


def test_empty_aggregate_is_explicit() -> None:
    assert aggregate_scores([]) == {"precision_at_k": 0.0, "recall_at_k": 0.0}


def test_aggregate_scores() -> None:
    assert aggregate_scores([(0.2, 0.5), (0.4, 1.0)]) == {
        "precision_at_k": 0.3,
        "recall_at_k": 0.75,
    }
