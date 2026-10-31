# Frontend refinement: what changed and how it was checked

**Inputs:**
- Audit: [`01-frontend-audit.md`](01-frontend-audit.md).
- Design system: [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
- Screenshots: before in [`before/`](before/); after in [`../screenshots/`](../screenshots/). Same file names; both taken by `scripts/ui_tour.py` at 1360 px and 390 px.

## Skills used

| Asked for | Installed equivalent used | For |
|---|---|---|
| ui-ux-pro-max | `ui-ux-pro-max` | Design-system search (Swiss/minimal, AA contrast, 200 ms hover, reduced motion). Its font (Fira) and GSAP suggestions were rejected: they would replace the accessibility font and break the CSP or add a dependency. |
| frontend-design | `impeccable` and `taste-skill` (app-screen rules, `lint.mjs`, `inspect.mjs`) | Critique, the app-screen house rules, measured checks |
| brainstorming | not run as a dialogue | The brief was complete and said to implement without stopping; decisions are recorded here instead |
| webapp-testing / Playwright | `webapp-testing` pattern with the preinstalled Chromium | Tour, accessibility check, motion and scroll check |
| accessibility | no dedicated skill; covered by a scripted check plus the WCAG contrast formula | See below |
| review | `requesting-code-review` (a fresh reviewer on the diff) | Found 3 important issues, all fixed |
| verification-before-completion | `verification-before-completion` | Every claim below comes from a run in this session |

## Screens and components improved

**Every screen (through the stylesheet and shared components):**
- **Tokens:** colour, type scale, spacing, radius, shadow and motion. See the design system.
- **Contrast:** four AA failures fixed: metadata grey, amber status text, the "What's new" tag and the focus ring.
- **Cards:** quiet surfaces, with a 1 px border and no resting shadow.
- **Key figures:** one container split by hairlines; values in ink; red or amber only on a value that needs action.
- **Tables:** rules and alignment, with no zebra rows or header band; sticky headers inside scroll boxes.
- **Badges:** sentence case ("Over intake", "Verified"). The "Simulated" source marker is a dashed chip, in one style everywhere.
- **Buttons:** 40 px tall (44 px on touch), clear hover, press and disabled states. Disabled buttons no longer react to hover.
- **Forms:**
  - Every label is tied to its control, with hint and error linked by `aria-describedby` and `aria-invalid` on flagged fields.
  - A visible 3 px focus outline everywhere, white on the navy bars.
  - Placeholders at AA.
- **Loading:** pulsing skeleton lines with screen-reader text, instead of "Loading…".
- **Empty states:** a dashed panel, distinct from informational banners.
- **Shell:**
  - The What's-new strip is one line, so it no longer takes 6–8 lines on a phone.
  - Compact mobile masthead.
  - The footer sits below the first screen on short pages.
- **Motion:** 160 ms hover and focus transitions; dialogs fade and rise. Everything collapses under `prefers-reduced-motion`.

**Specific screens:**

| Screen | Change |
|---|---|
| National register, institution dashboard | "Open flags by rule" shows rule titles, with the code beneath |
| Review queue, flag detail | Rule titles instead of raw codes; flag detail heading is the rule's name with status in the subtitle; a hint explains why the actions are disabled; a real empty state when no flags match |
| Verify a record | A "What is checked" panel lists the six checks in the order the server runs them; the token box fills its card; the tick and cross icons are drawn, not text glyphs |
| Sign in | The sign-in card leads, with a navy top edge and a full-width primary button; the demo picker only when `DEMO_MODE=1` |
| Forms on 11 pages | Label association (Audit, Records, Corrections, Record detail, Flags, Identity, System access, Intake, Add student, Upload, My record, Verifier requests) |

Nothing changed in routes, API calls, authentication, the backend or the database. No dependency was added.

## Verification

**Accessibility (WCAG 2.1 AA, scripted with Playwright on 17 pages across 5 roles):**
- Every input, select, textarea, button and link has an accessible name. Before: 20 unnamed controls on 8 pages, because labels weren't associated.
- The skip link is the first Tab stop on every page after a full load.
- Every Tab stop showed a visible focus indicator (outline or ring).
- Login controls on a touch phone viewport are at least 40 px tall.
- Contrast was computed with the WCAG formula for every text token pair (table in `DESIGN_SYSTEM.md`), and checked independently by the reviewer.
- **Not run:** an axe-core scan (it would need a new dev dependency; ask if you want it) and a manual screen-reader pass.

**Motion and scrolling (scripted):**

| Check | Result |
|---|---|
| Sticky main menu stays at the top while the page scrolls | pass |
| Table header stays visible inside its scroll box | pass |
| Tabs switch panels; skip link moves focus to the main content | pass |
| No loading skeleton left after data arrives | pass |
| Reduced motion: transitions collapse to 1 ms, smooth scroll off | pass |
| Phone: menu folded, opens and closes; no sideways scroll; What's-new one line | pass |
| No console errors | pass |

**taste-skill measurements (public screens; the inspector cannot sign in):**

| | Before | After |
|---|---|---|
| `lint.mjs --app frontend/src` | 5 FAIL (emoji glyph, 4 gradients), 15 WARN | **0 FAIL**, 14 WARN (defended below) |
| `inspect.mjs --app` /status | 0 FAIL, 1 WARN | 0 FAIL, 1 WARN |
| `inspect.mjs --app` /login | 0 FAIL, 1 WARN | 0 FAIL, 1 WARN |
| `inspect.mjs --app` /verify | 0 FAIL, 1 WARN (23% colour from the footer in the first view) | 0 FAIL, 1 WARN |

The remaining warnings, with reasons:
- **colour-sprawl on phones (14–18%):** the navy gov bar and menu bar. This is the government-portal identity the brief asks for, kept on purpose.
- **"Robust":** the statistical term "robust z-score", not marketing copy.
- **Monospace:** only on IDs, rule codes and tokens, which app rules allow.
- **Shadows:** remain only on what floats or overlaps: the sticky menu, dialogs, the updates panel, toasts and the focus halo.
- **Em dashes:** mostly the "—" placeholder for missing values in tables, which app rules ask for.

**Build and tests:** see the final section of this report.

## Remaining known issues

- **Navy chrome on the phone:** it takes 14–18% of the first screen. It's the portal identity, kept deliberately.
- **Rule titles:** they arrive one request after the page, so flag lists reflow once on first load.
- **Card dividers:** cards whose heading shares a row with controls (programme cards on the institution dashboard, record detail) don't get the heading divider.
- **The What's-new strip** truncates on phones; the full text is in "All updates".
- **Signed-in screens** were checked by the tour, the accessibility script and screenshots, but not by `inspect.mjs`, which can't sign in.
- **No axe-core scan and no screen-reader pass** (see above).
