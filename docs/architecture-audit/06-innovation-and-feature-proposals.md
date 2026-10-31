# 06 — Innovation, feature proposals and UX audit

## Part A — Feature proposals

**Selection rule:** a feature is listed only if it solves a named stakeholder problem, uses data the platform already has (or will legitimately have), and can be demonstrated honestly. Eighteen survived; several weaker ideas were rejected (end of Part A).

Every feature gets a block with the same keys:
- **Problem / who**: problem solved and who benefits.
- **Why**: why it is necessary.
- **Novel?**: whether it is genuinely innovative.
- **Exists?**: whether it already exists in the implementation.
- **How / data**: technical approach and data required.
- **DB / API**: schema and API changes.
- **Risk**: security and privacy risks.
- **Size**: complexity (S, M or L).
- **Demo**: how to demonstrate it in the hackathon prototype.
- **Metric**: measurable benefit.

### Tier 1: essential improvements

**F-01 Claims register + `/system/status` page**
- **Problem / who:** evaluators and AICTE can't tell built from simulated.
- **Why:** v3 cites a register that doesn't exist (doc 02 §B1).
- **Novel?:** Not novel, but rare in hackathons; it builds credibility.
- **Exists?:** No.
- **How / data:** `FEATURE_STATUS.yaml` (id, status, evidence: route, test id); `check_claims.py` imports the app, checks that each route exists and that the test id passed in the last JUnit XML; CI fails on mismatch; `/system/status` renders it.
- **DB / API:** API `GET /system/status`.
- **Risk:** None.
- **Size:** S.
- **Demo:** Live page showing PROTOTYPE / SIMULATED / BUILD / EXTERNAL with links to the tests.
- **Metric:** zero unsupported claims.

**F-02 Explanation objects on every flag + resolution outcomes + rule metrics**
- **Problem / who:** AICTE reviewers can't calibrate false positives; institutions can't see *why*.
- **Why:** False positives erode trust (v3 risk register).
- **Novel?:** Partly; explainable rule outcomes with FP metrics are uncommon in government portals.
- **Exists?:** Evidence exists; no explanation object, outcome or metrics.
- **How / data:** `explanation{formula, inputs, result, threshold, benign_explanations[], confidence}`; outcome enum on resolve; `/rules/metrics` = opened, resolved, % FALSE_POSITIVE and median time per rule.
- **DB / API:** `validation_issues.explanation JSON`, `resolution_outcome`; new endpoint.
- **Risk:** None.
- **Size:** M.
- **Demo:** Resolve two flags with different outcomes; the rule metrics table updates.
- **Metric:** FP share per rule tracked from day 1.

**F-03 Guardian-consent hold for minors (R015)**
- **Problem / who:** students under 18 and their guardians; AICTE legal.
- **Why:** DPDP Rule 10 (verifiable parental consent) phases in around May 2027 (doc 05 R10); diploma entrants are 15–17.
- **Novel?:** No, but compliance-critical.
- **Exists?:** No.
- **How / data:** R015 REVIEW when age at admission < 18 and `guardian_consent_recorded` is false; third-party verification of a minor is held (403 with reason) until the flag is set.
- **DB / API:** `students.guardian_consent_recorded`; template column.
- **Risk:** Reduces risk.
- **Size:** S.
- **Demo:** A diploma student's verification is held; the institution records consent and it proceeds.
- **Metric:** zero minor verifications without the flag.

**F-04 Opaque share codes (replace token-in-URL and credential-id QR)**
- **Problem / who:** students, verifiers.
- **Why:** The current QR carries the whole token or the credential ID; it can't expire or be revoked per share.
- **Novel?:** Pattern from v3.
- **Exists?:** No.
- **How / data:** `credential_shares(code_hash, claims[], expires_at, revoked_at)`; QR → `/#/v/<128-bit code>` (fragment, so never sent in Referer); verifier POSTs the code and gets a verification result.
- **DB / API:** New table; `POST /credentials/{id}/shares`, `POST /verification/share`.
- **Risk:** Lower leak surface.
- **Size:** M.
- **Demo:** Share → scan → verify → student revokes → the same QR fails.
- **Metric:** shares revocable in under 1 s.

### Tier 2: high-value innovations

**F-05 Admission-desk "seat check" widget and advice-vs-outcome report**
- **Problem / who:** admission desks; AICTE.
- **Why:** Turns monitoring into prevention, and proves it.
- **Novel?:** **Yes**: a regulator-run, category-aware seat ledger consulted *before* admission isn't offered by any public system we found (doc 05 §3).
- **Exists?:** Seat-check API exists; no report, no embeddable widget.
- **How / data:** Join `seat_check_logs` (advice "would exceed") with later commits in the same programme-year/category; an embeddable JS widget or iframe for institution ERPs authenticated by API key.
- **DB / API:** `GET /reports/seat-advice.csv`.
- **Risk:** Widget keys must be scoped `seat:check` only.
- **Size:** S–M.
- **Demo:** Godavari ignores the advice → the report shows "1 admission against negative advice".
- **Metric:** % of excess admissions preceded by a negative check.

**F-06 Intake-utilisation forecast (late-admission projection)**
- **Problem / who:** AICTE; institutions.
- **Why:** Excess becomes visible only after the deadline today.
- **Novel?:** Moderate.
- **Exists?:** No.
- **How / data:** For each programme-year, project final occupancy from the cumulative admission curve of previous years (same programme or peer median curve), giving a simple quantile band, not ML. Inputs: admission dates (present), previous years (present).
- **DB / API:** none (read model); `GET /dashboard/forecast`.
- **Risk:** Must be labelled "projection".
- **Size:** M.
- **Demo:** Mid-season, Narmada MBA projected 112–118% with the band shown.
- **Metric:** early warnings weeks before the deadline.

**F-07 Identity golden set + Splink batch dedup with explanations**
- **Problem / who:** AICTE data lead; students wrongly duplicated.
- **Why:** Accuracy is the platform's credibility.
- **Novel?:** Indian-name tuning (transliteration fold, initials, generic-token damping) plus explainable EM weights is distinctive.
- **Exists?:** Online scoring only; no golden set; no batch pass.
- **How / data:** At least 60 labelled pairs (variants, initials, order, twins, generic-name collisions, Indic script) with precision/recall in CI; nightly Splink job (DuckDB) over pseudonymised blocks producing `identity_candidates` with m/u-based weights.
- **DB / API:** `identity_candidates.model_version`.
- **Risk:** Runs centrally; pseudonymised outputs.
- **Size:** M–L.
- **Demo:** The golden-set report: P/R per threshold, twins kept below 9.
- **Metric:** precision/recall numbers instead of claims.

**F-08 Reviewer-feedback loop (decisions → labels → threshold tuning)**
- **Problem / who:** AICTE reviewers.
- **Why:** Thresholds are provisional (v3 §12).
- **Novel?:** Human-in-the-loop calibration is good practice and rare in government tooling.
- **Exists?:** Decisions are stored; unused.
- **How / data:** Decisions + outcome enum (F-02) form a labelled set; an offline report suggests threshold changes, applied by a human through rule versioning.
- **DB / API:** none beyond F-02.
- **Risk:** None.
- **Size:** S after F-02.
- **Demo:** "If threshold 9.5, FP −30%, recall −2%."
- **Metric:** FP rate trend.

**F-09 Smart spreadsheet mapping (header and code-list inference)**
- **Problem / who:** data-entry staff at low-capacity institutions.
- **Why:** The first upload fails on column names and codes, not data.
- **Novel?:** Moderate.
- **Exists?:** Static header aliases only.
- **How / data:** On upload, propose a mapping for unknown headers (string similarity to template + sample-value type detection) and value maps for code columns (e.g. "Male" → M, "B.Tech CSE" → BTECH-CSE); the user confirms; the mapping is saved per institution.
- **DB / API:** `institution_mappings`; `POST /imports/{id}/mapping`.
- **Risk:** Mappings are suggestions, never auto-applied.
- **Size:** M.
- **Demo:** Upload a messy ERP export; one confirm click → valid preview.
- **Metric:** % rows valid on first upload.

**F-10 Submission completeness tracker + reminders**
- **Problem / who:** AICTE; nodal officers.
- **Why:** Completeness by deadline is the gate-C metric (v3 §25).
- **Novel?:** No; essential.
- **Exists?:** A completion declaration exists; no tracker or reminders.
- **How / data:** Per programme-year: declared?, rows vs prior year, open errors, open flags; reminders through the outbox (email/SMS adapter later); an AICTE view by state.
- **DB / API:** none; `GET /dashboard/completeness`.
- **Risk:** Notifications carry no personal data.
- **Size:** S–M.
- **Demo:** Brahmaputra at 0/2 declared, T-7 days reminder logged.
- **Metric:** % declared by deadline.

**F-11 Computed AISHE / approval-portal export**
- **Problem / who:** institutions (enter once); AICTE/MoE.
- **Why:** AISHE collects aggregates annually (doc 05 R14); duplicate entry is a real burden.
- **Novel?:** **Yes**, as "enter once, report many".
- **Exists?:** No.
- **How / data:** Generate institution enrolment tables in the AISHE DCF shape (format to confirm: EXT) and the approval-portal enrolment summary (v3 §17 BUILD) from the register.
- **DB / API:** `GET /reports/aishe-enrolment.csv`.
- **Risk:** Small-cell suppression.
- **Size:** M.
- **Demo:** One click → AISHE-shaped CSV that reconciles to the dashboard.
- **Metric:** eliminated duplicate data entry.

**F-12 Reconciliation against declared totals**
- **Problem / who:** AICTE.
- **Why:** The bridge from today's totals to the register (v3 §18); it is also a strong demo of "what totals hid".
- **Novel?:** Moderate.
- **Exists?:** No.
- **How / data:** `declared_totals` per programme-year (upload); variance report with reason codes; unexplained variance → REVIEW.
- **DB / API:** two tables; two endpoints.
- **Risk:** None.
- **Size:** M.
- **Demo:** "Declared 60, register 68 (+8 explained by 4 provisional, 4 unexplained)".
- **Metric:** variance closure rate.

### Tier 3: advanced differentiators

**F-13 Natural-language analytics with strict scopes ("Ask the register")**
- **Problem / who:** AICTE analysts.
- **Why:** Ad-hoc questions currently need developers.
- **Novel?:** Yes, but **only safe in this design**.
- **Exists?:** No.
- **How / data:** The LLM translates the question into a **typed query object** over a whitelisted semantic layer (measures: enrolled, excess, utilisation; dimensions: state, discipline, year, institution type). The server executes it through `analytics.py` with role scope and small-cell suppression. **No free SQL; no row-level personal data**; the query object is shown to the user and audited.
- **DB / API:** `POST /analytics/ask`.
- **Risk:** Prompt injection is mitigated by the typed layer; data residency applies if a hosted LLM is used (needs approval).
- **Size:** M.
- **Demo:** "Which states have programmes over intake in management?" → table + the generated query.
- **Metric:** time-to-answer.

**F-14 Data-access anomaly detection (insider-misuse signal)**
- **Problem / who:** AICTE security; auditors.
- **Why:** The biggest real privacy threat is insiders browsing records (doc 07).
- **Novel?:** Yes for this domain.
- **Exists?:** `record.view` events exist in the audit; there is no analysis.
- **How / data:** Daily robust-z per user on record views, distinct institutions viewed, exports and off-hours access; alerts to the auditor; a student-visible access log (v3 `/me/access-log`).
- **DB / API:** none; a report endpoint.
- **Risk:** Monitoring staff needs a policy notice.
- **Size:** M.
- **Demo:** An analyst views 300 records at 02:00 → flagged.
- **Metric:** time to detect.

**F-15 Transfer workflow (institution-to-institution handover)**
- **Problem / who:** students moving; both institutions; AICTE.
- **Why:** D003 conflicts are mostly unrecorded transfers (v3 §8); today they need AICTE mediation.
- **Novel?:** Yes: a privacy-preserving handshake.
- **Exists?:** No.
- **How / data:** The new institution requests a transfer referencing the D003 flag; the old institution sees "a request from another institution" (identity withheld) and confirms TRANSFERRED_OUT with a date; the flag auto-closes as DATA_CORRECTED with both actions logged; the student is notified.
- **DB / API:** `transfer_requests`.
- **Risk:** Identity stays withheld until confirmation.
- **Size:** M.
- **Demo:** Demo B resolved by the two institutions in two clicks.
- **Metric:** median D003 resolution time.

**F-16 Signed audit checkpoints published for public verification**
- **Problem / who:** auditors; the public.
- **Why:** Tamper evidence that does not depend on trusting the DB operator.
- **Novel?:** Moderate (CT-inspired).
- **Exists?:** The chain only.
- **How / data:** An hourly checkpoint {seq, head_hash, time} signed with the platform key and written to object-lock storage plus `/audit/checkpoints` (public, contains no personal data); `verify-chain` compares against them.
- **DB / API:** `audit_anchors`.
- **Risk:** None.
- **Size:** S–M.
- **Demo:** Truncate the chain → verification reports the truncation against the published checkpoint.
- **Metric:** detects truncation (today undetectable).

### Tier 4: future ecosystem capabilities

**F-17 Institution approval credential**
- **Problem / who:** students, employers, foreign universities.
- **Why:** "Is this institution AICTE-approved for this programme and year?" is a frequent check.
- **Novel?:** Yes (EBSI accreditation-as-credential pattern, doc 05 R5).
- **Exists?:** No.
- **How / data:** AICTE signs an SD-JWT VC per programme-year approval; student credentials reference it.
- **DB / API:** `approval_credentials`.
- **Risk:** Key custody.
- **Size:** M.
- **Demo:** The verifier sees "issued by an approved institution, approval valid 2026-27".
- **Metric:** fewer letters.

**F-18 DigiLocker push of enrolment certificates**
- **Problem / who:** students; employers.
- **Why:** DigiLocker is where Indian verifiers already look (doc 05 R13).
- **Novel?:** No; high value.
- **Exists?:** No (EXT P9).
- **How / data:** Push URI per enrolment (issuer onboarding); PDF with QR to the share code.
- **DB / API:** `digilocker_pushes`.
- **Risk:** Onboarding; consent.
- **Size:** M + EXT.
- **Demo:** A sandbox only if API Setu sandbox access is granted; otherwise a labelled mock.
- **Metric:** adoption.

### Rejected ideas (and why)

| Idea | Why rejected |
|---|---|
| ML "fraud score" per institution | No labels; reputational harm; contradicts the "a flag is not fraud" principle; the transparent peer statistics already exist |
| Blockchain credential registry | No multi-writer trust problem; the status endpoint and signed checkpoints suffice |
| Facial/biometric student verification | Out of scope; DPDP minimisation; APAAR already rests on Aadhaar KYC |
| Chatbot for institutions | Low value versus guided correction messages already in place |
| Real-time Kafka streaming | Load is ~9 rows/s average (v3 §7) |

### Prioritised backlog (feature view)

| Rank | Feature | Tier | Impact | Feasibility | Differentiation | Demo-ability |
|---|---|---|---|---|---|---|
| 1 | F-01 Claims register | 1 | High | High | Med | High |
| 2 | F-03 Minor hold (R015) | 1 | High | High | Low | Med |
| 3 | F-02 Explanations + outcomes | 1 | High | High | Med | High |
| 4 | F-04 Share codes | 1 | High | High | Med | High |
| 5 | F-15 Transfer workflow | 3 | High | Med | **High** | **High** |
| 6 | F-05 Seat-advice report + widget | 2 | High | High | **High** | High |
| 7 | F-12 Reconciliation | 2 | High | Med | Med | High |
| 8 | F-07 Golden set + Splink | 2 | High | Med | High | Med |
| 9 | F-10 Completeness tracker | 2 | High | High | Low | Med |
| 10 | F-16 Signed checkpoints | 3 | Med | High | Med | High |
| 11 | F-09 Smart mapping | 2 | High | Med | Med | High |
| 12 | F-06 Forecast | 2 | Med | Med | Med | High |
| 13 | F-14 Access anomaly | 3 | Med | Med | High | Med |
| 14 | F-11 AISHE export | 2 | Med | Med (EXT format) | High | Med |
| 15 | F-08 Feedback loop | 2 | Med | High | Med | Med |
| 16 | F-13 NL analytics | 3 | Med | Med (LLM approval) | High | High |
| 17 | F-17 Approval credential | 4 | Med | Med | High | Med |
| 18 | F-18 DigiLocker push | 4 | High | Low (EXT) | Low | Low |

---

## Part B — Product and UX audit (per role)

**Method:**
- Walked every route at 1360 px and 390 px using the existing Playwright tour (64 views, no console errors) and the screenshots in `docs/screenshots/`.
- Read each page component.

Findings are about workflow, not cosmetics.

| Role | What works | Problems found | Recommendation |
|---|---|---|---|
| **AICTE administrator** | Intake and caps page; rules toggles; review queue with actions | Intake and quota changes take effect immediately with no preview or second approver; rule-severity change has no impact preview; no user administration at all | Impact preview before save (re-use the projection component); approval queue (four-eyes); user admin page |
| **AICTE monitoring officer** | National register tabs; excess alerts with seat strips; review priority with reasons | Review queue is a flat list: no assignment, no SLA age, no bulk actions, no saved filters; flag detail lacks "benign explanations"; peer stats scored on 5 institutions produce misleading signals (zero-NRI flagged) | Queue with owner, age, SLA colour; explanation panel (F-02); hide peer z when the peer group is under 8 (v3) |
| **Regional officer** | — | Role doesn't exist (v3 open item P17) | State-scoped AICTE view when AICTE confirms; trivial with a scope column on users |
| **Institution nodal officer** | Dashboard seat strips; declare submission; issue/revoke records; API keys | No staff management; no checklist of "what's left before the deadline"; the declaration has no pre-check (can declare with open errors) | Completeness tracker (F-10) and a pre-declaration checklist; staff management |
| **Data-entry operator** | Three-step upload; did-you-mean; bulk fix; leave out; template with drop-downs | 5,000-row commit is synchronous (49 s measured on PG), which risks timeouts and double-clicks; the row editor shows all 14 fields instead of the flagged ones first; no "fix next error" navigation; can't resume a correction session on another device (previews are server-side, so it works, but there's no "continue where you left off" entry) | Background commit with progress; flagged-fields-first editor; keyboard "next error"; resume card on the dashboard |
| **Student** | Own record; share with tick-boxes and QR; consent decisions; correction requests | No access log ("who verified me"); consent can't be revoked after approval; the share token is long and fragile for QR; the APAAR ID masked on the verifier side still leaks the last 4 digits | `/me/access-log`; revoke consent; share codes (F-04); drop masked APAAR unless disclosed |
| **Employer / verifier** | Public verify with check list; tamper demo; consent request | No organisation registration (any VERIFIER account); results are not exportable as a signed verification receipt; the 403 "not given consent" doesn't distinguish pending/declined (by design for privacy) and needs clearer copy | Verifier org approval (v3); a downloadable verification receipt (signed, no personal data beyond disclosed claims) |
| **Auditor** | Chain verification; filters; CSV export | Can't see anchors (none exist); no access-pattern view; audit list reads are not themselves audited | Checkpoints (F-16); access anomaly (F-14); audit reads of the audit |

**Cross-cutting UX issues:**
1. **Low bandwidth.** The JS bundle is 263 kB (78 kB gzip), which is fine. Dashboards poll every 30 s on serverless; on 2G that's wasteful. Use `ETag`/`If-None-Match` and a longer interval when the tab is hidden.
2. **Accessibility.** Focus rings and labels exist, but there's no automated axe audit, and seat strips convey state by colour. The SVG has an `aria-label` with counts (good), but the legend relies on colour, so add patterns or text for the over-intake cells.
3. **Language.** English only. A bilingual header exists, but Indian-language labels are on the roadmap only. Start with Hindi labels for the institution submission flow, which has the widest audience.
4. **Error-copy quality is already a strength:** every finding says what to do. Keep this as a test-enforced standard: each rule has remediation text, checked in CI.
