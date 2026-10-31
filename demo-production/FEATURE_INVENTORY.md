# Feature inventory (verified)

The application is the APAAR Student Register, the SIH26263 prototype in this repository.

**Architecture:**
- FastAPI modular monolith (`backend/app`), SQLAlchemy 2, SQLite locally and PostgreSQL in production.
- React 18 + TypeScript SPA (`frontend/src`) with hash routes, served by the same app.
- Roles: AICTE admin, AICTE analyst, institution admin, institution staff, verifier, auditor, student, plus scoped API keys.
- All data is synthetic. APAAR registry checks are **SIMULATED**.

**Status values:**
- **Verified**: the behaviour was observed in a passing automated check, cited in the last column.
- **Simulated**: works against a simulated dependency.
- **Planned**: not built; excluded from the video.

Every feature below is Verified unless its row says otherwise.

| # | Feature | Route (UI) | Role | Prerequisites | Test steps | Observable success | Evidence |
|---|---|---|---|---|---|---|---|
| 1 | Sign-in with demo account picker | `/#/login` | any | seeded DB | click an account | lands on the role's home page | ui_tour (64 views) |
| 2 | Text-size controls (A−/A/A+), skip link | header | any | — | click A+ | root font size grows | manual, scene 01 recording |
| 3 | Institution dashboard: figures + seat strips per programme | `/#/inst` | INST_* | seed | open dashboard | BTECH-CSE "Within intake 53/60", TFW 3/3 | ui_tour, screenshot |
| 4 | Excel/CSV templates with drop-downs | `/#/inst/upload` | INST_* | — | download template | .xlsx with data validation | test_imports::test_template_downloads |
| 5 | Upload and preview with 25 rules | `/#/inst/upload` → `/#/inst/imports/:id` | INST_* | sample file | upload Demo A | **5 VALID / 2 REVIEW / 9 ERROR** | run_demos A, test_imports |
| 6 | Did-you-mean APAAR suggestion | import detail | INST_* | Demo A row 9 | click **Use this** | row becomes VALID with `911100000008` | run_demos A |
| 7 | Inline row editor (flagged fields highlighted) | import detail | INST_* | error row | edit and save | row re-checked; VALID | run_demos A |
| 8 | Bulk fix | import detail | INST_* | repeated bad value | apply | N rows updated | test_imports::test_bulk_fix |
| 9 | Leave out / restore row | import detail | INST_* | duplicate rows | Leave out | duplicate partner becomes VALID | run_demos A |
| 10 | Seat projection before commit | import detail | INST_* | committable rows | view panel | now/after strips + exceed message | run_demos B |
| 11 | Commit with confirmation; partial commit and retry | import detail | INST_* | — | Commit N rows | "Committed 15 row(s)" | run_demos A, test_imports |
| 12 | Live updates (SSE) on dashboards | `/#/aicte`, `/#/inst` | AICTE/INST | server with live events | commit in another window | "updated hh:mm" marker; numbers change | run_demos A (stream assertion) |
| 13 | Seat check before admission | `/#/seat-check` | INST_* | — | BTECH-CSE, REGULAR, 1 | "would exceed approved intake by 1" | run_demos B, test_ledger |
| 14 | Capacity flags C001/C002, auto-resolve | `/#/issues` | AICTE/INST | Demo B committed | cancel 4 | C001 RESOLVED by SYSTEM_AUTO_RESOLVED | run_demos B, test_demo_b |
| 15 | Cross-institution conflict with identity withheld | `/#/issues/:id` | INST vs AICTE | Demo B | open D003 as each | "Another AICTE-approved institution (identity withheld)" vs both names | run_demos B |
| 16 | Review workflow (clarify, respond, resolve, dismiss, reopen) | `/#/issues/:id` | AICTE/INST | open flag | actions with notes | status + history timeline | run_demos B, test_demo_b |
| 17 | Student records search / filter / sort / paginate | `/#/records` | INST/AICTE | seed | search "Ananya" | one row | test_security |
| 18 | Record detail: correct with reason, status change, history | `/#/records/:id` | INST_* | record | change status | version++, history entry | test_corrections, run_demos B |
| 19 | Manual entry (Add a student) | `/#/inst/add` | INST_* | — | fill and save | record created or findings shown | test_corrections (API) + ui_tour |
| 20 | National register (filters, alerts, state, nationality, coverage, flags, submission, programmes) | `/#/aicte` | AICTE | seed | open | Narmada MBA +8 alert | test_platform, ui_tour |
| 21 | Review priority with reasons and disclaimer | `/#/aicte/priority` | AICTE | seed | open | Narmada first, signals with sentences | test_platform |
| 22 | Identity candidates with weights; decisions | `/#/aicte/identity` | AICTE_ADMIN | seed | open, decide | weights table; D005 dismissed | test_identity |
| 23 | Intake and caps administration | `/#/aicte/intakes` | AICTE_ADMIN | — | change intake | caps re-derived, capacity re-checked | ui_tour (+ API tests) |
| 24 | Rules catalogue: toggle/severity; locked rules | `/#/aicte/rules` | AICTE_ADMIN | — | change severity | saved; locked rule 409 | test_platform |
| 25 | Signed records (Ed25519, SD-JWT style): issue, certificate, revoke | `/#/records/:id` | INST_ADMIN | ACTIVE + VERIFIED | Issue signed record | ACTIVE credential; certificate shows both IDs | run_demos C, test_credentials |
| 26 | Selective disclosure sharing + QR | `/#/me` | STUDENT | active credential | tick 3 claims, Create share token | token + QR | run_demos C |
| 27 | Public verification + tamper demo | `/#/verify` | anyone | token | Verify, then Tamper | 6 checks pass; tampered fails digest/signature | run_demos C |
| 28 | Consent-based verification | `/#/verifier/requests`, `/#/me` | VERIFIER, STUDENT | APAAR + DOB | request → allow → view | 403 before consent; minimal fields after | run_demos C |
| 29 | Student correction request → institution queue | `/#/me`, `/#/corrections` | STUDENT, INST | — | send → accept | request in queue; accept opens prefilled form | run_demos C |
| 30 | Hash-chained audit + chain verification | `/#/audit` | AUDITOR/AICTE_ADMIN | — | Verify chain integrity | "Chain intact: N events" | run_demos, test_platform |
| 31 | Reports (CSV, injection-safe) | `/#/reports` | INST/AICTE | — | download | CSV file | test_platform |
| 32 | System access: API keys shown once, revoke | `/#/inst/system-access` | INST_ADMIN | — | create key | key shown once | test_platform::test_api_key_lifecycle |
| 33 | Integration status (honest states) | `/#/aicte/integrations` | AICTE/AUDITOR | — | open | SIMULATED / LIVE / NOT_IMPLEMENTED labels | test_platform |

**Simulated:** APAAR registry verification uses a synthetic `sim_apaar_registry` table. It is labelled in every scene that shows it.

**Planned (not shown as working):**
- AICTE approval-process intake feed.
- DigiLocker/NAD publication.
- Degree-awarding body feed.
- Offline client-side pre-check.

**Known failures found during the audit:** none in the scenes used. Live events (SSE) are recorded against the local server. On the Vercel deployment, pages auto-refresh every 30 s instead; the UI labels this honestly.
