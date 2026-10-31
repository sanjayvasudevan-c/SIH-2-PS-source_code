# 13 — Risk and dependency register

Likelihood (L) and impact (I) are scored 1–3.

| ID | Risk | L | I | Owner | Mitigation | Trigger to revisit |
|---|---|---|---|---|---|---|
| R-01 | No APAAR API access is granted; verification stays simulated | 3 | 2 | AICTE/MoE | Adapter interface + clear SIMULATED labels; offline registry-file import as a fallback | Any MoE response |
| R-02 | Evaluators find claims that aren't implemented | 2 | 3 | Team | Claims register (P0-1) | Before each demo |
| R-03 | Real personal data ends up in the demo deployment | 1 | 3 | Team | Synthetic-only seed; banner; no upload of real files policy | Any pilot talk |
| R-04 | False-positive flags damage institutions' trust | 2 | 3 | AICTE | Explanations, outcomes, FP metrics, "flag ≠ fraud" copy | FP share > 30% for a rule |
| R-05 | P0-4 (atomic audit) regresses write paths | 2 | 2 | Team | Full suite on PG + demos; feature flag for the chainer | Any failing demo |
| R-06 | Vercel timeouts on large commits | 3 | 2 | Team | Row cap on the demo (e.g. 1,000) until P1-1; jobs | Commit > 30 s |
| R-07 | Dense DOB blocks make identity quadratic at national scale | 2 | 2 | Team | Block cap + batch Splink | Block > 500 |
| R-08 | DPDP Rule 10 obligations for minors (from ~May 2027) | 3 | 3 | AICTE legal | F-03 now; legal review | Rules update |
| R-09 | Dependency approval delays (defusedxml, alembic, splink) | 2 | 1 | You | Request approval in one batch (doc 09) | — |
| R-10 | Codex-branch code reused without review | 2 | 2 | Team | Port per item with tests; no wholesale merge | — |
| R-11 | Signing-key compromise | 1 | 3 | AICTE | KMS, `kid`, status list, re-issue runbook | — |
| R-12 | Insider browsing of the national register | 2 | 3 | AICTE | Audit + anomaly report + access log | — |

## External dependencies

| Dependency | Status | Needed for | Evidence |
|---|---|---|---|
| APAAR/ABC verification API | **Not confirmed public** | P3-1 | doc 05 |
| DigiLocker issuer push | Exists for onboarded issuers | P3-2 | doc 05 R13 |
| AISHE DCF format | Public forms; machine format unconfirmed | P3-3 | doc 05 R14 |
| AICTE approval-portal feed | Unknown | P3-4 | — |
| India-region host | Procurement | Pilot | doc 05 |
| Neon attachment to Vercel project | **Pending (you)** | Demo deploy | Session history |
| Package installs | **Pending (you)** | P0-2, P0-7, CI, P2-4 | doc 09 |
