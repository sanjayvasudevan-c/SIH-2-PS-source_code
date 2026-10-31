# Frontend design audit (before refinement)

**Basis:** the rendered app, not the code alone. Screenshots of all 33 role and route views at 1360 px and 390 px are in [`before/`](before/), taken by `scripts/ui_tour.py` on commit `d936114`. I also read the code: `frontend/src/styles.css` (237 lines, the only stylesheet), `components/ui.tsx`, `components/SeatStrip.tsx`, `App.tsx` and the 23 pages.

**Stack:** React 18, Vite 5, hash routes, one global CSS file, no UI library. Fonts are self-hosted Atkinson Hyperlegible (body) and IBM Plex Mono (codes), served under a CSP of `font-src 'self'`.

## What already works and should stay

| Area | Why it should stay |
|---|---|
| Government-portal shell | Already in place: gov bar with text-size control, tricolour rule, bilingual masthead, navy main menu with a saffron underline, three-column footer. It reads as institutional without copying a real government site, and it uses an original logo with no emblem or seal. |
| Atkinson Hyperlegible | Designed for low-vision legibility, which suits a national public service. |
| Focus ring | 3 px saffron `:focus-visible` outline on every control. |
| Seat strips | Original and data-true visual for intake and caps. They carry `aria-label` counts. |
| Honest labelling | SIMULATED badges, the "synthetic data" pill, "not an official website" in the gov bar and footer. |
| Guided correction copy | Every finding says what to do next. |
| Responsive basics | 0 horizontal overflow at 390 px (tour-verified); collapsible menu on mobile. |

## Problems found

Highest-priority screens first.

| # | Where | Problem | Effect on the user |
|---|---|---|---|
| A1 | Flags list and detail, national and institution "Open flags by rule" | Raw rule IDs (`C001_EXCESS_INTAKE`, `R015_MINOR_GUARDIAN_CONSENT`) are used as titles and link text | Officers must decode identifiers. The flag detail page heading is a code, not a sentence. |
| A2 | Every card | 3 px navy top border on every card, plus a navy heading | Heavy and repetitive. Nothing stands out because everything is emphasised. |
| A3 | KPI "figures" strip | Tiles look identical whether the number is good or needs action; small labels | The most important numbers (seats over intake, open flags) don't lead the eye. |
| A4 | "What's new" strip | Shows the full text of the latest notification and wraps to 6–8 lines on mobile | On a 390 px screen it pushes the page title below the fold. |
| A5 | Flag detail actions | Buttons are disabled until a note is typed, with no explanation | Looks broken; the reason is invisible. |
| A6 | Loading | Plain "Loading…" text | Layout jumps when data arrives; feels unfinished. |
| A7 | Empty states | Plain blue info banner, the same style as notices | Empty and informational look alike. |
| A8 | Records table | Every row repeats a full SIMULATED badge next to VERIFIED | Visual noise in the densest screen. The label belongs on the check, not repeated loudly per row. |
| A9 | Buttons | Small buttons are 26 px tall; pagination and row actions are below the 44 px touch target on mobile | Hard to tap. |
| A10 | Tabs | 1 px underline in the text colour; inactive tabs low contrast | The active tab is weakly signalled. |
| A11 | Tables | Header row barely distinct from body; no zebra or hover cue beyond near-white | Scanning wide tables is tiring. |
| A12 | Mobile masthead | Logo, title, subtitle, pill and sign-out stack into about 200 px before the menu | Content starts very low. |
| A13 | Tokens | Only colours and one radius are tokens. Spacing, type sizes, shadows and motion are hard-coded | Inconsistencies accumulate. |
| A14 | Motion | Only the toast animates; no reduced-motion handling | Fine, but no shared transition timing for hover and focus. |
| A15 | Login | Sign-in card and demo-account card have equal weight | The primary task (sign in) doesn't dominate. |

## Missing

- Readable rule names everywhere.
- Skeleton loading.
- A distinct empty-state style.
- Spacing, type, shadow and motion tokens.
- Larger touch targets on small screens.
- A `prefers-reduced-motion` rule.
- Design-system documentation.

## Deliberately unchanged

- Information architecture, routes, role menus, API calls and business logic.
- The brand palette (navy, saffron, tricolour). No new fonts and no UI library: the CSP and the "don't rebuild" brief both rule them out.
- The seat-strip visual language.

## Priority order for implementation

1. Design tokens and base components (A2, A3, A6, A7, A9, A10, A11, A13, A14). One stylesheet change improves every screen.
2. Readable rule names (A1) across flags and both dashboards.
3. Shell: What's-new truncation and mobile masthead (A4, A12).
4. Flag detail actions (A5), the records table (A8) and login emphasis (A15).
