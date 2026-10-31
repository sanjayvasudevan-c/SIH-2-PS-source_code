# Prototype Completion (40–50% of v3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the SIH26263 hackathon prototype at about 40–50% of the v3 architecture. All core slices are implemented and tested, every status claim is checked by a script, and nothing beyond what the prototype needs is added.

**Architecture:**
- The existing FastAPI modular monolith and the single validation engine stay as they are.
- This plan closes the defects that would make the demo wrong or unsafe: false claims, the upload bomb, auth leaks, missed excess flags under concurrency, minors, and serverless limits.
- It adds one honesty mechanism: a claims register shown on a public status page and enforced in CI.
- No new infrastructure (no Redis, workers or migrations).

**Tech Stack:** Python 3.12 / FastAPI 0.162 / SQLAlchemy 2.1 / pytest; React 18 + TypeScript 5.6 + Vite 5; SQLite and PostgreSQL 16; GitHub Actions.

**Spec:**
- `docs/ARCHITECTURE.md`: what is built now.
- `docs/architecture-audit/09-implementation-roadmap.md`: P0 items.
- `docs/architecture-audit/07-security-and-privacy-assessment.md`: S1, S2, S5 and S17.

## What "40–50%" means here

The prototype already implements the v3 core slices:
- intake → engine → seat ledger → identity → flags → credentials → verification → audit → dashboards.

This plan adds **only** what the prototype needs to be correct, honest and safe to demo.

| In this plan (required for the prototype) | Explicitly out (v3 / audit items deferred to pilot) |
|---|---|
| T1 Claims register + `/system/status` | Alembic migrations, background jobs, outbox, webhooks |
| T2 Upload bomb + streaming row cap | Same-transaction audit, signed checkpoints |
| T3 Login timing fix + `DEMO_MODE` gate | Share codes, key registry, status lists |
| T4 Capacity-check lock (no missed C001 under concurrency) | Versioned rule sets, explanation objects |
| T5 R015 guardian-consent hold for minors | Splink batch identity, golden set |
| T6 Serverless row cap (`MAX_UPLOAD_ROWS`) | Refresh-cookie sessions, MFA, RLS |
| T7 CI workflow | Transfers, reconciliation, AISHE, forecasting, NL analytics |
| T8 Docs, full verification, optional deploy | All real government integrations |

## Global Constraints

- **Data:** synthetic data only. Every APAAR check stays labelled `SIMULATED`.
- **Wording:** never use the word "fraud" in code, UI or docs. A flag means "a person should look".
- **Messages:** every error tells the user what to do next. Use the existing `ApiError(status, message, **extra)` shape.
- **Dependencies:** no new runtime packages. `pyyaml` is already installed (it comes with `uvicorn[standard]`); pin it as `pyyaml==6.0.3` in `requirements.txt` because T1 imports it directly.
- **Schema:** no migrations. New columns rely on `create_all` and a reseed (`python -m app.seed --reset`). Deployments use a fresh database.
- **Writes:** the validation engine (`modules/engine.py`) remains the only writer of `students` and `enrolments`. Tests may insert directly.
- **Tests:** every task passes `pytest -q` on SQLite **and** with `TEST_DATABASE_URL=postgresql+psycopg://…` (PG16), plus `ruff check backend scripts api` and `cd frontend && npx tsc --noEmit`.
- **Claims:** never claim a test passed without running it. Record real outputs in `docs/TEST_REPORT.md` (T8).
- **Production:** do not deploy or change production settings without explicit user approval (T8 step 6).

## Approvals needed before execution

1. Pin `pyyaml==6.0.3`. It is already installed; nothing is downloaded.
2. Add `.github/workflows/ci.yml` (T7).
3. Demo behaviour changes:
   - The login picker appears only when `DEMO_MODE=1`. `make run`, `make dev` and docker-compose set it.
   - Diploma students under 18 without recorded guardian consent are held from consent-based verification and from sharing.
4. Optional T8 deploy: needs Neon attached to the Vercel project `apaar-student-register`, with `DEMO_MODE=1` and `MAX_UPLOAD_ROWS=1000` set as env vars.

## Review Focus

1. **XLSX with thousands of formatted-but-empty trailing rows.** Users expect it to be accepted: the cap counts non-empty rows only. Test in T2: `test_xlsx_blank_trailing_rows_accepted`.
2. **Exactly-at-limit uploads.** 5,000 data rows is accepted; 5,001 gets a 413 that names the limit. Test in T2: `test_row_cap_boundary`.
3. **A student whose 18th birthday is today, or born on 29 Feb.** They are not a minor on their birthday. A 29-Feb DOB turns 18 on 1 Mar in non-leap years. Test in T5: `test_minor_boundary_dates`.
4. **Guardian-consent column spellings.** `Y`, `YES`, `TRUE`, `1` (any case) mean recorded. `N`, `NO`, `FALSE`, `0` and blank mean not recorded. Anything else is an R002 format error. Test in T5: `test_guardian_consent_parsing`.
5. **`DEMO_MODE` unset.** The login page still renders and works with typed credentials, with no console error. Covered in T3 step 6 by the UI tour run with `DEMO_MODE=0`.

---

### Task 1: Claims register, checker and public status page

**Files:**
- Create: `backend/app/feature_status.yaml` (inside `backend/app/` so Vercel's `includeFiles: backend/app/**` ships it; no `vercel.json` change)
- Create: `scripts/check_claims.py`
- Create: `backend/app/modules/api_system.py`
- Create: `frontend/src/pages/SystemStatus.tsx`
- Modify: `backend/app/main.py:58-61` (register router), `frontend/src/App.tsx` (public route `/status` + footer link), `requirements.txt` (pin `pyyaml==6.0.3`)
- Test: `backend/tests/test_claims.py`

**Interfaces:**
- Produces:
  - **YAML schema:** a top-level list. Each item has:
    - `id` (kebab-case, unique);
    - `title`;
    - `status`, one of `PROTOTYPE` | `SIMULATED` | `NOT_BUILT` | `EXTERNAL`;
    - `routes` (list of `"METHOD /path"`, e.g. `"POST /api/v1/imports"`);
    - `tests` (list of `"backend/tests/test_x.py::test_name"`);
    - `note` (optional).
  - `scripts/check_claims.py`:
    - `load_claims(path: Path) -> list[dict]`
    - `check(claims: list[dict], routes: set[str], repo_root: Path) -> list[str]`, which returns error strings; an empty list means OK.
    - `main() -> int`: exits 1 on errors and prints each one.
  - **`check()` rules:**
    - duplicate `id`;
    - unknown `status`;
    - a `PROTOTYPE` or `SIMULATED` claim with no `tests`;
    - a listed route that is not in `routes`;
    - a listed test whose file is missing, or whose function isn't defined in it (found with `ast`);
    - a `NOT_BUILT` or `EXTERNAL` claim listing routes.
  - `GET /api/v1/system/status` (public): `{"generated_from": "feature_status.yaml", "counts": {status: n}, "claims": [...]}`.
- **YAML content:**
  - One `PROTOTYPE` or `SIMULATED` entry per capability in `docs/ARCHITECTURE.md` §§7–22, with real routes and test ids.
  - One `NOT_BUILT` or `EXTERNAL` entry per row of §27.
  - `apaar-registry-check` is `SIMULATED`.
  - T5's `minor-guardian-consent` entry is added in T5.

- [ ] **Step 1: Write the failing tests** in `backend/tests/test_claims.py`:
  - `test_checker_rejects_unknown_route`: `check([{"id":"x","title":"t","status":"PROTOTYPE","routes":["GET /api/v1/nope"],"tests":["backend/tests/test_claims.py::test_checker_rejects_unknown_route"]}], {"GET /api/v1/health"}, ROOT)` returns a list containing a string with `"GET /api/v1/nope"`.
  - `test_checker_rejects_missing_test_and_untested_prototype`: a missing test function → an error naming it; a `PROTOTYPE` with `tests: []` → an error containing `"no tests"`.
  - `test_checker_rejects_routes_on_not_built`.
  - `test_real_register_is_consistent`: `check(load_claims(app/feature_status.yaml), app_route_set, ROOT) == []`, where `app_route_set` is built from `app.routes` as `f"{method} {path}"` without HEAD.
  - `test_status_endpoint_public(client, seeded)`: an anonymous `GET /api/v1/system/status` returns 200; `counts["SIMULATED"] >= 1`; every claim has `id`, `title` and `status`.

- [ ] **Step 2: Run them and confirm they fail.** Run `cd backend && ../.venv/bin/pytest tests/test_claims.py -q`. Expected: FAIL (module `check_claims` not found). Import it by adding `scripts/` to `sys.path` in the test.

- [ ] **Step 3: Implement** `scripts/check_claims.py`, `feature_status.yaml`, `api_system.py`, the route registration and the requirements pin. The endpoint reads the YAML once at import.

- [ ] **Step 4: Run the tests and confirm they pass.** Run `cd backend && ../.venv/bin/pytest tests/test_claims.py -q && cd .. && .venv/bin/python scripts/check_claims.py`. Expected: 5 passed; the script prints `claims OK (N entries)` and exits 0.

- [ ] **Step 5: Build the frontend page.** `SystemStatus.tsx` shows:
  - a count tile per status;
  - a table with title, status badge (reuse `ui.tsx` badge styles), routes and tests.

  The route `/status` needs no login. Add a "System status" link in the footer. Run `npx tsc --noEmit`; it should pass.

- [ ] **Step 6: Commit** with `feat: claims register with checker and public /system/status page`.

### Task 2: Upload hardening (zip bomb, entity bomb, streaming row cap)

**Files:**
- Modify: `backend/app/modules/intake.py:47-93` (`parse_upload`)
- Test: `backend/tests/test_imports.py` (append)

**Interfaces:**
- Consumes: `settings.max_upload_rows` (T6 makes it configurable; the name is unchanged).
- Produces:
  - `parse_upload(filename: str, content: bytes) -> list[dict]`, same signature.
  - New module constants: `MAX_XLSX_UNCOMPRESSED = 50 * 1024 * 1024` and `MAX_XLSX_RATIO = 100`.

- [ ] **Step 1: Write the failing tests.** Fixtures are built in-test with `zipfile` / `openpyxl`; nothing is committed to `sample_data/`.
  - `test_xlsx_zip_bomb_rejected`:
    - Build a zip with `[Content_Types].xml` and `xl/worksheets/sheet1.xml` holding 60 MB of spaces (deflated).
    - Expect `parse_upload("b.xlsx", data)` to raise `ApiError` with status 413 and `"too large when unpacked"` in the message, in under 2 s.
  - `test_xlsx_doctype_rejected`: a valid template workbook whose `sheet1.xml` is rewritten to start with `<!DOCTYPE x [<!ENTITY a "aaaa">]>` → 422, message contains `"cannot be read safely"`.
  - `test_row_cap_boundary`: a CSV with header + 5,000 rows → returns 5,000 rows; with 5,001 rows → 413 whose message contains `"5000"`.
  - `test_xlsx_blank_trailing_rows_accepted`: an XLSX with 3 data rows, then rows 4–3,000 with only a cell fill style and no values → returns 3 rows.
  - `test_xlsx_rows_streamed_not_materialised`: monkeypatch the cap to 10 and use an XLSX with 50 data rows → 413 raised. Assert the iterator stopped early by wrapping `ws.iter_rows` in a counter that records under 15 rows yielded.

- [ ] **Step 2: Run them and confirm they fail.** Run `pytest tests/test_imports.py -q -k "bomb or doctype or boundary or blank_trailing or streamed"`. Expected: bomb, doctype and streamed FAIL; the boundary and blank tests may already pass.

- [ ] **Step 3: Implement** in `parse_upload`:
  - **Before openpyxl:** open with `zipfile.ZipFile`.
    - Reject with 413 if the sum of `file_size` exceeds `MAX_XLSX_UNCOMPRESSED`, or `file_size / max(compress_size, 1) > MAX_XLSX_RATIO` for any member. Message: *"This workbook is too large when unpacked. Save it again from Excel, or use the CSV template."*
    - Reject with 422 if any `xl/**/*.xml` member's first 2 KB contains `b"<!DOCTYPE"`. Message: *"This workbook cannot be read safely. Save it again from Excel and retry."*
  - **Rows:** replace both `raw_rows = [...]` / `list(reader)` with one loop. Skip empty rows, count non-empty ones, and raise the existing 413 as soon as the count exceeds `settings.max_upload_rows`.

- [ ] **Step 4: Run the tests and confirm they pass.** Run `pytest tests/test_imports.py -q`. Expected: all pass, including the existing ones.

- [ ] **Step 5: Commit** with `fix(intake): reject zip/entity bombs and stop reading at the row cap`.

### Task 3: Login timing fix and `DEMO_MODE` gate

**Files:**
- Modify:
  - `backend/app/config.py:51-70`: add `self.demo_mode = os.environ.get("DEMO_MODE", "0") == "1"`.
  - `backend/app/modules/api_auth.py:49-93`.
  - `backend/app/modules/api_registry.py:50-53`: add `"demo_mode": settings.demo_mode` to `client_config()`.
  - `backend/tests/conftest.py`: `os.environ["DEMO_MODE"] = "1"`.
  - `Makefile` (`run`, `dev`: prefix `DEMO_MODE=1`).
  - `docker-compose.yml` (`DEMO_MODE: "1"`).
  - `frontend/src/pages/Login.tsx:18`.
- Test: `backend/tests/test_security.py` (append)

**Interfaces:**
- Produces:
  - `settings.demo_mode: bool`.
  - `GET /api/v1/config` includes `demo_mode`.
  - `GET /api/v1/auth/demo-accounts` returns 404 `"Not found."` when `demo_mode` is false.

- [ ] **Step 1: Write the failing tests.**
  - `test_unknown_email_runs_password_hash(client, seeded, monkeypatch)`: wrap `app.modules.api_auth.verify_password` with a call counter. A POST login with `nobody@example.org` / `x` returns 401 and the counter is 1.
  - `test_demo_accounts_hidden_without_demo_mode(client, seeded, monkeypatch)`: `monkeypatch.setattr(settings, "demo_mode", False)` → `GET /api/v1/auth/demo-accounts` is 404 and `GET /api/v1/config` returns `demo_mode: false`. With `True` → 200 and a non-empty list.
  - `test_unknown_and_wrong_password_same_message`: both 401 bodies have the same `message`.

- [ ] **Step 2: Run them and confirm they fail.** Run `pytest tests/test_security.py -q -k "hash or demo_mode or same_message"`. Expected: the first two FAIL.

- [ ] **Step 3: Implement.**
  - In `api_auth.py`, add `_DUMMY_HASH = hash_password(secrets.token_hex(16))`, computed lazily on first use and cached in a module global.
  - When `user is None or not user.active`, call `verify_password(body.password, _DUMMY_HASH)` before raising 401.
  - Gate `demo_accounts` on `settings.demo_mode`.

- [ ] **Step 4: Run the tests and confirm they pass.** Run `pytest tests/test_security.py -q`. Expected: all pass.

- [ ] **Step 5: Update the frontend.** `Login.tsx` fetches `/api/v1/config` first and requests `/auth/demo-accounts` only when `demo_mode` is true. Otherwise it renders the email/password form with no picker. Run `npx tsc --noEmit`; it should pass.

- [ ] **Step 6: Verify the UI both ways.**
  - Build and run with `DEMO_MODE=0 make run`, run `make tour`, and expect 0 console errors.
  - Repeat with `make run` (DEMO_MODE=1).

- [ ] **Step 7: Commit** with `fix(auth): constant-work login and DEMO_MODE-gated demo accounts`.

### Task 4: Capacity-check lock so concurrent commits cannot miss C001/C002

**Files:**
- Modify: `backend/app/modules/issues.py:102-110` (`run_capacity_checks`)
- Test: `backend/tests/test_ledger.py` (append)

**Interfaces:**
- Consumes: `ledger.position(db, programme_id, academic_year)` (unchanged).
- Produces: `run_capacity_checks(db, programme_id, academic_year, actor=None) -> dict`, with the same signature and return value. It now takes a row lock on the matching `approved_intakes` row first.

- [ ] **Step 1: Write the failing test** `test_concurrent_commits_cannot_miss_excess_flag`. Mark it `@pytest.mark.skipif(not os.environ.get("TEST_DATABASE_URL","").startswith("postgresql"), reason="row locks need PostgreSQL")`.
  1. Pick a seeded programme-year with no open C001 and set its intake to the current within-intake count + 1. Commit.
  2. In session A, insert one REGULAR ACTIVE enrolment for a new synthetic student and call `run_capacity_checks`. Don't commit.
  3. In a thread, session B does the same with another student. Sleep 0.5 s, then commit A and join B. B then commits.
  4. Assert exactly one OPEN `C001_EXCESS_INTAKE` issue with `subject_key == f"{programme_id}:{year}"`, and `evidence["position"]["excess_over_intake"] == 1`.

- [ ] **Step 2: Run it and confirm it fails.** Run `TEST_DATABASE_URL=postgresql+psycopg://… pytest tests/test_ledger.py -q -k concurrent`. Expected: FAIL (no open C001), because both sessions counted intake = enrolled.

- [ ] **Step 3: Implement.** At the start of `run_capacity_checks`, after `db.flush()`:

  ```python
  db.execute(
      select(ApprovedIntake.id)
      .where(ApprovedIntake.programme_id == programme_id,
             ApprovedIntake.academic_year == academic_year)
      .with_for_update()
  )
  ```

  SQLAlchemy omits `FOR UPDATE` on SQLite, so SQLite behaviour is unchanged. B's later `COUNT` runs after A commits and, under READ COMMITTED, sees A's row.

- [ ] **Step 4: Run the tests and confirm they pass.** Run `pytest tests/test_ledger.py -q` on both SQLite and PG. Expected: all pass; the concurrent test is skipped on SQLite.

- [ ] **Step 5: Commit** with `fix(ledger): lock programme-year intake row during capacity checks`.

### Task 5: R015 guardian-consent hold for minors

**Files:**
- Modify:
  - `backend/app/models.py:127-156`: `Student.guardian_consent_recorded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)`.
  - `backend/app/modules/normalize.py`: add `"guardian_consent_recorded"` to `TEMPLATE_COLUMNS` and `OPTIONAL_COLUMNS`; aliases `"guardian consent"` and `"parental consent"`.
  - `backend/app/modules/rules.py`: catalogue entry.
  - `backend/app/modules/engine.py`: add the field to `STUDENT_FIELDS` and `_row_rules`; add R015 to the REVIEW list in `_open_review_issues`.
  - `backend/app/modules/api_verification.py:133-147` (`consent`).
  - `backend/app/modules/api_students.py:54-66` (`present`).
  - `backend/app/seed.py`: every generated row sets `guardian_consent_recorded` to `Y`. Note that `_birth_years` makes some UG students 17 as well as all diploma students. The exceptions are two named Brahmaputra DIP-ME demo students (DOB 2010), whose value is left blank. Issue a credential for one of them, the same way `seed.py` L407 does for Kaveri.
  - `backend/app/modules/api_records.py:191`: add `"guardian_consent_recorded"` to `MASTER_FIELDS` so institution corrections can set it (it goes through the engine with a reason).
  - `backend/app/feature_status.yaml`: entry `minor-guardian-consent`, `PROTOTYPE`, with routes and tests.
- Test: `backend/tests/test_rules.py`, `backend/tests/test_credentials.py` (append)

**Interfaces:**
- Produces:
  - `is_minor(dob: date, on: date) -> bool` in `engine.py`: true while age < 18, computed with the existing `_age`.
  - `parse_consent_flag(value: str) -> bool | None` in `normalize.py`: `None` means invalid.
  - **Catalogue entry:**
    - id `R015_MINOR_GUARDIAN_CONSENT`
    - severity `REVIEW`
    - stage `ROW`
    - title *"Student under 18 without recorded guardian consent"*
    - remediation *"Record the parent or guardian's consent (Y in guardian_consent_recorded) before the record is shared or verified."*
    - not locked
  - **Hold message:** 409 with *"This student is under 18 and the institution has not recorded guardian consent. The institution must record it before the record can be shared or verified."* `extra={"held": "R015"}`.

- [ ] **Step 1: Write the failing tests.**
  - `test_guardian_consent_parsing`: each of `Y`, `yes`, `TRUE`, `1` → True; `N`, `no`, `false`, `0`, `""` → False; `maybe` → None. A row with `maybe` gets an `R002_FORMAT` finding on field `guardian_consent_recorded`.
  - `test_minor_boundary_dates` (with `APAAR_TODAY=2026-10-27` from conftest):
    - DOB `2008-10-27` → not a minor;
    - `2008-10-28` → minor;
    - `2008-02-29` on `2026-02-28` → minor, and on `2026-03-01` → not.
  - `test_r015_review_for_minor_without_consent`: a valid DIP-ME row with DOB 2010-01-01 and a blank flag → finding `R015_MINOR_GUARDIAN_CONSENT` with severity REVIEW. With `Y` → no R015. An adult DOB → no R015.
  - `test_minor_held_from_share_and_consent` (`test_credentials.py`):
    - Log in as one of the 2 seeded minors without consent.
    - `POST /me/credentials/{id}/present` → 409 with `held == "R015"`.
    - Approving a pending verification request → 409. Denying it still returns 200.
    - After an institution `PATCH /enrolments/{id}` sets `guardian_consent_recorded: "Y"` with a reason, `present` returns 200.

- [ ] **Step 2: Run them and confirm they fail.** Run `pytest tests/test_rules.py tests/test_credentials.py -q -k "guardian or minor or r015"`. Expected: FAIL.

- [ ] **Step 3: Implement the model column, parser, rule and engine changes.** R015 is evaluated only when DOB parses and there are no R010 errors.

- [ ] **Step 3b: Check the seeded flags.** Run `python -m app.seed --reset`. Expect exactly 2 open `R015_MINOR_GUARDIAN_CONSENT` flags, both at Brahmaputra.

- [ ] **Step 4: Implement the holds** in `consent` (APPROVE only) and `present`. Load the student and check `is_minor(st.date_of_birth, today()) and not st.guardian_consent_recorded`.

- [ ] **Step 5: Run the tests and confirm they pass.**
  - Run `pytest -q`; expect all pass.
  - Then `python -m app.seed --reset` and `make demos`. Expect 29/29. If a demo check counted flags, update its expected count in `scripts/run_demos.py` and note the reason in the commit body.
  - Run `scripts/check_claims.py`; expect OK.

- [ ] **Step 6: Commit** with `feat(rules): R015 guardian-consent hold for students under 18`.

### Task 6: Configurable row cap for serverless

**Files:**
- Modify:
  - `backend/app/config.py:66`: `self.max_upload_rows = int(os.environ.get("MAX_UPLOAD_ROWS", "1000" if ON_VERCEL else "5000"))`.
  - `backend/app/modules/api_registry.py` `client_config()`: add `"max_upload_rows"`.
  - `frontend/src/pages/Upload.tsx:53`: label uses the config value.
- Test: `backend/tests/test_platform.py` (append)

**Interfaces:**
- Produces: `GET /api/v1/config` → `max_upload_rows: int`.

- [ ] **Step 1: Write the failing test** `test_config_exposes_row_cap`: `GET /api/v1/config` returns `max_upload_rows == settings.max_upload_rows`. With `monkeypatch.setattr(settings, "max_upload_rows", 3)`, a 4-row CSV upload → 413 whose message contains `"3"`.
- [ ] **Step 2: Run it and confirm it fails.** Run `pytest tests/test_platform.py -q -k row_cap`. Expected: FAIL (key missing).
- [ ] **Step 3: Implement** the config value and label: *"File (.xlsx or .csv, up to 2 MB and {n.toLocaleString("en-IN")} rows)"*.
- [ ] **Step 4: Run the tests and confirm they pass.** Run `pytest -q` and `npx tsc --noEmit`. Expected: pass.
- [ ] **Step 5: Commit** with `feat(config): MAX_UPLOAD_ROWS, 1000 on Vercel to stay inside the 60 s function limit`.

### Task 7: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- **Jobs:**
  - **`backend`:**
    - ubuntu-latest, Python 3.12, service `postgres:16` (`POSTGRES_PASSWORD=postgres`, health check).
    - Steps: `pip install -r requirements-dev.txt`; `ruff check backend scripts api`; `cd backend && pytest -q` (SQLite); `TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/postgres pytest -q`; `python scripts/check_claims.py`.
  - **`frontend`:** Node 22; `cd frontend && npm ci && npx tsc --noEmit && npm run build`.
- Triggers: `push` and `pull_request`.

- [ ] **Step 1: Validate locally.** Run every command in the workflow from a clean shell, with PG16 running locally. Expected: all exit 0. Record the timings for T8.
- [ ] **Step 2: Commit and push** with `ci: lint, tests on SQLite and PostgreSQL 16, claims check, frontend build`.
- [ ] **Step 3: Check the result.** Read the GitHub Actions run with the `mcp__github__actions_list` tools. Expected: both jobs green. If red, follow superpowers:systematic-debugging and fix before T8.

### Task 8: Documentation, full verification, optional deploy

**Files:**
- Modify:
  - `README.md`: a features/status section linking `/status`; `DEMO_MODE` and `MAX_UPLOAD_ROWS` env vars.
  - `docs/ARCHITECTURE.md`: §4 settings, §6 gaps, §8 add R015, §9 hardening, §10 lock, §24 CI, §27 rows now done.
  - `HANDOFF.md`.
  - `docs/TEST_REPORT.md`.
- Do not modify `docs/architecture-audit/*` (point-in-time audit) or the v3 PDF.

- [ ] **Step 1: Run the full verification and record the real outputs in `docs/TEST_REPORT.md`.**
  - `ruff check backend scripts api`
  - `npx tsc --noEmit`
  - `pytest -q` on SQLite and PG16
  - `scripts/check_claims.py`
  - `python -m app.seed --reset && make demos`
  - `make tour` with `DEMO_MODE=1` and `DEMO_MODE=0`

  Expected: everything green. Test counts are ≥ 109 + the new tests.
- [ ] **Step 2: Update the docs** listed above. Every capability sentence must match `feature_status.yaml`; `check_claims.py` must still pass.
- [ ] **Step 3: Review.** Use superpowers:requesting-code-review on the whole branch diff since `ab6b53a`, and fix the findings.
- [ ] **Step 4: Commit and push** with `docs: prototype status, settings and verified test report`.
- [ ] **Step 5 (only with user approval):** deploy to Vercel project `apaar-student-register`.
  - Preconditions: Neon is attached, the database is **fresh**, `DEMO_MODE=1` and `MAX_UPLOAD_ROWS=1000` are set.
  - Afterwards, smoke-test `/api/health`, `/api/v1/system/status`, a login and a 100-row upload. Expected: all 200.
  - If the database already has tables from an earlier attempt, stop and ask: `create_all` does not add `students.guardian_consent_recorded` to an existing table.
