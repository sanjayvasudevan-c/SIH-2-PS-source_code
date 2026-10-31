# 04 — Architecture decision review (challenge, alternatives, verdict)

Each decision is tested against four things: the **actual workload** (v3 §7 capacity model: about 9 rows/s average, about 100 rows/s burst, 15 M active enrolments), the **team** (small), the **regulatory context** (a regulator needs evidence), and **what the code already proves**. A technology is recommended only when a specific requirement needs it.

Verdict scale: **KEEP**, **KEEP WITH MODIFICATIONS**, **REPLACE**, **DEFER**, **REMOVE**.

## 1. Summary table

| # | v3 decision | Verdict | One-line reason |
|---|---|---|---|
| 1 | Modular monolith + workers | **KEEP WITH MODIFICATIONS** | Correct for the load and consistency needs; add enforced boundaries and a real worker pool, which does not exist today |
| 2 | PostgreSQL sole system of record (+ RLS, partitioning) | **KEEP WITH MODIFICATIONS** | Correct; RLS at pilot; **defer partitioning** until a year exceeds ~50 M rows |
| 3 | Redis for queue, rate limits, SSE fan-out | **REPLACE (for pilot) / DEFER Redis** | Postgres can do all three at this scale (`SKIP LOCKED` queue, `LISTEN/NOTIFY`, rate-limit table), with one less stateful service to secure |
| 4 | Transactional outbox | **KEEP** (implement) | It is the right fix for today's real defect (non-durable post-commit hooks) |
| 5 | Versioned seat-cap and validation rules | **KEEP WITH MODIFICATIONS** | Necessary (handbook editions conflict); simplify the v3 data model (one table plus effective dates) and skip "most-specific wins" until needed |
| 6 | Indian-name-aware identity resolution | **KEEP WITH MODIFICATIONS** | Strong differentiator; add golden-set evaluation, Splink-style EM weights later, generic-token damping, second-pass blocking |
| 7 | SD-JWT-style credentials + Ed25519 | **KEEP WITH MODIFICATIONS** | Now standards-track (RFC 9901, Nov 2025); align with SD-JWT VC draft (`vct`, `typ dc+sd-jwt`); add share codes; DigiLocker issuance should be the primary channel once onboarded |
| 8 | Hash-chained audit + signed off-DB anchors | **KEEP WITH MODIFICATIONS** | Keep the linear chain (simple and adequate); fix atomicity; anchor the head via a signed checkpoint to WORM storage; a Merkle/transparency log is **deferred** |
| 9 | Advisory seat checks, never blocking | **KEEP** | Policy-correct; record advice-vs-outcome to show the prevention effect |
| 10 | Integration hub + adapters | **KEEP WITH MODIFICATIONS** | Ports and adapters yes; a schema registry and per-adapter versioning is premature, so build it as a module, not a platform |
| 11 | Staged migration and rollback | **KEEP** | Correct for a national register; implement as data tooling (batches, reconciliation) |
| 12 | Privacy-preserving cross-institution conflict detection | **KEEP WITH MODIFICATIONS** | Redacted views work. True PPRL (Bloom filters) is **not needed** while matching runs centrally; the threat is insiders, so tighten access and pseudonymise logs instead |
| 13 | App-level encryption of APAAR + HMAC blind index | **KEEP WITH MODIFICATIONS** | Do it, but scope it honestly: it protects backups and DB dumps, not a compromised app |
| 14 | Containers on government cloud | **KEEP**; current **Vercel serverless = demo-only** | Real data must stay on MeitY-empanelled infrastructure in India; serverless also breaks SSE, rate limits and long commits |
| 15 | Rules + transparent statistics before ML | **KEEP** | There are no labels yet; reviewer outcomes become labels later |

## 2. Detailed analysis

### 2.1 Modular monolith vs microservices vs serverless

| Option | How it works | Solves | Disadvantages | Complexity / cost / ops | Security | Scale | Fit |
|---|---|---|---|---|---|---|---|
| **Modular monolith + worker pool (v3)** | One codebase. HTTP replicas plus a worker process share modules and the DB. | One ACID transaction across record, flag, ledger and audit | Boundaries erode without enforcement | Low / low / low | One authZ layer | Replicas plus read replica; easily 100 rows/s | **Best fit** |
| Microservices + event bus | Service per domain, Kafka/NATS | Independent scaling and deploys | Sagas for record+flag+audit; cross-service audit chain; distributed tracing mandatory | High / high / high | Service-to-service authN everywhere | Unneeded: the bottleneck is correctness, not throughput (v3 §7) | **Reject** |
| Serverless functions (current Vercel deploy) | Per-request functions | Zero ops for a demo | No long-lived SSE; per-instance memory (rate limits, locks); 60 s cap breaks a 5,000-row commit (measured 49 s locally) | Low / low / low | Data residency unclear (default region `iad1`, US) | Fine for reads | **Demo only** |
| DDD bounded contexts inside the monolith | Same deployable, explicit context interfaces | Keeps extraction possible | Discipline cost | Low | — | — | **Adopt as a practice** (import-lint with `import-linter`, module-owned tables) |
| CQRS (separate read models) | Read models refreshed from writes | Dashboard load at scale | Staleness; extra code | Medium | — | Good | **Partial:** only for national dashboards, via materialised views (§2.2) |
| Workflow orchestration (Temporal, Airflow) | Durable workflows | Long migrations, retries | A new platform to run | High | — | — | **Defer**; a Postgres job table suffices |

**Verdict: KEEP WITH MODIFICATIONS.** Add:
1. A worker entry point (`python -m app.worker`) with a Postgres job table (`SELECT … FOR UPDATE SKIP LOCKED`).
2. Import-lint contracts in CI.
3. Imports above about 500 rows committed as background jobs with progress polling.

### 2.2 PostgreSQL, partitioning, replicas, materialised views, event sourcing

- **Keep PostgreSQL.** The suite already passes on PG16, and advisory locks, RLS, partial indexes and `SKIP LOCKED` are all needed.
- **Partitioning by admission year: DEFER.** 15 M enrolments with the existing index on `(programme_id, academic_year, status)` is comfortable on one primary. Partitioning makes unique constraints include the partition key, so `UNIQUE(institution_id, institution_student_id)` would break across years. Revisit when one table exceeds ~50 M rows or retention requires dropping whole years.
- **Read replica: pilot+.** Send the analytics module to it; dashboards measured 0.22 s on the seed, but national aggregates will grow.
- **Materialised views: ADOPT (P2).** `mv_programme_position(programme_id, year, category, occupied)` refreshed after commits, either concurrently via the outbox or every 5 minutes, serves national dashboards. The authoritative seat-check keeps computing live counts.
- **Seat-ledger counter table (v3) vs computed counts (code): KEEP COMPUTED.** A counter table adds a hot row per programme-year-category, drift, and a nightly reconciliation job, to save an indexed `COUNT` over at most ~2,000 rows per programme. Introduce counters only if measured p95 seat-check latency exceeds 200 ms. This **reverses v3** with evidence (doc 03 §4: dashboards 0.22 s).
- **Event sourcing: REJECT.** Revisions and the audit chain already give history; event sourcing would add replay and versioning complexity with no regulatory gain.
- **Warehouse/BI: DEFER** to a governed export (P2/P3) with small-cell suppression.

### 2.3 Redis (queue, rate limits, SSE fan-out)

| Need | Redis approach | Postgres-only alternative | Recommendation |
|---|---|---|---|
| Job queue | RQ, Celery | `jobs` table + `FOR UPDATE SKIP LOCKED`, the same pattern as the outbox relay | **Postgres**: transactional enqueue with the business change, which Redis cannot offer |
| Rate limits | INCR with TTL | `rate_limits(key, window_start, count)` UPSERT; or at the gateway/WAF | **Gateway/WAF first, Postgres table second**: one less service |
| SSE fan-out across replicas | Pub/Sub | `LISTEN/NOTIFY` (payload ≤ 8 KB, which suits id-only events) | **Postgres NOTIFY** for pilot; Redis only if more than ~2,000 concurrent streams |
| Cache | — | Not needed (dashboards 0.22 s) | — |

**Verdict: REPLACE Redis with Postgres primitives for pilot; DEFER Redis** until a measured need appears. That removes a whole stateful service (HA, auth, TLS, backups) from the threat model and runbook.

### 2.4 Transactional outbox

The current defect: side effects run from an in-memory list after commit (`db.after_commit`), so a crash between commit and hook loses SSE events and **audit entries**.

| Option | Verdict |
|---|---|
| Outbox table written in the same transaction; relay with `SKIP LOCKED`; idempotent consumers keyed by event ID | **KEEP / implement** (P1) |
| CDC (Debezium on WAL) | Overkill for pilot; adds Kafka Connect |
| Dual write | Is today's defect |

Note that the audit should **not** go through the outbox: it must be written **in the business transaction** (v3 I9), under `pg_advisory_xact_lock`, which the code already acquires in its separate session.

### 2.5 Versioned rules

Necessary: the research confirms conflicting public figures (15% vs 10% vs a reported 25% for PG). See doc 05 R7. v3's model has rule_sets, entries, a scope specificity order, basis points, rounding, a pool split, overrides, impact preview and four-eyes. That is correct but large.

**Simplification proposed:**
1. One `capacity_rule_sets` table with an `effective_from/to` year range, `status`, `verification_status`, `source_ref`, and a JSON `entries` array validated by a Pydantic schema.
2. Quotas store `rule_set_id` and a `calc` snapshot.
3. Impact preview = recompute positions with the candidate set (re-using `ledger.position_from_counts`, which is pure).
4. Four-eyes = `approved_by != created_by`.

This delivers v3's guarantees with about a third of the schema. The Codex branch's `capacity_rules.py` (doc 02 §H) is a starting point.

### 2.6 Identity resolution

| Option | How | Better? | Fit |
|---|---|---|---|
| Current: hand-weighted Fellegi–Sunter-style scoring, DOB blocking | Deterministic weights | Explainable today | Keep as v1 |
| **Splink** (UK MoJ, Fellegi–Sunter with EM-estimated m/u weights, DuckDB/Spark back-ends; ~15 M records under an hour) | Learns weights from unlabelled data; scales | Yes, once the data is real; weights are data-driven yet still explainable per comparison | **Adopt for batch national dedup at pilot**; keep online scoring for row-time findings |
| Supervised ML (gradient-boosted pairs) | Needs labels | Only after reviewer decisions accumulate (v3 ADR 8) | Defer |
| Embedding / LLM name matching | Semantic similarity | Opaque, costly, hard to justify to a regulator | Reject for decisions; possible for *transliteration suggestions* only |
| Privacy-preserving record linkage (Bloom filters) | Matching on encodings | Needed only when parties cannot share plaintext; here matching is central | Reject; research also shows unhardened Bloom filters leak (doc 05 R9) |

**Must-fix before claiming quality:**
1. Unicode name keys.
2. Honorific stripping.
3. Generic-token damping.
4. Second-pass blocking.
5. A golden set of at least 60 pairs, with precision and recall reported in CI.

### 2.7 Credentials

- **SD-JWT is now RFC 9901** (Proposed Standard, Nov 2025). The token format already matches: issuer JWT + `~` disclosures + trailing `~`.
- **SD-JWT VC** is still an Internet-Draft (draft-ietf-oauth-sd-jwt-vc-18, Aug 2026, in IESG evaluation). Adopting its `vct` claim and `typ: dc+sd-jwt` costs little and improves wallet interoperability. The EU EUDI ARF and Japan's ARF-interoperable academic-credential pilot use SD-JWT VC (doc 05).
- **W3C VC 2.0** (Recommendation, May 2025) wrapping is fine but optional. Keep the VC-shaped payload; do not chase JSON-LD proofs.
- **Revocation:** an online status endpoint is fine for pilot. Bitstring Status List (W3C) for offline/privacy-preserving checks is **P3**.
- **Holder binding (KB-JWT): P3.** Bearer presentation plus short-lived share codes is the honest interim.
- **DigiLocker / NAD:** for Indian employers the dominant verification channel is DigiLocker issued documents. Pushing a PDF or URI to DigiLocker (issuer onboarding, Push API) should be the **primary** student channel once AICTE onboards as issuer (EXT, P9). SD-JWT remains for selective disclosure and offline checks.
- **Blockchain: REJECT** (v3 agrees). The status endpoint plus signed audit checkpoints give the same evidence without the operational cost.

### 2.8 Audit

| Option | Detects | Cost | Verdict |
|---|---|---|---|
| Linear hash chain (current) | Edits and deletions mid-chain | Trivial | **Keep** |
| + DB triggers blocking UPDATE/DELETE, INSERT-only role | Accidental and app-level tampering | Trivial | **Add (P0/P1)** |
| + periodic signed checkpoint (`seq`, head hash, Ed25519 sig) exported to WORM/object-lock storage under a second custodian | Truncation, wholesale rewrite by a DB superuser | Low | **Add (P1)** |
| Merkle tree / transparency log (Trillian-style, inclusion and consistency proofs) | All of the above + efficient third-party proofs | Medium–high | **Defer**: only needed if third parties must verify individual entries |
| Blockchain anchoring | Same as WORM + public timestamp | High; governance | Reject |

**Atomicity fix (P0):** write the audit row in the business transaction on PostgreSQL. Keep the separate-session path only for DENIED events, which must survive rollback.

### 2.9 Advisory seat checks

**KEEP.** Blocking would push institutions to under-report (v3 rationale holds). Strengthen the prevention story by logging `seat_check_logs` against later commits, so AICTE can see "advice ignored" rates. This data already exists and only needs a report.

### 2.10 Integration hub

**KEEP WITH MODIFICATIONS.** The port/adapter boundary is right; the registry port is the template. A "schema registry" and per-adapter versioning platform is premature for one inbound API and a handful of outbound feeds. Instead:
1. An OpenAPI spec as the contract.
2. A typed adapter interface per external system.
3. Contract tests.
4. Signed webhooks built on the outbox.

### 2.11 Staged migration

**KEEP.** The design is sound. The tooling it needs is small:
- migration batches through the same engine, with a dry-run;
- declared-totals reconciliation;
- a legacy export.

The blocking item is EXT P15 (legacy formats unknown).

### 2.12 Cross-institution privacy

Current: central matching on plaintext, with redacted institution views. **KEEP.** Real risks are:
- insider access (analysts or admins browsing);
- logs;
- verifier-side enumeration.

Controls:
- pseudonymised logs (done for APAAR, not for names in findings);
- small-cell suppression;
- access logging of record views (done);
- an access-anomaly report (doc 06 F-14).

PPRL is unnecessary while matching stays inside one controller.

### 2.13 Encryption, keys and secrets

- **APAAR application-level encryption plus blind index: KEEP** (P1 pilot gate). Be explicit that it protects DB dumps, backups and replicas, but not a compromised app server.
- **The current `app_secrets` table on Postgres** puts the JWT secret, HMAC key and signing key in the same database as the data. **Acceptable for the synthetic demo only.** Pilot needs KMS (or at minimum a secrets manager plus envelope keys).

### 2.14 Hosting

Real student data requires India-resident hosting. MeitY guidance requires government data on MeitY-empanelled cloud with data inside India (doc 05 R11).
- **Vercel/Neon defaults** (`iad1`) are **not suitable** for real data.
- **Kubernetes: DEFER.** Managed containers (two zones) plus managed PostgreSQL with a synchronous standby meet v3 objectives.
- **Terraform: adopt at pilot.**

## 3. Classification of every v3 ADR

| v3 ADR | Verdict | Change |
|---|---|---|
| 1 Monolith + workers | KEEP WITH MODS | Import-lint; Postgres job table; async large commits |
| 2 PostgreSQL + RLS | KEEP WITH MODS | RLS at pilot; partitioning deferred; MV read models |
| 3 Outbox | KEEP | Implement; audit **not** via outbox |
| 4 Ports/adapters | KEEP | Production guard; contract tests |
| 5 Rules as versioned data | KEEP WITH MODS | Simplified schema (§2.5) |
| 6 SD-JWT, Ed25519, VC 2.0 shape | KEEP WITH MODS | RFC 9901 conformance; `vct`; share codes; DigiLocker as primary channel |
| 7 Hash chain + anchors | KEEP WITH MODS | Same-txn; triggers; signed checkpoints; Merkle deferred |
| 8 Rules before ML | KEEP | Outcomes as labels; Splink for batch |
| 9 Advisory seat check | KEEP | Advice-vs-outcome report |
| 10 APAAR encryption + blind index | KEEP | Honest scope |
| 11 Integration hub | KEEP WITH MODS | Module, not platform |
| 12 Managed containers | KEEP | Vercel demo-only; India region |
| 13 Staged cutover | KEEP | Implement tooling |
| (implicit) Redis | **REPLACE** for pilot by Postgres primitives; **DEFER** Redis | — |
| (implicit) Seat-ledger counter table | **REPLACE** by computed counts + MV | — |
| (implicit) Peer stats on groups <8 | **Follow v3**: informational only | Code currently scores them |
