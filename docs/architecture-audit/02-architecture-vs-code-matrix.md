# 02 — Architecture-to-code matrix (v3 blueprint vs. repository)

**Audited target:** `SIH26263_Final_Architecture_Blueprint_v3.pdf` (v3.0, 29 Oct 2026, 50 pages), hereafter "v3".
**Audited code:** branch `claude/busy-newton-qnsfmy`, commit `b0072e7`. The reverted Codex branch `codex/sih26263-architecture-v2` is assessed separately in §H.
**Method:** every row was traced through route → auth dependency → business logic → transaction → side effects → test. A route or table existing is not counted as evidence.

## Status legend

| Code | Meaning |
|---|---|
| **FIV** | Fully implemented and verified (a passing test or demo exercises the path) |
| **INC** | Implemented but incomplete |
| **DEF** | Implemented but defective |
| **SIM** | Partially simulated |
| **DNI** | Documented but not implemented |
| **MIS** | Completely missing (not documented in the repo either) |
| **EXT** | External dependency |
| **UTV** | Unable to verify in this environment |

Evidence key:
- `T:` names a test in `backend/tests/`.
- `D:` names a demo in `scripts/run_demos.py`.
- `U:` names a page in the UI tour, `scripts/ui_tour.py`.

---

## A. Matrix

### A1. Claims governance (v3 "Document control", §2 principle 10, §25)

| v3 requirement | §  | Expected | Actual | Files | Status | Recommended action |
|---|---|---|---|---|---|---|
| Machine-readable claims register `docs/FEATURE_STATUS.yaml` + `scripts/check_claims.py` failing CI on unsupported claims | Doc control, 2, 6, 25 | Register is authoritative over the PDF | **Neither file exists on any branch.** No CI exists (`.github/` absent). v3 §25 marks ~40 capabilities PROTOTYPE "per the v2.0 claims register", which does not exist. | — | **MIS** | P0: create the register from *this* matrix and gate CI on it |
| `GET /system/status` | 6, 17 | Feature statuses + integration modes | Only `GET /api/v1/integration/status` (integration modes, hard-coded list). | `modules/api_integration.py` | **INC** | Add `/system/status` backed by the register |

### A2. Identity and access (§19, §20)

| v3 requirement | § | Actual implementation | Files / endpoints | Tests | Status | Weakness → action |
|---|---|---|---|---|---|---|
| 7 roles + integration clients | 3, 20 | 7 roles; scoped API keys | `security.py` `ROLES`, `require_roles`, `api_client` | T:test_security, test_platform | **FIV** | — |
| AICTE regional officer (state-scoped) | 3, 20 | Not present | — | — | **DNI** (v3 flags it open, P17) | Defer until AICTE confirms |
| Permission matrix **as data**, default-deny, route-coverage test | 20 | Checks distributed across route dependencies; no matrix, no coverage test. An unprotected new route would not be caught. | `modules/api_*.py` | none | **INC** | P1: declarative matrix + test that fails on any route without an entry |
| Institution isolation (404 foreign objects, 403 explicit filters) | 9, 19 | Implemented in app layer | `security.ensure_institution`, list filters | T:test_security (6 tests) | **FIV** (app layer only) | — |
| PostgreSQL RLS as defence in depth | 9, 19 | **Not implemented.** App connects as table owner; no policies. | `db.py` | — | **DNI** | P1 (pilot gate) |
| Password hashing (Argon2id target, PBKDF2 in prototype) | 7 | PBKDF2-SHA256 210k | `security.hash_password` | T:test_password_hash_iterations | **FIV** | — |
| Lockout after 5 failures | 19 | Implemented | `api_auth.login` | T:test_login_lockout | **DEF** | Lockout is per account with no CAPTCHA/backoff. Combined with the timing oracle (row below) and the public account list, any attacker can lock any user. Fix in P0. |
| No account enumeration | 19 (ID enumeration) | **Timing oracle measured:** wrong password for existing user ≈150–200 ms (PBKDF2) vs ≈10–20 ms for unknown email | `api_auth.login` L60 short-circuit | none | **DEF** | P0: dummy hash on unknown user; constant-time path |
| Public demo-account listing | — | `GET /api/v1/auth/demo-accounts` returns every `@demo.local` account unauthenticated | `api_auth.py` L90 | — | **DEF** (prod) | P0: disable unless `DEMO_MODE=1` |
| Short-lived tokens; `token_version` revocation on logout/password change | 19 | HS256 120-min JWT; user reloaded per request (deactivation works); **no token_version**, logout is client-side only; token stored in `sessionStorage` | `security.issue_token/decode_token`, `frontend/src/api.ts` L28 | — | **INC** | P1: token_version claim; HttpOnly SameSite cookie for browser sessions |
| MFA (TOTP/WebAuthn) for privileged roles; SSO/OIDC for AICTE | 7, 19 | None | — | — | **DNI** / **EXT** (IdP) | P1 MFA (pilot gate P13); SSO is EXT (P16) |
| Login rate limit | 19 | In-memory per process | `security.RateLimiter` | T:test_login_rate_limit | **DEF** in production | Per-instance memory is ineffective on Vercel/serverless or multi-replica. Move to Postgres (or Redis) token bucket. |
| User administration (nodal officer manages staff) | 3, 20 | No UI/API for user CRUD, password reset | — | — | **MIS** | P1 |

### A3. Registry, intake and rule governance (§9, §10)

| v3 requirement | § | Actual | Files | Tests | Status | Action |
|---|---|---|---|---|---|---|
| Institutions, programmes, approved intake per programme-year | 9 | Implemented | `models.py`, `api_registry.py` | T:test_ledger | **FIV** | — |
| Intake source FEED/MANUAL + **four-eyes** approval | 9, 10 | Single AICTE_ADMIN sets intake; no second approver; no `source` column | `api_registry.set_intake` | — | **INC** | P1 |
| **Versioned rule sets** (`rule_sets`, `rule_set_entries`, basis points, validity range, DRAFT/ACTIVE/SUPERSEDED, verification status) | 10 | **Not implemented.** Caps come from `ledger.default_caps()` constants (15%/25%/5%) written into `supernumerary_quotas.rule_source` text; overrides via `PATCH /intakes/{id}/quotas/{cat}` with `CONFIGURED:` prefix. | `modules/ledger.py` L58–96 | T:test_default_caps_rounding | **DNI** (v3 §25 claims PROTOTYPE: **false claim**) | P1. Codex branch has a starting point (§H). |
| Impact preview `POST /rule-sets/{id}/impact`; activation with reason + second approver | 10 | Missing | — | — | **DNI** | P1 |
| Seed rule sets labelled UNVERIFIED with UI caveat | 10, doc control | Caps carry `rule_source` text but no `verification_status`; UI shows rule_source only as tooltip on the intake page; seat-check response has no `rule_set` field | `ledger.seat_check`, `IntakeAdmin.tsx` | — | **INC** | P1 (cheap): add verification label to seat-check response and dashboards |
| Integer arithmetic for caps | 10 | Implemented (`intake * pct // 100`) | `ledger.default_caps` | T:rounding cases | **FIV** | — |
| Quota snapshot (rule set, version, calc JSON) per quota row | 9 | Not stored | — | — | **DNI** | With rule sets |
| Submission-completion declaration | FR14 | Implemented | `POST /intakes/{id}/submit`, `InstDashboard.tsx` | U:/inst | **FIV** | — |

### A4. Seat ledger and capacity (§8, §10)

| v3 requirement | § | Actual | Files | Tests | Status | Action |
|---|---|---|---|---|---|---|
| Counting rules (ACTIVE/PROVISIONAL only; REGULAR+NRI vs intake; per-category caps; non-transferable) | 9 | Pure function + DB count | `ledger.position_from_counts`, `counts_for`, `all_positions` | T:test_ledger (20 tests) | **FIV** | — |
| `seat_ledger` **counter table** maintained transactionally + nightly reconciliation | 9, 10 | **Not implemented by design choice:** positions are computed with `COUNT … GROUP BY` on every read (indexed on `(programme_id, academic_year, status)`). | `ledger.py` | — | **Implemented differently** (see §D) | Keep computed counts until measured load requires counters (doc 04, ADR-R3) |
| `POST /seat-check` advisory, logged, ERP-callable | 8 | Implemented; logged to `seat_check_logs`; ERP scope `seat:check` | `api_registry.seat_check` | T:test_seat_check_api, test_platform | **FIV** | Response lacks `rule_set` + verification status (v3 §8 sample) → INC detail |
| Projection in import preview | 8, 10 | Implemented | `intake.projection` | D:A, B | **FIV** | — |
| Threshold-crossing events (90%, 100%, cap reached) to outbox | 10 | Missing | — | — | **DNI** | P2 with outbox |
| Status transitions with reason + version (409) + revision + capacity re-run | 8 | Implemented | `api_records.change_status`, `ledger.TRANSITIONS` | T:test_corrections, test_demo_b | **FIV** | — |

### A5. Ingestion (§8, §11; invariants I1–I9)

| Invariant / requirement | Actual | Files | Tests | Status | Notes / action |
|---|---|---|---|---|---|
| Single pipeline for upload, API, manual (`validate_rows`/`commit_values`) | Yes — all three channels call the engine | `engine.py`, `intake.py`, `api_records.manual_entry`, `api_integration.push_enrolments` | T:test_imports, test_corrections, test_platform | **FIV** | Same rules on every channel confirmed by reading call sites |
| I1 Nothing reaches register before commit | Preview writes only `import_rows` | `intake.create_job` | T:test_demo_a | **FIV** | — |
| I2 Exactly-once row commit (one savepoint per row incl. audit) | Savepoint per row ✔; **audit event is *not* in the savepoint**: it is buffered and appended after the outer commit in a separate transaction | `intake.commit_job`, `audit.record`, `db.after_commit` | T:test_partial_commit | **DEF** (vs I2/I9) | P0: same-transaction audit on PostgreSQL (advisory lock already used) |
| I3 Idempotent re-run (content hash no-op) | Re-commit of committed job is a no-op ✔; **identical rows in a *new* job re-run as D001 updates and write revisions only if values changed** (no content hash, but `_set_fields` writes no revision when unchanged) | `engine.commit_values` | T:test_demo_a_full_flow | **INC** | Acceptable; add `content_hash` if audit volume matters |
| I4 No stuck lock (lock_token, locked_at, lease expiry, sweeper) | Conditional UPDATE to COMMITTING; stale takeover after 10 min based on `updated_at`; no token, no sweeper, no `/recover` | `intake.commit_job` | T:test_concurrent_commit_conflict | **INC** | P1 lease token |
| I5 Commit re-validates; report `changed_since_preview` | Re-validates ✔; `changed_since_preview` not reported | `intake.commit_job` | — | **INC** | P1 (small) |
| I6 Unique violation → per-row retryable failure | Savepoint rollback → row ERROR `COMMIT_FAILED` | `intake.commit_job` | — (not fault-injected) | **INC** | v3 wants D002 for the losing roll; add fault test |
| I7 Hostile files: magic bytes, **zip-bomb limits**, no macros, external links, formula neutralisation, encoding fallback | `.csv/.xlsx` + `PK` magic + 2 MB + NUL check ✔; **no decompressed-size limit** (openpyxl expands the sheet; `raw_rows=[list(r) …]` materialises all rows before the 5,000 cap); **defusedxml not installed** (openpyxl docs: no billion-laughs protection without it); no `.xlsm` macro check needed (extension gate) | `intake.parse_upload` L50–86 | T:test_upload_rejections | **DEF** | P0: install defusedxml, cap rows while streaming, cap decompressed size |
| I8 Side effects after commit (outbox) | Post-commit **in-memory** hooks (SSE publish, audit flush). Lost if the process dies between commit and hook | `db.after_commit` | — | **DEF** vs v3 (no outbox) | P1 outbox |
| I9 Audit fails closed (same transaction) | Audit flush runs *after* commit; a failure surfaces as 500 **after data is committed** | `audit._append`, `db._run_post_commit` | — | **DEF** | P0 |
| Guided correction: did-you-mean, bulk fix, leave out, original values kept | Implemented | `apaar_adapter.did_you_mean`, `intake.bulk_fix/exclude_row`, `ImportRow.original` | T:test_rules, test_imports; D:A | **FIV** | did-you-mean costs 119 registry lookups per NOT_FOUND row (one IN query); rate-limit it when LIVE |
| Excel template with drop-downs | Implemented | `intake.template_xlsx` | T:test_template_downloads | **FIV** | — |
| 5,000-row validation < 30 s (NFR) | **Measured (this audit):** preview of 5,000 rows on SQLite 4.9 s and on PostgreSQL 13.8 s, but on an all-ERROR file that skips repository rules. The realistic file is measured in doc 03 §4. | — | scratchpad bench | **UTV → see doc 03** | — |

### A6. Validation rule catalogue (§11)

| v3 requirement | Actual | Status | Notes |
|---|---|---|---|
| 26 rules incl. **R009 = non-Latin name (WARNING)** and **R015 = minor without guardian consent (REVIEW)** | 25 rules; **R009 here means "duplicate enrolment same programme-year" (ERROR)**; R015 absent | **Implemented differently + DNI** | ID collision: v3 and code assign R009 to different rules. P0 for docs consistency: rename code R009 → R016 (or v3), add v3 R009/R015. |
| Non-Latin names keep a Unicode key | `name_key` strips to ASCII → **empty key for Devanagari/Tamil names**; identity matching then degenerates | **DEF** | P1 (Codex branch fixes this) |
| Each finding: rule, severity, field, message, remediation, **explanation {formula, inputs, result, benign_explanations, confidence}**, rules snapshot | Findings have rule, severity, field, message, evidence, suggestion; remediation on issue. **No explanation object, no snapshot ID** | **INC** | P1 |
| AICTE toggle/severity, locked rules | Implemented | **FIV** (T:test_rules_admin) | No history table/`GET /rules/history` → INC |
| Rule metrics `GET /rules/metrics` (FALSE_POSITIVE share) | Missing | **DNI** | P1 — needs resolution outcomes |
| Wording policy test (no "fraud" etc.) | Only checked in demos (`run_demos`, test_demo_b string check) | **INC** | P1 test scanning templates/messages |

### A7. Identity resolution (§12)

| v3 requirement | Actual | Status | Notes |
|---|---|---|---|
| Normalise + honorific stripping | Normalise ✔; honorifics (Mr, Dr, Shri, Smt…) **not stripped**; NFKD→ASCII destroys non-Latin | **INC/DEF** | — |
| Token equivalence (fold, JW ≥0.92, initials) | Implemented | **FIV** (T:test_identity) | — |
| Blocking: DOB, swapped DOB, **second pass** (phonetic surname, birth year, gender) | DOB + swap only | **INC** | A mistyped DOB hides a pair entirely |
| Generic tokens (kumar, devi, singh, mohammed…) half weight | Missing | **DNI** | Real false-positive risk at national scale |
| Bands STRONG ≥9 (D005) / POSSIBLE 6–9 | Implemented | **FIV** | — |
| Decision memory with attribute fingerprint | Decision stored; suppression only when decision = DIFFERENT_PEOPLE for the exact pair; no fingerprint (re-flag on attribute change) | **INC** | — |
| Golden set ≥60 labelled pairs, precision/recall in CI | 6 unit tests; **no golden set** | **DNI** | P1 — cheap and differentiating |
| Cross-institution candidates on pseudonyms | Candidates computed on plaintext names in one DB (centralised); institution views are redacted | **Implemented differently** | Acceptable for a central register (doc 04) |
| Scalability of blocking | Each row loads *all* students sharing a DOB (≈ 15M ÷ ~9,000 plausible DOBs ≈ 1,600 per block nationally) and scores in Python; plus one transfer query per candidate | **Risk at scale** | P1: SQL-side pre-filter on folded surname / name-key trigram |

### A8. Findings, review and analytics (§13)

| v3 requirement | Actual | Status | Notes |
|---|---|---|---|
| One unresolved issue per (rule, dedupe key) | Read-then-insert in `issues.open_or_update` (L60); **no unique/partial index** → concurrent commits can create duplicates | **DEF** (race) | P1: partial unique index `WHERE status IN open states` |
| Resolution **outcome** (CONFIRMED_ISSUE, EXPLAINED_NO_ACTION, DATA_CORRECTED, FALSE_POSITIVE, DUPLICATE_OF_ISSUE) | Note required, **no outcome enum** | **INC** | P1 — needed for metrics and ML labels |
| Capacity auto-resolve only, logged, reopenable | Implemented | **FIV** (T:test_demo_b) | — |
| Cross-institution redaction | Implemented | **FIV** (D:B) | — |
| Review priority: signals + robust z; peer groups <8 informational only | Signals + robust z ✔; **with 5 seeded institutions the code scores peer z anyway** (falls back to "all institutions") — v3 says peer groups smaller than 8 are informational, not scored | **Implemented differently** | Produces measured artefacts (e.g. zero NRI share scored as anomaly) → follow v3 |
| Small-cell suppression for analysts (aggregates ≥5) | Missing | **DNI** | P1 |
| Student correction loop, overdue signal | Implemented | **FIV** (D:C) | — |
| Reports CSV, injection-safe, audited | Implemented | **FIV** | — |
| BI export / warehouse | Missing | **DNI** | P2 |

### A9. APAAR registry port (§14)

| v3 requirement | Actual | Status | Notes |
|---|---|---|---|
| Port + SimulatedAdapter; mode on every result | SimulatedRegistryAdapter; mode label "SIMULATED" in findings, UI badges, dashboards | **SIM** | — |
| HttpRegistryAdapter (LIVE) | None | **EXT** (P1 contract) | Correctly not invented |
| DisabledAdapter / outage switch | `APAAR_ADAPTER_MODE=unavailable` | **FIV** (T:test_r008) | — |
| Startup guard: production refuses non-LIVE adapter | Missing | **DNI** | P0 for any production label |
| sim tables absent from production schema | `sim_apaar_registry` is in main metadata | **DEF** vs v3 | P1 |
| Circuit breaker, retries, re-verification worker | Missing | **DNI** | P1 (no workers exist) |
| Persist verified mode/time/adapter version per student | Only `apaar_status` | **INC** | P1 |

### A10. Credentials, shares, consent (§15)

| v3 requirement | Actual | Status | Notes |
|---|---|---|---|
| Ed25519 SD-JWT-style (`typ vc+sd-jwt`), VC 2.0 shape, disclosures | Implemented; compact JWS + disclosures + trailing `~` (RFC 9901 format) | **FIV** (T:test_credentials) | RFC 9901 is now published (Nov 2025) — doc 05 |
| Decoy digests | None (always 8 claims, so count leaks nothing today) | **INC** (low risk) | — |
| 9-step verification incl. **8 KB size limit, header allow-list (reject jwk/jku/x5u/x5c/crit), issuer check, status UNKNOWN on lookup failure** | 6 checks; size limit 20,000 chars (pydantic); alg==EdDSA and kid checked; **no explicit rejection of `jwk/jku/x5u/crit`** (they are ignored, so not exploitable today); **no issuer check**; missing credential row → "fail", **DB error → 500, not UNKNOWN** | **INC** | P1 — tighten to v3 |
| Key registry ACTIVE/RETIRED/COMPROMISED; KMS/HSM | Single key (file locally, DB-stored on Postgres); JWKS has one key | **INC** / **EXT** (KMS) | P1 key registry |
| Assurance level (INSTITUTION_ASSERTED / REGISTRY_MATCHED_SIMULATED / _LIVE) + statement on every result | Issuance requires apaar_status VERIFIED (simulated); no assurance level in payload or result | **INC** | P0 (honesty): add level + statement |
| **Share codes** (128-bit, URL fragment, hashed, expiring, revocable) | **Missing.** QR encodes `/#/verify?t=<full token>` or `?cid=<credential id>` | **DNI** (v3 §25 claims PROTOTYPE: **false claim**) | P1 |
| Verifier sees masked APAAR when not disclosed | Implemented as built (from v1 prompt) | **Privacy concern** | Reveals last 4 digits not chosen by holder → remove (doc 07) |
| Holder binding (KB-JWT), Bitstring Status List | Missing | **DNI** (v3 marks BUILD) | P3 |
| Consent requests with identical response for match/no-match | Implemented | **FIV** (T:test_consent_flow) | Response *time* differs slightly (DB lookups); acceptable |
| `consent_records` with fields, expiry (30 d), **revocation**; `/me/consents`, `/me/access-log` | Approval is a status on `verification_requests` (7-day expiry); **no revocation, no access log** | **INC** (v3 §25 PROTOTYPE: **overstated**) | P1 |
| Minors: R015 guardian flag; verification held | Missing; seeded diploma students are 16–17 and verifiable | **DNI** | P0 (legal-risk). DPDP Rule 10 (verifiable parental consent) applies from May 2027 per secondary sources — doc 05 |
| Certificate with APAAR beside roll + QR (R10) | Implemented | **FIV** | Statement "institution's assertion, not independent proof" missing → P0 text change |

### A11. Audit (§16)

| v3 requirement | Actual | Status |
|---|---|---|
| Hash chain, verify-chain API, first broken seq | Implemented | **FIV** (T:test_audit_chain…) |
| Sequence under advisory lock | `pg_advisory_xact_lock` on Postgres + process lock | **FIV** (PG) |
| Same-transaction, fail-closed | Post-commit separate transaction | **DEF** (A5 I9) |
| DB triggers reject UPDATE/DELETE; insert-only role | Missing (the tamper test *relies* on UPDATE working) | **DNI** (v3 §25 claims PROTOTYPE: **false claim**) |
| Signed anchors to WORM storage; truncation detection | Missing | **DNI** (v3 §25 claims PROTOTYPE: **false claim**) |
| Sanitiser rejects banned keys (apaar_id, full_name, date_of_birth, email) + 12-digit runs | Redacts `apaar_id/password/token/api_key` + 12-digit runs; **names, DOB, email not redacted** (e.g. `credential.verify` logs disclosed claim *names* only — fine; but `api_registry.set_intake` etc. ok; `issue.open` detail fine). No code path currently logs names, but nothing prevents it | **INC** |
| Reading/exporting audit is itself audited | `report.export` + `audit.verify_chain` audited; `GET /audit` listing not audited | **INC** |

### A12. Events and integration hub (§17)

| v3 requirement | Actual | Status |
|---|---|---|
| Transactional outbox | Missing (in-memory post-commit hooks) | **DNI** |
| SSE with single-use ticket, scoped, resume from last event ID | SSE with 2-min JWT "stream token" (reusable within 2 min); scoped ✔; **no Last-Event-ID resume**; in-process only; **disabled on Vercel** (`LIVE_EVENTS=0`) with 30 s polling fallback | **INC** |
| Signed webhooks (HMAC, timestamp, dedupe, DLQ, SSRF allow-list) | Missing | **DNI** |
| ERP push: API key, scopes, idempotency (72 h expiry, no PII in records) | Implemented; **idempotency records never expire and store full response including findings (may contain names)** | **INC** |
| API key self-service (shown once) | Implemented (`/integration/clients`) | **FIV** (T:test_api_key_lifecycle) |
| Intake feed, IdP, DigiLocker, degree-body feed, BI | Missing | **EXT** / **DNI** |
| SFTP bulk drop | Missing | **DNI** |

### A13. Migration and reconciliation (§18)

| v3 requirement | Actual | Status |
|---|---|---|
| Legacy profiles, migration batches (STAGED/SEALED/VOIDED), dry-run | Missing | **DNI** (v3 marks BUILD — honest) |
| Declared totals + reconciliation runs | Missing | **DNI** |
| Legacy-format export adapter | Missing | **DNI** / **EXT** (P15 format unknown) |
| Schema migrations (Alembic, forward-only) | **`Base.metadata.create_all` only; no migration history** on this branch (Codex branch had Alembic, reverted) | **MIS** |

### A14. Data protection and keys (§9, §20)

| v3 requirement | Actual | Status |
|---|---|---|
| APAAR ID encrypted (AES-256-GCM envelope) + HMAC blind index | Plaintext `students.apaar_id`; `apaar_ref` HMAC truncated to 16 hex (64 bits) used only as a pseudonym, not as lookup index | **DNI** (v3 honest: BUILD/P12) |
| Secrets in vault/KMS | Env var, else `var/` files (local) or **`app_secrets` table in the same database** (Postgres/Vercel) | **INC** — DB compromise yields signing key + JWT secret (doc 07) |
| Retention dry-run, anonymisation under legal hold | Missing | **DNI** |
| Notice version per enrolment | Missing | **DNI** |

### A15. Reliability, observability, operations (§21, §22, §24)

| v3 requirement | Actual | Status |
|---|---|---|
| Failure-mode tests (test_fail_*: 18 named tests) | **None of the 18 named tests exist.** Concurrency covered only by a forced-status 409 test | **DNI** |
| Concurrency tests on PostgreSQL | Whole suite runs on PostgreSQL 16 via `TEST_DATABASE_URL` (109 passed in an earlier run; re-run in this audit, see doc 03) | **FIV** (suite level), no dedicated race tests |
| Structured JSON logs, OpenTelemetry, metrics, alerts | Default Python logging; request ID header | **MIS** |
| Background workers (re-verification, lock sweeper, outbox relay, report builder, anchors, retention) | **No worker process exists** | **MIS** |
| Redis (queue, rate limits, SSE fan-out) | Not used | **DNI** (see doc 04 — challenged) |
| CI: lint, typecheck, tests, dependency + secret scanning, SBOM, signed images | **No CI pipeline** in repo; lint/test via Makefile only | **MIS** |
| Backups, PITR, DR, restore drills | Neon (if attached) provides PITR; nothing configured or tested | **EXT/UTV** |
| UI tour, 390 px, no console errors | Implemented | **FIV** (U: 64 views) |
| WCAG 2.1 AA audit | Keyboard focus, labels, contrast tokens; **no automated a11y audit (axe)** | **INC** |
| Load test (200 dashboard users, 100 verifications/s) | Not run | **UTV** |

### A16. Deployment

| Item | Actual | Status |
|---|---|---|
| Docker / compose | `Dockerfile`, `docker-compose.yml` exist; **never built in CI** (docker unavailable in this environment) | **UTV** |
| Vercel + Neon | `vercel.json`, `api/index.py`, `scripts/vercel_build.sh`; project `apaar-student-register` created; **Neon not attached; no deployment exists** | **INC** — nothing deployed (so there is no live deployment to preserve) |
| Production guard (`APP_ENV=production` refuses SIMULATED) | Missing | **DNI** |

---

## B. Critical implementation gaps (ranked)

1. **The claims register does not exist, yet v3 cites it as authoritative.** About 15 capabilities are labelled PROTOTYPE in v3 §25 but are not in code: rule-set governance, impact preview, four-eyes, lease lock, content hash, audit triggers and signed anchors, share codes, key registry, consent records/access log, small-cell suppression, `/system/status`, the golden set, and R015. This is the single largest credibility risk in an evaluation.
2. **Audit is not atomic with the change.** It breaks v3 invariants I2/I8/I9 (`audit.py`, `db.py`).
3. **No schema migrations** (`create_all` only). Any production schema change is unmanaged.
4. **The spreadsheet parser lacks XML/zip-bomb protection** (no defusedxml, unbounded row materialisation).
5. **Authentication hardening defects:** a timing oracle, a public account list, lockout DoS, and an in-memory rate limiter that is ineffective on serverless.
6. **Minors' data:** no R015 guardian hold, while seeded diploma students aged 16–17 can be verified.
7. **No outbox, workers or webhooks**, so the v3 event model is absent, and SSE is disabled on the only planned deployment target.
8. **The issue dedupe race** has no unique index.
9. **Non-Latin names collapse to an empty key.**
10. **Rule ID collision (R009)** between v3 and code.

## C. Architecture decisions not implemented

| ADR (v3 §5) | Implemented? |
|---|---|
| 1 Modular monolith + workers | Monolith **yes**; workers **no**; import-lint boundaries **no** |
| 2 PostgreSQL only, with RLS | PostgreSQL-compatible **yes** (tested); RLS **no**; partitioning **no** |
| 3 Transactional outbox | **No** |
| 4 Ports and adapters with honest modes | Registry port **partial** (simulated only, no production guard) |
| 5 Rules as versioned data | Validation rules as data **yes** (toggle/severity); capacity rules versioned **no** |
| 6 SD-JWT-style credentials | **Yes** (holder binding and status list honestly BUILD) |
| 7 Hash-chained audit + signed off-database anchors | Chain **yes**; anchors **no**; triggers **no** |
| 8 Rules and statistics before ML | **Yes** |
| 9 Advisory seat check | **Yes** |
| 10 App-level encryption of APAAR + blind index | **No** |
| 11 Integration hub with schema registry and signed webhooks | **No** (ERP push and seat check only) |
| 12 Managed containers | **No** (only Dockerfile; Vercel serverless chosen instead — drift) |
| 13 Staged reversible cutover | **No** (process design; no tooling) |

## D. Implemented differently from v3

| Topic | v3 | Code | Verdict |
|---|---|---|---|
| Seat ledger | Counter table + nightly reconciliation | Computed COUNT on read | **Code is simpler and cannot drift.** Keep until measured need (doc 04) |
| R009 | Non-Latin name warning | Duplicate enrolment error | Renumber |
| Peer statistics with <8 peers | Informational only | Scored against all institutions | Follow v3 |
| Verifier sees masked APAAR | Not specified (minimal fields) | Last 4 digits shown even if not disclosed | Remove |
| QR | Share code in fragment | Full token or credential ID | Follow v3 |
| Secrets | KMS/vault | DB table (`app_secrets`) on Postgres | Prototype-only; must not ship to pilot |
| Deployment | Containers on government cloud (India) | Vercel serverless (US default region `iad1`) + Neon | **Data-residency conflict** for any real data (doc 07); acceptable only for synthetic demo |
| SSE ticket | Single-use, 30 s | Reusable JWT, 2 min | Tighten |

## E. Works locally, may fail in production

- **SSE live updates:** in-process bus; disabled on Vercel and broken with more than one replica.
- **Rate limiting and lockout counters:** in process memory, so they reset per instance.
- **Audit chain on SQLite with more than one worker process:** the process lock doesn't span processes. PostgreSQL is protected by its advisory lock.
- **Seeding Neon during the Vercel build:** about 1,347 rows through the engine over the network, with build-time limits.
- **Identity blocking query** at national scale (§A7).
- **`find_candidates` transfer query** (N+1 per candidate).
- **Imports:** synchronous in the request; a 5,000-row file within a 60 s serverless timeout is borderline on Postgres (doc 03 §4).
- **Secrets stored in the same database** as the data they protect.

## F. Simulated or mocked

- APAAR registry: `sim_apaar_registry`, SIMULATED everywhere.
- Approved intake: entered manually by AICTE admin, with no feed.
- Supernumerary percentages: code constants from secondary sources, labelled `DEFAULT:` but **not** labelled UNVERIFIED.
- The demo-account picker and the shared demo password.
- Tamper demo endpoint (`/verification/tamper-demo`), which is clearly a demo.

## G. Genuinely production-grade today (code quality, not operations)

- **Counting rules:** pure, integer and tested at the boundaries.
- **The single validation pipeline across channels**, with 25 rules and positive and negative tests.
- **Institution isolation in the application layer**, with 404/403 semantics tested.
- **SD-JWT construction and verification core:** RFC 9901-compatible serialisation, Ed25519.
- **Hash-chain construction and verification logic.**
- **Idempotent ERP push semantics:** same key with the same body replays; with a different body it returns 409.
- **Guided correction UX:** did-you-mean, bulk fix, leave out.

None of the above is production-*ready* until the operational controls in doc 09 P0/P1 exist.

## H. The reverted Codex branch (`codex/sih26263-architecture-v2`, 3 commits, ~1,500 lines)

It was merged as PR #1 and reverted by PR #2, so it is **not** in the audited code. It contains reusable work for several gaps above:
- Alembic migrations (0001 baseline and 0002 minor consent hold).
- `capacity_rules.py` + `api_capacity_rules.py`: versioned rule sets with effective dates.
- Lease-based commit recovery and idempotency expiry.
- Hardening of XLSM, zip-size and external-link handling; Windows-1252 and semicolon CSV support.
- Non-Latin `name_key`.
- A guardian-consent hold.
- `/integration/system/status`.

**Recommendation:** cherry-pick by topic into P0/P1 items with fresh tests, rather than re-merging wholesale. The revert reason is undocumented, so each piece must be re-reviewed.
