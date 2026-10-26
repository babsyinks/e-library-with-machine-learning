# Run locally

## Recommended: Docker Compose

Prerequisites: Docker Engine/Desktop with Compose v2, at least 6 GB of memory
available to Docker, approximately 10 GB of free disk space for a first build,
an internet connection for the first image download, and host ports 3000, 4000,
8026, 9000 and 9001 available. You do not need host installations of Node.js,
Python, PostgreSQL, MinIO, ClamAV or MailHog.

```bash
docker compose --env-file .env.local -f docker-compose.local.yml up --build
```

The checked-in `.env.local` contains local demo settings so a newly cloned or
unzipped copy starts with that single command. It must not be reused for an
internet-accessible or production deployment. Use `.env.local.example` as the
template if you intentionally replace it.

The local Silo container uses its built-in readiness probe; its distroless image
does not include `curl`.

Open:

- Web application: <http://localhost:3000>
- API documentation: <http://localhost:4000/api/docs>
- API health: <http://localhost:4000/api/health>
- MinIO console: <http://localhost:9001>
- MailHog inbox: <http://localhost:8026>

The one-shot `migrate` service applies database migrations and seeds categories,
three catalog records and these accounts:

| Role    | Email                 | Password          |
| ------- | --------------------- | ----------------- |
| Admin   | `admin@futminna.edu.ng`   | `AdminPass123!`   |
| Student | `student@futminna.edu.ng` | `StudentPass123!` |

Change the domain (if you want to use a different domain) and credentials before any shared demonstration.
Create staff and librarian users through registration, then assign their roles
from **User management** as the admin.

### Email during local development

The local API sends verification and password-reset emails to MailHog over
SMTP. Open the MailHog inbox at <http://localhost:8026> to view messages; the
SMTP service is available to containers at `mailhog:1025`. Messages are
captured locally and are not delivered to real recipients.

If you disable MailHog or remove its SMTP configuration, verification and
password-reset links are written to API container logs when
`MAIL_LOG_LINKS=true`:

```bash
docker compose --env-file .env.local -f docker-compose.local.yml logs api
```

### Stop and restart

```bash
docker compose --env-file .env.local -f docker-compose.local.yml down
docker compose --env-file .env.local -f docker-compose.local.yml up
```

After the initial build, later starts do not require `--build` unless source or
dependency files changed.

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
