# API summary

Interactive OpenAPI documentation is available at `/api/docs` while the API is
running. All endpoints are prefixed `/api`.

| Area            | Endpoints                                                                                                      | Access                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Health          | `GET /health`                                                                                                  | Public                                      |
| Auth            | `POST /auth/register`, `/verify-email`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password` | Mixed                                       |
| Profile         | `GET/PATCH /users/me`                                                                                          | Authenticated                               |
| Users           | `GET /users`, `PATCH /users/:id/role`, `PATCH /users/:id/status`                                               | Admin                                       |
| Categories      | `GET /categories`                                                                                              | Public                                      |
| Categories      | `POST/PATCH/DELETE /categories[/:id]`                                                                          | Librarian, Admin                            |
| Catalog         | `GET /resources`                                                                                               | Public                                      |
| Resource        | `GET /resources/:id`, `POST /:id/access`, `POST /:id/saved`                                                    | Authenticated                               |
| Upload          | `POST /resources`, `PATCH /:id`, `POST /:id/version`, `GET /mine`                                              | Staff, Admin                                |
| Review          | `GET /resources/review-queue`, `POST /:id/approve`, `POST /:id/reject`                                         | Librarian, Admin (staff see own queue only) |
| Personalization | `GET /recommendations/for-me`, `GET /recommendations/similar/:id`                                              | Authenticated                               |
| Evaluation      | `POST /recommendations/evaluate`                                                                               | Admin                                       |
| Analytics       | `GET /analytics/me`                                                                                            | Authenticated                               |
| Analytics       | `GET /analytics/resources/:id`                                                                                 | Uploader, Librarian, Admin                  |
| Analytics       | `GET /analytics/overview`                                                                                      | Librarian, Admin                            |
| Audit           | `GET /audit-logs`                                                                                              | Admin                                       |

Catalog query parameters: `q`, `categoryId`, `resourceType`, `year`,
`department`, `sort` (`relevance`, `newest`, `popular`), `page`, and `limit`.

Uploads use `multipart/form-data` with field `file`. Other mutation bodies use
JSON. The access response contains a URL that expires after 300 seconds.
