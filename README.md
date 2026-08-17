# ScholarShelf

ScholarShelf is a secure, single-institution digital library with explainable,
content-based recommendations and privacy-conscious learning analytics.

The repository contains:

- `apps/web` — responsive Next.js user interface
- `apps/api` — NestJS API, authentication, catalog, workflows and analytics
- `services/recommendations` — FastAPI TF-IDF/cosine-similarity service
- PostgreSQL, MinIO and ClamAV services for local development
- Docker Compose definitions for local and production-like deployment

## Quick start

1. Install Docker Desktop (or Docker Engine with Compose).
2. Copy `.env.local.example` to `.env.local`.
3. Run `docker compose --env-file .env.local -f docker-compose.local.yml up --build`.
4. Open [http://localhost:3000](http://localhost:3000).

The database is migrated and seeded automatically. Demo accounts and a fuller
walkthrough are in [`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md).

## Documentation

- [System architecture](docs/ARCHITECTURE.md)
- [Local setup](docs/LOCAL_SETUP.md)
- [Server deployment](docs/DEPLOYMENT.md)
- [Security model](docs/SECURITY.md)
- [ML method and evaluation](docs/ML_AND_EVALUATION.md)
- [Defense guide](docs/DEFENSE_GUIDE.md)
- [API endpoints](docs/API.md)

## Development without Docker

The JavaScript workspace uses pnpm and Node.js 22. The ML service uses Python
3.12. After starting PostgreSQL, MinIO and ClamAV, run:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

In another terminal:

```bash
cd services/recommendations
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## License

MIT. See [LICENSE](LICENSE).
