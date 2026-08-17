# Run locally

## Recommended: Docker Compose

Prerequisites: Docker Engine/Desktop with Compose v2 and at least 6 GB of free
memory (ClamAV signature loading is the heaviest service).

```bash
cp .env.local.example .env.local
docker compose --env-file .env.local -f docker-compose.local.yml up --build
```

Open:

- Web application: <http://localhost:3000>
- API documentation: <http://localhost:4000/api/docs>
- API health: <http://localhost:4000/api/health>
- MinIO console: <http://localhost:9001>

The one-shot `migrate` service applies database migrations and seeds categories,
three catalog records and these accounts:

| Role    | Email                 | Password          |
| ------- | --------------------- | ----------------- |
| Admin   | `admin@example.edu`   | `AdminPass123!`   |
| Student | `student@example.edu` | `StudentPass123!` |

Change the example domain and credentials before any shared demonstration.
Create staff and librarian users through registration, then assign their roles
from **User management** as the admin.

### Email during local development

SMTP is optional locally. Verification and password-reset links are written to
API container logs when `MAIL_LOG_LINKS=true`:

```bash
docker compose --env-file .env.local -f docker-compose.local.yml logs api
```

### Stop and restart

```bash
docker compose --env-file .env.local -f docker-compose.local.yml down
docker compose --env-file .env.local -f docker-compose.local.yml up
```

Named volumes preserve the database, objects and antivirus definitions. To
avoid accidental data loss, this guide does not include a volume-deletion
command.

## Native development

Install Node.js 22, pnpm 10, Python 3.12, PostgreSQL 17, MinIO and ClamAV. Copy
`.env.local.example` to `.env` and replace Docker hostnames (`postgres`, `minio`,
`clamav`, `recommendations`) with `localhost`.

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Then run the ML service:

```bash
cd services/recommendations
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Focused verification

```bash
pnpm lint
pnpm test
pnpm build
python -m pytest services/recommendations/tests -q
```
