# System architecture

ScholarShelf is deliberately scoped to one institution. There is no tenant ID,
cross-institution catalog, federation protocol, or data-sharing path.

```text
Browser
   │ HTTPS in production
   ▼
Caddy ───────────────► Next.js web (port 3000)
   │ /api/*
   ▼
NestJS API (port 4000) ─────► PostgreSQL
   │       │                      catalog, identities,
   │       │ signed URLs          interactions, audit
   │       ▼
   │     MinIO ◄──── ClamAV scans every uploaded buffer
   │
   │ x-internal-token
   ▼
FastAPI recommendation service ──read-only model queries──► PostgreSQL
```

## Responsibilities

| Component  | Owns                                                                            | Does not own                   |
| ---------- | ------------------------------------------------------------------------------- | ------------------------------ |
| Next.js    | Pages, forms, responsive role-aware UI                                          | Authorization decisions        |
| NestJS     | Authentication, RBAC, workflow rules, search, signed access, logging, analytics | ML vectorization               |
| FastAPI    | TF-IDF model, cosine ranking, cold start, offline evaluation                    | Public auth, resource mutation |
| PostgreSQL | Durable application and interaction data                                        | Resource file bytes            |
| MinIO      | Private versioned objects                                                       | Access policy decisions        |
| ClamAV     | Malware verdict for upload buffers                                              | MIME/extension validation      |

## Important flows

### Upload and approval

1. Staff sends metadata and a PDF, DOCX, or EPUB.
2. The API validates DTO fields, size, extension, MIME declaration and magic bytes.
3. ClamAV scans the in-memory buffer before storage.
4. MinIO receives an opaque object key; PostgreSQL stores its checksum and metadata.
5. The resource remains `PENDING` until a Librarian or Admin approves it.
6. Approvals, rejections, versions and archival are audit events.

Replacing a file creates a `ResourceVersion` and sends the resource through
approval again. Old object versions remain available for controlled retention;
only the current approved version can receive an access URL.

### Authenticated access

1. The browser sends a short-lived access JWT.
2. The API validates the signature, expiry, user status and route role.
3. Opening details writes a `VIEW`; requesting a full download writes a
   `DOWNLOAD` and increments its aggregate counter.
4. The API creates a five-minute S3-compatible signed URL. MinIO objects are
   never public static files.

### Personalization

1. Approved resource title, abstract, tags and category form a text document.
2. The ML service builds an English TF-IDF sparse matrix, cached for five minutes.
3. A user profile is the weighted mean of their interacted resource vectors.
   Downloads weigh 2× views; older events decay with a 90-day half-life.
4. Cosine similarity ranks unseen resources. The API hydrates returned IDs from
   its own catalog and supplies a short explanation to the UI.
5. No-history users receive department-aware popularity results.

## Data boundaries and privacy

Individual activity is used by the user recommendation endpoint and private
`analytics/me` endpoint. Staff can see aggregate engagement for their uploads.
Librarians see aggregate catalog trends. Only system administrators have the
authority implied by the audit and account-management screens.

See the Prisma schema at `apps/api/prisma/schema.prisma` for the full ER model.
