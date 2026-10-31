# 07 — Security, privacy and failure assessment

**Scope.** This document covers the code at `b0072e7` plus the v3 target design. Findings marked **measured** were reproduced in this environment; **read** means found by code inspection. **No security certification or legal compliance is claimed.** DPDP, CERT-In and STQC status needs a formal assessment by qualified people.

**Severity:**

| Level | Meaning |
|---|---|
| **H** | Exploitable now, or blocks a pilot |
| **M** | Must fix before pilot |
| **L** | Hardening |

## 1. Findings

| # | Finding | Evidence | Sev | Fix | Test to add |
|---|---|---|---|---|---|
| S1 | **Login timing oracle** reveals whether an email exists | Measured: unknown email 9–19 ms, known email 149–203 ms (`api_auth.py` L60 returns before `verify_password`) | M | Always run a dummy hash verify; return the same error | Timing assertion: median difference under 20 ms over 50 attempts |
| S2 | **Public `/auth/demo-accounts`** lists every seeded login | Read: L90, no auth, no `DEMO_MODE` gate | H (if exposed beyond demo) | Gate behind `DEMO_MODE=true`, off by default | 404 when `DEMO_MODE` is unset |
| S3 | **Account lockout is per account, with no IP dimension.** An attacker can lock out any known user (DoS) | Read: `failed_logins` counter on the user | M | Per (account, IP) back-off; CAPTCHA after N attempts; never hard-lock AICTE accounts | Lockout of A from IP-1 does not lock A from IP-2 |
| S4 | **Rate limiter is in-memory.** Per instance, it resets on cold start, so it is ineffective on serverless | Read: `security.py` dict | M | Postgres `rate_limits` table (doc 04) or the edge/WAF | Two app instances share a counter |
| S5 | **XLSX parser: zip/XML bomb, and rows are materialised before the row cap** | Read: `intake.py` L57/L63; no `defusedxml` installed | H | Install `defusedxml`; check the zip's uncompressed size and ratio before `openpyxl`; stream rows and stop at the cap. The Codex branch has this patch. | A 10 MB → 2 GB bomb is rejected in under 1 s; 50,001 rows → 413 |
| S6 | **CSV formula injection** in exports | Read: `csvout.py` escapes `= + - @`. **Already mitigated**; keep it | — | Keep; add tab/CR prefixes | Already tested; extend |
| S7 | **Audit not atomic with the business write.** A crash between commit and `_append` loses the event, and the chain can't detect the omission | Read: `db.after_commit`, separate session | H | Write audit rows in the same transaction (an outbox row or a direct insert); compute the hash chain in a single-writer step | Kill the process after commit and before the hook; on restart the event exists |
| S8 | **Chain truncation undetectable** (deleting the tail keeps a valid chain) | Read: `verify_chain` checks links only | M | Signed external checkpoints (F-16) | Delete the last N events → verification fails against the checkpoint |
| S9 | **Secrets in the same database as data** (`app_secrets`) | Read: `secret_store.py` | M (pilot), H (prod) | A KMS/secret manager for the Ed25519 signing key and the JWT key; app DB stores only key ids | Startup fails when KMS is unreachable and `ENV=prod` |
| S10 | **JWT HS256 in sessionStorage; no revocation** (`token_version` absent) | Read: `frontend/src/api.ts` L28; `security.py` | M | Short access token (15 min) plus an httpOnly SameSite=Strict refresh cookie; `users.token_version` checked on each request; CSP to limit the XSS blast radius | Logout or password change invalidates old tokens |
| S11 | **Security headers incomplete.** CSP, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` and `Cache-Control: no-store` on API responses are already set (`main.py` L111–131). Missing: HSTS; `style-src` allows `'unsafe-inline'`; the docs page loads scripts from a CDN | Read: `main.py` headers middleware | L | Add HSTS at the edge or app; move inline styles to classes and drop `'unsafe-inline'` | Header test including HSTS |
| S12 | **Masked APAAR (last 4) disclosed to verifiers by default** | Read: verification payload | L–M | Show it only if the APAAR claim was disclosed | Undisclosed → field absent |
| S13 | **Idempotency records store full responses (including registry names) with no expiry** | Read: `idempotency_keys.response_json` | M | Store a response hash plus the resource id; TTL of 24–72 h; purge job | Records older than the TTL are purged; no names in the table |
| S14 | **SSE token reusable for 2 min and passed in the URL query** (it appears in logs) | Read: `api_events.py` | L | One-time ticket, consumed on connect; strip it from access logs | Second use → 401 |
| S15 | **No row-level security.** Institution scoping relies on every query remembering `institution_id` | Read: scoping in routers | M | A central scoped-query helper first (cheap); then PG RLS with `SET LOCAL app.institution_id` for defence in depth | Cross-tenant test per router (generated from the route list) |
| S16 | **Issue dedupe race** (read, then insert; no unique index) → duplicate flags under concurrency | Read: `issues.py` L60 | L | Partial unique index on `(rule, subject_key) WHERE status='OPEN'` and an upsert | Two concurrent commits produce one flag |
| S17 | **Minors' data verified without guardian consent** | Read: no R015 | H (legal) | F-03 | Under-18 verification → held |
| S18 | **Hosting region.** The Vercel default is US (iad1); Neon region not chosen | Config read | H for real data | Demo stays synthetic-only; pilot uses India-region hosting (MeitY-empanelled CSP) | Deployment checklist item |
| S19 | **No dependency or secret scanning; no CI** | `.github/` absent | M | CI with `pip-audit`, `npm audit`, gitleaks, ruff, tsc, pytest (SQLite + PG) | CI itself |
| S20 | **Public verify endpoint unthrottled**; enumerating credential ids is possible if they are guessable | Read: ids are UUID4 (fine) but no throttle | L | Throttle per IP; share codes (F-04) | Over N/min → 429 |
| S21 | **Error responses** | Read: generic handler returns no stack traces. **Good** | — | Keep | — |
| S22 | **Password policy and MFA** absent for AICTE roles | Read | M | TOTP for AICTE admin/auditor; length ≥ 12 plus a breached-password check | Login requires TOTP for the AICTE_ADMIN role |

**What is already good (verified):**
- Salted PBKDF2-SHA256 password hashing (`security.py` L45; Argon2id recommended for pilot); API keys stored as SHA-256 hashes, compared in constant time.
- Parameterised SQL everywhere through the ORM.
- CSV injection escaping.
- Names never written to audit details.
- Redaction of other institutions' identity in D003 flags.
- Ed25519 signatures that verify independently.
- Synthetic data only.
- SIMULATED labels on the APAAR adapter.

## 2. Privacy assessment (DPDP lens; not legal advice)

| Principle | Current state | Gap | Action |
|---|---|---|---|
| Purpose limitation | Purposes implied (enrolment register, verification) | No recorded purpose per processing activity | Processing register in docs; purpose code on every verification request (already partly done through the consent `purpose` field) |
| Data minimisation | 14 fields per student; Aadhaar not stored (good) | Mobile and email optional but kept forever | Retention schedule; drop contact fields after the course ends + N years (policy decision for AICTE) |
| Consent | Verifier consent flow exists | Consent not revocable; no consent for minors | F-03; revocation endpoint; consent artefact recorded with timestamp and version of notice |
| Notice | None in the UI | — | Short notice on the student page and the institution template (text from AICTE legal) |
| Data principal rights | View own record; correction requests | No access log, no erasure workflow (limited by law for statutory records) | `/me/access-log`; document erasure limits |
| Breach response | None | 72-hour DPB notice per the DPDP Rules (doc 05 R10); CERT-In 6 h | Incident runbook (doc 08 §10) |
| Children | Not handled | Rule 10 | F-03 |
| Cross-border | US region possible | — | India-hosted for any real data |

## 3. Threat model summary (STRIDE)

| Threat | Asset | Main control (current) | Gap |
|---|---|---|---|
| **S**poofing an institution user | Submissions | Password + JWT | S1, S3, S22 |
| **T**ampering with records | Enrolments | Single-writer engine; audit chain | S7, S8 |
| **R**epudiation by an institution | Declarations | Audit events with actor | S7 (lost events) |
| **I**nformation disclosure | Student PII | Role scoping, redaction | S12, S13, S15, S18 |
| **D**enial of service | Intake, login | Row cap | S3, S4, S5 |
| **E**levation of privilege | AICTE roles | `require_role` | S10 (no revocation), S15 |
| **Insider browsing** (the most likely real threat) | National register | `record.view` audit | No analysis (F-14) |

## 4. Failure scenarios

| Scenario | Current behaviour | Impact | Mitigation | Test |
|---|---|---|---|---|
| Crash after commit, before the audit hook | Event lost silently | Audit gap | S7 | Fault injection |
| Neon cold start or connection-limit exhaustion on Vercel | 500s / slow first request | Demo looks broken | Pooled connection string (`-pooler`), `pool_pre_ping`, warm-up ping | Smoke test after deploy |
| 5,000-row commit on serverless | 49 s locally; over 60 s with network → function timeout; client retries → **double commit is prevented** by idempotency only if the client sent a key (the UI does not) | Partial or duplicate import | Background job + UI-generated idempotency key (doc 08) | Kill mid-commit; re-run → same result |
| Two institutions commit for the same student at once | Both commits pass identity before the other's row exists → no D003 flag | Missed duplicate | Advisory lock per identity block key, or a post-commit batch pass (Splink, F-07) | Concurrency test |
| Two commits for the last seat | Ledger computed by COUNT inside the transaction; no lock → **both admitted** | Over-intake by 1 under race | `SELECT … FOR UPDATE` on the programme-year row, or SERIALIZABLE for the capacity check | Concurrency test (two threads, 1 seat) |
| APAAR registry unavailable (real integration) | N/A (simulated) | — | Circuit breaker; rows go to `PENDING_VERIFICATION`, not reject | Adapter fault test |
| Signing key compromised | No rotation path | All credentials suspect | Key registry with `kid`; status list; re-issue job | Rotate → old `kid` rejected after the cut-off |
| Database restore to yesterday | Chain valid; the last day silently missing | Undetected loss | Checkpoints (S8) | Restore drill |
| Bad rule change (e.g. R009 to ERROR) | Applies immediately | Mass rejection mid-season | Impact preview + four-eyes + versioned rule sets (doc 04) | Rule-change test |

## 5. Security test plan (to add in Phase B)

1. **Generated cross-tenant tests:** for every route with an `institution_id` path, query or body field, call it as institution A for B's resource → expect 403/404.
2. **Parser fuzzing:** hypothesis-generated CSV/XLSX, plus bomb fixtures.
3. **Auth suite:** timing, lockout scoping, token revocation, TOTP.
4. **Concurrency suite:** last seat, D003 race, issue dedupe.
5. **Audit fault injection.**
6. **CI scanners:** pip-audit, npm audit, gitleaks.
7. **Pre-pilot:** ZAP baseline scan against a staging deploy.
