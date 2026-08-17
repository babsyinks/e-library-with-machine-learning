# Security model

## Controls implemented

- Institutional-domain registration and mandatory email verification.
- Bcrypt cost 12 for passwords; password values are never returned or logged.
- Fifteen-minute access JWTs and rotated refresh JWTs in Secure, HttpOnly,
  SameSite cookies. Refresh reuse invalidates the stored session.
- One-use, hashed, expiring verification and password-reset tokens.
- Account suspension/deactivation checked on every authenticated request.
- Deny-by-default authentication plus explicit NestJS role guards.
- DTO allowlisting, rejection of unknown fields and HTML stripping for catalog text.
- Parameterized Prisma queries, including ranked PostgreSQL full-text SQL.
- Auth-specific and general API rate limits.
- Helmet response headers, strict CORS and Caddy TLS/HSTS in production.
- File size, extension, MIME and magic-byte checks; ClamAV before object storage.
- Private object bucket and five-minute signed URLs.
- Audit events for privileged catalog, category and account actions.
- Aggregate librarian analytics; no named student activity screen.
- Constant-time internal-token comparison on the ML service.
- Startup rejection for missing configuration and weak production secrets.

## OWASP mapping

| Risk                      | Primary mitigation                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Broken access control     | Global JWT/RBAC guards, ownership checks, private objects                              |
| Cryptographic failures    | TLS, bcrypt, hashed one-time/refresh tokens, independent secrets                       |
| Injection                 | Validation, sanitization, ORM and parameterized raw SQL                                |
| Insecure design           | Approval state machine, role separation, privacy boundaries                            |
| Security misconfiguration | Environment validation, private Docker network, secure headers                         |
| Vulnerable components     | Lockfiles, CI, Dependabot                                                              |
| Authentication failures   | Verification, rotation, expiry, rate limits, account status checks                     |
| Data integrity failures   | SHA-256 file checksums, version history, audit trail                                   |
| Logging failures          | Structured privileged-action audit data, health endpoints                              |
| SSRF                      | Fixed internal ML endpoint and configured storage endpoint; no user-supplied fetch URL |

## Operational checklist

- Replace every example credential and keep `.env.production` mode `0600`.
- Use a dedicated SMTP account and least-privilege deployment key.
- Restrict MinIO console access to a VPN or SSH tunnel.
- Review audit logs, dependency alerts and unsuccessful search terms routinely.
- Back up and restore-test PostgreSQL and MinIO together.
- Run a dependency and container scan before the final public deployment.
- Document institutional retention rules for interaction logs and archived files.

The system is a strong thesis prototype, not a substitute for a formal
penetration test or the institution's legal/privacy review.
