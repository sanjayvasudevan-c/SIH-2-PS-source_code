# 12 — ADR proposals (status: PROPOSED, awaiting approval)

Each ADR uses this format:
- **Context**
- **Decision**
- **Alternatives**
- **Consequences**

Existing ADRs in `docs/` are not modified. These would be added as new files once approved.

## ADR-101 — Postgres job queue and transactional outbox; Redis deferred
- **Context:** commits take 49 s for 5k rows, and side effects live in in-memory hooks. The measured load is about 9 rows/s on average (v3 §7).
- **Decision:** a `jobs` table claimed with `FOR UPDATE SKIP LOCKED` and an `outbox` table written in the business transaction. One worker process publishes events (SSE via `LISTEN/NOTIFY`, webhooks, notifications).
- **Alternatives:** Redis + RQ/Celery (an extra stateful service); Kafka (oversized).
- **Consequences:** one fewer moving part. Throughput is ample to thousands of jobs/min. Revisit if queue age p95 exceeds 60 s.

## ADR-102 — Audit in the business transaction with signed checkpoints
- **Context:** the separate-transaction append can lose events, and truncation is undetectable.
- **Decision:** insert audit rows in the same transaction. A single chainer assigns `seq` and hashes in order. Hourly Ed25519-signed anchors are stored in the DB and in object-locked storage.
- **Alternatives:** a Merkle tree / transparency log (deferred); a blockchain (rejected).
- **Consequences:** the chain lags commits by seconds; verification gains truncation detection.

## ADR-103 — Alembic migrations
- **Decision:** a baseline migration equal to the current `create_all`; a CI test diffs the schemas. `create_all` is kept only for SQLite tests.
- **Consequences:** every schema change is reviewed and reversible.

## ADR-104 — Programme-year row lock for capacity
- **Decision:** `SELECT … FOR UPDATE` on the affected `programme_years` rows, in id order, inside `commit_values`.
- **Alternatives:** SERIALIZABLE isolation (retry storms); a counter table (drift risk).
- **Consequences:** serialisation applies per programme, not globally.

## ADR-105 — Opaque share codes
- **Decision:** a 128-bit random code, stored hashed, with claims, TTL and revocation; QR links to the fragment `/#/v/{code}`.
- **Consequences:** shares can be revoked; nothing sensitive goes in URLs or logs.

## ADR-106 — Two-stage identity resolution
- **Decision:** online DOB-blocked scoring with a block cap, plus nightly Splink (DuckDB) batch scoring, gated by a golden-set P/R test.
- **Consequences:** an explainable model; new dependencies need approval.

## ADR-107 — Claims register enforced in CI
- **Decision:** `FEATURE_STATUS.yaml` is the only place that states feature status; documents link to it; CI verifies the routes and tests behind each claim.

## ADR-108 — Hosting
- **Decision:** Vercel + Neon for the synthetic demo only. Any real data goes to an India-region, MeitY-empanelled host chosen by AICTE.

## ADR-109 — Tenant isolation in layers
- **Decision:** a central `scoped()` query helper and generated cross-tenant tests now; PostgreSQL RLS at pilot.

## ADR-110 — Session tokens
- **Decision:** a 15-minute access token in memory, a 7-day httpOnly SameSite=Strict refresh cookie, and `users.token_version` checked on every request; TOTP for AICTE roles.
