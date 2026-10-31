# 11 — Proposed database and API changes

**Nothing here has been applied.** All changes would ship as Alembic migrations after P0-7.

## Database

| Change | Type | For | Migration notes |
|---|---|---|---|
| `students.guardian_consent_recorded BOOLEAN NOT NULL DEFAULT false`, `guardian_consent_at TIMESTAMPTZ` | column | F-03 / P0-8 | Backfill false; under-18 rows become held |
| `validation_issues` partial unique index `(rule_code, subject_key) WHERE status='OPEN'` | index | S16 / P0-6 | Deduplicate existing duplicates first (script) |
| `validation_issues.resolution_outcome` enum (`DATA_CORRECTED`, `FALSE_POSITIVE`, `CONFIRMED`, `TRANSFER`, `OTHER`) | column | F-02 | Nullable |
| `issue_explanations(issue_id PK/FK, formula, inputs JSONB, result, threshold, benign JSONB, confidence)` | table | F-02 | — |
| `audit_events.seq` nullable until chained; `audit_anchors(id, seq, head_hash, signature, kid, created_at)` | column + table | P0-4, F-16 | The chainer fills `seq` |
| `jobs(id, kind, payload JSONB, status, attempts, run_after, locked_by, locked_at, error)`; index on `(status, run_after)` | table | P1-1 | — |
| `outbox(id, topic, payload JSONB, created_at, published_at, attempts)` | table | P1-1 | — |
| `webhook_subscriptions`, `webhook_deliveries` | tables | P2-8 | — |
| `credential_shares(id, credential_id, code_hash UNIQUE, claims JSONB, expires_at, revoked_at, created_at)` | table | F-04 | — |
| `signing_keys(kid PK, alg, public_jwk, status, not_before, not_after)`; `credentials.kid` | table + column | P1-9 | Backfill the current key as `kid-1` |
| `users.token_version INT DEFAULT 0`, `users.totp_secret_ref` | columns | P1-6, S22 | The secret is a KMS reference, not a value |
| `rule_sets(id, version, status, effective_from, approved_by)`, `rules.rule_set_id` | table + column | P1-10 | Seed v1 from current rules |
| `idempotency_keys.response_hash`, `expires_at`; drop `response_json` | columns | S13 | Purge job |
| `declared_totals(programme_year_id, category, declared, source, uploaded_at)` | table | F-12 | — |
| `transfer_requests(id, student_id, from_inst, to_inst, issue_id, status, effective_date, …)` | table | F-15 | — |
| `institution_mappings(institution_id, header_map JSONB, value_maps JSONB)` | table | F-09 | — |
| `identity_candidates.model_version`, `weights JSONB` | columns | F-07 | — |
| `rate_limits(key, window_start, count)` | table | S4 | Unlogged table is acceptable |

## API

| Endpoint | Change | For |
|---|---|---|
| `GET /system/status` | new, public | F-01 |
| `GET /auth/demo-accounts` | 404 unless `DEMO_MODE` | S2 |
| `POST /auth/refresh`, `POST /auth/logout` | new (cookie) | P1-6 |
| `POST /imports` | returns 202 + job; accepts `Idempotency-Key` from UI | P1-1 |
| `GET /imports/{id}` | adds `job_status`, `progress` | P1-1 |
| `POST /credentials/{id}/shares`, `DELETE /shares/{id}` | new | F-04 |
| `POST /verification/share` | new; the token route stays for one release, then is deprecated | F-04 |
| `GET /.well-known/jwks.json` | new | P1-9 |
| `GET /audit/checkpoints` | new, public (no PII) | F-16 |
| `POST /issues/{id}/resolve` | requires `resolution_outcome` | F-02 |
| `GET /rules/metrics` | new | F-02 |
| `POST /rule-sets`, `POST /rule-sets/{id}/preview`, `POST /rule-sets/{id}/approve` | new | P1-10 |
| `GET /me/access-log`, `DELETE /me/consents/{id}` | new | P1-14 |
| `GET /dashboard/completeness` | new | F-10 |
| `POST /transfers`, `POST /transfers/{id}/confirm` | new | F-15 |
| `GET /reports/seat-advice.csv`, `GET /reports/reconciliation` | new | F-05, F-12 |

**Compatibility:** all additions are additive except `POST /issues/{id}/resolve`, where the outcome becomes required; the UI is updated in the same change. The OpenAPI snapshot test flags any other breaking change.
