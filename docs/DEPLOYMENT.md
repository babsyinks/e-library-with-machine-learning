# Deploy to a VPS

The production Compose file is appropriate for a single Linux VPS. Caddy
terminates TLS automatically; PostgreSQL, ClamAV and the ML service remain on an
internal Docker network.

## 1. Prepare DNS and host

Point both records to the VPS:

- `library.example.edu`
- `storage.library.example.edu`

Install Git and Docker Engine with the Compose plugin. Open inbound TCP 80/443
and UDP 443. Do not expose PostgreSQL, MinIO, ClamAV or the ML port.

## 2. Configure

```bash
git clone YOUR_REPOSITORY_URL /opt/scholarshelf
cd /opt/scholarshelf
cp .env.production.example .env.production
chmod 600 .env.production
```

Edit every `REPLACE_...` value. Generate independent secrets, for example with
`openssl rand -base64 48`. Set `DOMAIN`, both public URLs, SMTP values and the
real institutional email domain. Keep `S3_PUBLIC_ENDPOINT` on the storage
subdomain so the host used to sign a URL is the host the browser reaches.

`SEED_DEMO_DATA=false` creates only the initial administrator and base
categories. Its password must be changed before first use. A future password
change screen can call the existing secure reset flow.

## 3. Start

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up --build -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs -f caddy api
```

The migration container must complete successfully before the API starts.
Caddy obtains certificates after both DNS records resolve and ports are open.

## 4. Backups

Back up both durable stores:

- PostgreSQL: scheduled `pg_dump` with encrypted off-server retention.
- MinIO: bucket replication or an encrypted filesystem/volume snapshot.

Test restoration each semester. A database-only backup is incomplete because
resource version rows refer to MinIO objects.

## GitHub deployment workflow

`.github/workflows/deploy.yml` deploys `main` after the protected `production`
environment permits it. Configure repository/environment secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY` (a deployment-only private key)
- `DEPLOY_PATH` (for example `/opt/scholarshelf`)

Keep `.env.production` only on the server. The workflow never copies secrets
into an image or repository. Protect `main`, require CI, and require manual
approval for the GitHub `production` environment.

## Render alternative

The web, API and recommendation Dockerfiles can be three Render services with a
managed PostgreSQL database and external S3-compatible object store. ClamAV
still needs a private service. Replace internal hostnames and use Render secret
environment variables; do not use the local Compose MinIO volume on an ephemeral
instance.
