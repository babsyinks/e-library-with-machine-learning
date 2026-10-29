from app.recommender import Recommender
from app.repository import CatalogItem


class CatalogRepository:
    def __init__(self, items: list[CatalogItem]) -> None:
        self.items = items

    def catalog(self) -> list[CatalogItem]:
        return self.items


def item(
    resource_id: str,
    title: str,
    abstract: str,
    tags: list[str],
    *,
    author: str | None = None,
    category: str = "General studies",
    department: str | None = None,
    resource_type: str = "EBOOK",
) -> CatalogItem:
    return CatalogItem(
        resource_id=resource_id,
        title=title,
        author=author or resource_id,
        abstract=abstract,
        tags=tags,
        category=category,
        department=department,
        resource_type=resource_type,
        popularity=0,
    )


def test_similar_returns_resources_with_shared_topics() -> None:
    recommender = Recommender(
        CatalogRepository(
            [
                item(
                    "source",
                    "Practical Machine Learning",
                    "Models for classification and prediction.",
                    ["machine learning", "artificial intelligence"],
                ),
                item(
                    "related",
                    "Applied Learning Models",
                    "Classification and prediction using data.",
                    ["machine learning", "neural networks"],
                ),
            ]
        )
    )

    recommendations = recommender.similar("source", 4)

    assert recommendations is not None
    assert [result.resource_id for result in recommendations] == ["related"]


def test_similar_omits_generic_abstract_overlap_without_topic_overlap() -> None:
    generic_abstract = (
        "A comprehensive introduction to methods, data, analysis and modern "
        "systems for academic research."
    )
    recommender = Recommender(
        CatalogRepository(
            [
                item(
                    "source",
                    "Practical Machine Learning",
                    generic_abstract,
                    ["machine learning", "artificial intelligence"],
                ),
                item(
                    "unrelated",
                    "Library Metadata Standards",
                    generic_abstract,
                    ["cataloguing", "metadata"],
                ),
            ]
        )
    )

    recommendations = recommender.similar("source", 4)

    assert recommendations == []


def test_similar_finds_java_books_with_a_shared_title_topic() -> None:
    recommender = Recommender(
        CatalogRepository(
            [
                item(
                    "source",
                    "Java For Programmers; The Definitive Edition",
                    "A comprehensive reference for language syntax and development.",
                    ["programming languages", "object-oriented programming"],
                    author="A. Source",
                    category="Computer Science",
                ),
                item(
                    "related",
                    "Java For Dummies, 6th Edition",
                    "A beginner-friendly guide to building Java applications.",
                    ["java programming", "software development"],
                    author="A. Different Author",
                    category="Computer Science",
                ),
                item(
                    "unrelated",
                    "Introduction to Marine Biology",
                    "A comprehensive reference for language syntax and development.",
                    ["marine ecosystems"],
                    author="A. Different Author",
                    category="Biology",
                ),
            ]
        )
    )

    recommendations = recommender.similar("source", 4)

    assert recommendations is not None
    assert [result.resource_id for result in recommendations] == ["related"]
    assert "topic overlap" in recommendations[0].explanation
    assert "category" in recommendations[0].explanation


def test_similar_can_use_author_and_category_as_additional_signals() -> None:
    recommender = Recommender(
        CatalogRepository(
            [
                item(
                    "source",
                    "Computer Programming with Java",
                    "Language fundamentals and software development.",
                    ["java", "programming"],
                    author="Jamie Lee",
                    category="Computer Science",
                ),
                item(
                    "related",
                    "Software Design Patterns",
                    "Reusable approaches to software architecture.",
                    ["object-oriented design"],
                    author="Jamie Lee",
                    category="Software Engineering",
                ),
            ]
        )
    )

    recommendations = recommender.similar("source", 4)

    assert recommendations is not None
    assert [result.resource_id for result in recommendations] == ["related"]
    assert "author" in recommendations[0].explanation


def test_category_match_alone_does_not_recommend_unrelated_material() -> None:
    recommender = Recommender(
        CatalogRepository(
            [
                item(
                    "source",
                    "Computer Programming with Java",
                    "Language fundamentals and software development.",
                    ["java", "programming"],
                    author="A. Source",
                    category="Computer Science",
                ),
                item(
                    "unrelated",
                    "Computer Science Department Annual Report",
                    "Budget and staffing overview.",
                    ["administration"],
                    author="A. Different Author",
                    category="Computer Science",
                ),
            ]
        )
    )

    recommendations = recommender.similar("source", 4)

    assert recommendations == []
