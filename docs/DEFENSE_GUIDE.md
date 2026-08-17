# Thesis defense guide

## Five-minute demonstration

1. Sign in as Staff and upload a small PDF with metadata. Point out that it is
   absent from the public catalog while pending.
2. Sign in as Librarian, reject it once with a reason, then upload/adjust and
   approve it. Search for a phrase from its abstract.
3. Sign in as Student, open and download several related resources. Show the
   signed URL expiry and the private activity summary.
4. Return to the dashboard to show “Recommended for you,” then open a detail page
   to show “More like this” and the plain-language explanation.
5. Show aggregate analytics, a no-result search term and the admin audit trail.
6. Run evaluation after the demo dataset contains sufficient interactions and
   compare the model to the popularity baseline.

## Architecture explanation

“Next.js renders the responsive interface. NestJS is the security and business
boundary: it owns identities, approval, access and event logging. PostgreSQL is
the durable system of record, while private resource files live in MinIO. The
separate Python service reads approved metadata and interactions to calculate
TF-IDF/cosine recommendations. Caddy provides HTTPS and reverse proxying. This
separation lets the ML algorithm change without weakening the core library.”

## Questions likely to arise

**Why not deep learning?** The catalog and interaction volume is small, TF-IDF
works without large labelled data, is computationally tractable, and every score
can be explained through shared terms. This matches the research constraints.

**Why a separate service?** Python has the mature scikit-learn implementation;
isolating it keeps ML dependencies out of the security-sensitive TypeScript API
and creates a replaceable internal boundary.

**How is this machine learning?** TF-IDF learns vocabulary importance from the
whole catalog rather than using hand-written topic rules. The system then uses a
learned vector representation to rank unseen items by cosine similarity.

**How do you handle a new user?** Department-aware popularity. After their first
interactions, the weighted profile takes over. “More like this” never needs history.

**How do you prove recommendation quality?** Chronological per-user holdout,
precision@5 and recall@5, compared with the same-size popularity baseline.

**Why chronological rather than random split?** It trains on the past and tests
on future behavior, which better represents deployment and avoids leaking later
events into a user's profile.

**How is privacy protected?** Personal events feed only that learner's private
view and model. Staff see aggregate counts for their uploads; librarians see
aggregate institution trends. Object files are private and accessed through
short-lived signed URLs.

**What does the system not establish?** A click does not prove learning, cosine
similarity does not understand all semantic relationships, and offline metrics
do not replace a user study. These are stated limitations, not hidden claims.

## Honest future work

- Controlled user study measuring perceived relevance and task completion.
- Hybrid collaborative/content ranking after sufficient real interaction volume.
- Synonym-aware embeddings with an explainability layer, compared against this baseline.
- Institutional SSO, retention automation and accessibility audit.
- Course/semester context and deliberate diversity constraints to reduce filter bubbles.
