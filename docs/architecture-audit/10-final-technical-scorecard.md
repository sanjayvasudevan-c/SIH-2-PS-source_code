# 10 — Final technical scorecard

Scores are out of 10, for the **code as it exists at `b0072e7`**, not the v3 design. Evidence is cited from docs 02–07.

| # | Dimension | Score | Evidence | After P0+P1 (est.) |
|---|---|---|---|---|
| 1 | Problem fit (excess admission + duplicates + verification) | **8** | All three demos run end-to-end; seat check before admission | 9 |
| 2 | Functional completeness vs v3 | **5** | ~60% of v3 capabilities are FIV/INC; outbox, rule sets, share codes, reconciliation, key registry and claims register are missing (doc 02) | 7 |
| 3 | Architecture quality | **6** | Real single-writer engine and a clean module split; but in-memory post-commit hooks, no migrations, boundaries not enforced | 8 |
| 4 | Code quality | **7** | Lint/tsc clean; readable; some N+1 and untyped bodies (doc 03 §7) | 8 |
| 5 | Test quality | **7** | 109 tests pass on SQLite **and** PG16; no concurrency, fuzz or cross-tenant tests; no CI | 8.5 |
| 6 | Security | **4** | Timing oracle, parser bomb, non-atomic audit, secrets in the DB, no MFA, no HSTS; CSP and other headers already present (doc 07) | 7 |
| 7 | Privacy | **5** | Good minimisation and redaction; no minor handling, retention, consent revocation or access log | 7 |
| 8 | Performance / scalability | **5** | Preview meets NFR; 5k commit takes 49 s synchronously; per-row queries; no load test | 7 |
| 9 | Reliability / recoverability | **3** | No jobs, retries, anchors, backups policy or deploy | 6 |
| 10 | Observability | **2** | Health endpoint and audit only | 5 |
| 11 | UX | **7** | Clear guided correction, AICTE-style UI, responsive at 390 px; no async progress, no Hindi, no axe gate | 8 |
| 12 | Documentation honesty | **5** | README and gap analysis honest; v3 §25 overstates by ~15 items; no claims register | 9 |
| 13 | Deployability | **4** | Dockerfile + Vercel config exist; nothing deployed; no CI/CD | 6 |
| 14 | Innovation | **7** | Pre-admission seat ledger, privacy-preserving D003 redaction, SD-JWT selective disclosure; more available (doc 06) | 8.5 |
| | **Unweighted mean** | **5.4** | | **7.4** |

## Answers to the mission's 12 questions

1. **Does the code implement the v3 architecture?** Partly. The core slices (intake → engine → ledger → identity → issues → credentials → audit) are real. About 15 v3 "PROTOTYPE" items are not implemented.
2. **Is it production-ready?** No. Doc 07 lists four H-severity findings, and doc 03 shows there is no CI, no migrations and no deployment.
3. **Is it hackathon-ready?** Yes, with P0-1, P0-2 and P0-3 done first. Then claims are honest, the bomb is closed and the demo-accounts endpoint is gated.
4. **Biggest architectural risk?** The non-atomic audit, plus synchronous commits. Both are fixed by Postgres jobs, the outbox and same-transaction audit (ADR-101/102).
5. **Biggest security risk?** Parser bombs and auth weaknesses now. At pilot, insider browsing and hosting region.
6. **Biggest privacy risk?** Minors verified without guardian consent, and hosting outside India.
7. **Is Redis/Kafka/K8s needed?** Not for pilot. Postgres primitives cover the measured load (doc 04).
8. **Is ML justified?** Only for identity matching (Splink) and threshold calibration. Not for institution "risk scores".
9. **What's simulated?** The APAAR registry, DigiLocker, AISHE, the approval-portal feed and student OTP. They are labelled, and must stay labelled until agreements exist.
10. **What needs government approval?** All of P3 (doc 09).
11. **What's the most valuable next feature?** The transfer workflow (F-15). It resolves most D003 flags without AICTE mediation, and it is very demo-able.
12. **What should be removed?** The public demo-accounts endpoint outside demo mode, the unused `BulkFixIn`, and the duplicate integration-status vocabulary.

## Options

| Option | Scope | Time (est.) | Result | Risk |
|---|---|---|---|---|
| **A: Hackathon polish** | P0-1, P0-2, P0-3, P0-9, P0-10, P0-11 + F-15 demo | ~3–4 days | Honest, safe demo with a strong new story | Leaves the audit/race/perf gaps; not pilot-ready |
| **B: Balanced (recommended)** | All P0 + P1-1 to P1-8 + F-15 | ~3 weeks | Demo-ready **and** a credible pilot foundation; fixes every H finding | Moderate; P0-4 touches every write path |
| **C: Pilot-grade** | All P0 + P1 + P2-1 to P2-4 + hosting/VAPT prep | ~6–8 weeks | Ready for a state pilot, subject to external approvals | Large; external dependencies dominate the timeline |

**Recommendation: Option B.** It is the smallest scope that removes every high-severity finding and makes the documents true, while still adding a differentiator for evaluators. Option C's extra value depends on approvals we don't have.
