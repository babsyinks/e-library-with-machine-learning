from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import create_engine, text

from .config import settings


@dataclass(frozen=True)
class CatalogItem:
    resource_id: str
    title: str
    abstract: str
    tags: list[str]
    category: str
    department: str | None
    popularity: int

    @property
    def document(self) -> str:
        # Repeating the title once gives a transparent, modest weight to the strongest signal.
        return " ".join([self.title, self.title, self.abstract, *self.tags, self.category])


@dataclass(frozen=True)
class Interaction:
    user_id: str
    resource_id: str
    event_type: str
    created_at: datetime


class Repository:
    def __init__(self) -> None:
        database_url = settings.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        self.engine = create_engine(database_url, pool_pre_ping=True, pool_size=5)

    def catalog(self) -> list[CatalogItem]:
        query = text(
            '''
            SELECT r.id::text AS resource_id, r.title, r.abstract, r.tags,
                   c.name AS category, r.department,
                   (r."viewCount" + r."downloadCount" * 2) AS popularity
            FROM "Resource" r
            JOIN "Category" c ON c.id = r."categoryId"
            WHERE r.status = 'APPROVED'
            ORDER BY r.id
            '''
        )
        with self.engine.connect() as connection:
            return [CatalogItem(**dict(row)) for row in connection.execute(query).mappings()]

    def interactions_for_user(self, user_id: str) -> list[Interaction]:
        query = text(
            '''
            SELECT "userId"::text AS user_id, "resourceId"::text AS resource_id,
                   "eventType"::text AS event_type, "createdAt" AS created_at
            FROM "InteractionLog"
            WHERE "userId" = CAST(:user_id AS uuid)
            ORDER BY "createdAt" ASC
            '''
        )
        with self.engine.connect() as connection:
            return [Interaction(**dict(row)) for row in connection.execute(query, {"user_id": user_id}).mappings()]

    def all_interactions(self) -> list[Interaction]:
        query = text(
            '''
            SELECT "userId"::text AS user_id, "resourceId"::text AS resource_id,
                   "eventType"::text AS event_type, "createdAt" AS created_at
            FROM "InteractionLog"
            ORDER BY "userId", "createdAt" ASC
            '''
        )
        with self.engine.connect() as connection:
            return [Interaction(**dict(row)) for row in connection.execute(query).mappings()]

    def user_department(self, user_id: str) -> str | None:
        with self.engine.connect() as connection:
            return connection.execute(
                text('SELECT department FROM "User" WHERE id = CAST(:id AS uuid)'), {"id": user_id}
            ).scalar_one_or_none()

    def is_ready(self) -> bool:
        with self.engine.connect() as connection:
            return connection.execute(text("SELECT 1")).scalar_one() == 1


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
