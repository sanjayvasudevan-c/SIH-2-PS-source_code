# APAAR Student Register design system

**Source of truth:** the token block at the top of [`frontend/src/styles.css`](../../frontend/src/styles.css). The shared React components are in `frontend/src/components/ui.tsx` and `SeatStrip.tsx`.

There is no UI library: one stylesheet and plain semantic HTML. The CSP (`font-src 'self'`, `style-src 'self'`) rules out web-font CDNs and CSS-in-JS runtimes, so that is a constraint as much as a choice.

## Principles

1. **Institutional, not decorative.**
   - Navy carries structure.
   - Saffron is an accent line, never a text colour on white.
   - The tricolour appears once, as a 4 px rule.
2. **Emphasis means something.**
   - Red and amber appear only when a number or row needs attention.
   - Cards are quiet; headings and status do the work.
3. **Honest data.**
   - Every figure comes from the API.
   - Simulated sources are marked with a dashed "simulated" chip, never hidden.
4. **Accessible by default.**
   - AA contrast on every text pair.
   - Visible focus.
   - 44 px touch targets on coarse pointers.
   - `prefers-reduced-motion` honoured.

## Colour

All ratios below were measured with the WCAG relative-luminance formula.

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--navy` | `#12387a` | Primary buttons, menu, page and card headings | 11.2:1 with white |
| `--navy-dark` | `#0a2556` | Gov bar, footer, hover | 11.8:1 with `#dce6f5` |
| `--navy-tint` | `#eef3fb` | Row hover, secondary-button hover | surface |
| `--saffron` | `#f37021` | Decorative rules only (page-title bar, nav underline, footer underline) | not for text |
| `--saffron-strong` | `#c2410c` | "What's new" tag, focus ring | 5.2:1 with white |
| `--ink` | `#1b2a41` | Body text | 14.9:1 on white |
| `--ink-2` | `#4a5a70` | Secondary text | 6.5:1 on page |
| `--ink-3` | `#5f6e82` | Metadata | 5.2:1 on white (was 4.37:1) |
| `--paper` | `#f3f6f5` | Page background | — |
| `--card` | `#ffffff` | Containers | — |
| `--sunken` | `#f6f8fa` | Table headers, code, empty states | — |
| `--line`, `--line-2`, `--line-strong` | `#d5dedb`, `#e7ecea`, `#b9c6c2` | Borders, dividers, form-control borders | — |

**Status colours** come as foreground, background and border triples. Each foreground is at least 5.3:1 on its background.

| Status | Foreground | Background | Use |
|---|---|---|---|
| Green | `#0f6e5c` | `#e3f1ed` | Valid, active, verified, committed, passed |
| Amber | `#8a5208` (was `#a8650f`, 4.1:1) | `#fbf0df` | Review, warning, provisional, simulated |
| Red | `#b42318` | `#fbe9e7` | Error, over intake, revoked, failed |
| Blue | `#2f5d8a` | `#e6eef6` | Open, preview, informational |

**Focus:** a 3 px `--focus` (`#c2410c`) outline, offset 2 px, with a 5 px white halo. This keeps the ring above 3:1 on both the white page and the navy menu.

## Typography

- **Families:** Atkinson Hyperlegible (400/700) for text, chosen for low-vision legibility. IBM Plex Mono for codes, roll numbers and tokens.
- **Size control:** all sizes are `rem`, so the gov bar's A−/A/A+ control scales everything.

| Token | Size | Use |
|---|---|---|
| `--fs-2xl` | 1.75rem | Key-figure values |
| `--fs-xl` | 1.375rem | Page heading (`h1`, navy, saffron left rule) |
| `--fs-lg` | 1.0625rem | Section/card heading (`h2`, navy, hairline divider beneath) |
| `--fs-md` | 0.9375rem | Body text (line-height 1.5) |
| `--fs-sm` | 0.8125rem | Supporting text, labels, table metadata |
| `--fs-xs` | 0.75rem | Badges, table headers, key-figure labels |

- **Tables:** 0.875rem body, `--fs-xs` bold headers on `--sunken`, and tabular numerals for every number column (`td.num`).
- **Rule identifiers:** shown as a readable title, with the stable code in mono beneath (`<RuleName>`).

## Spacing, shape, depth, motion

- **Spacing:** a 4 px grid: `--s-1` 4 · `--s-2` 8 · `--s-3` 12 · `--s-4` 16 · `--s-5` 20 · `--s-6` 24 · `--s-8` 32.
- **Radius:**
  - `--radius-sm` 4 px for badges.
  - `--radius` 6 px for controls.
  - `--radius-lg` 8 px for cards, figures and dialogs.
- **Shadows:**
  - `--shadow-1` for resting cards.
  - `--shadow-2` for the sign-in card.
  - `--shadow-3` for overlays (dialogs, the updates panel, toasts). No glassmorphism or gradients, apart from the faint status wash on key figures that need attention.
- **Motion:**
  - `--dur` 160 ms with `--ease` for hover and focus.
  - Dialogs rise 8 px in 200 ms; toasts 250 ms.
  - A skeleton shimmer runs while loading.
  - All of it collapses to 1 ms under `prefers-reduced-motion: reduce`.
- **Breakpoints:**
  - 900 px: 3- and 4-column grids become 2 columns; login stacks.
  - 720 px: mobile menu, single column, compact masthead, figures in 2 columns.
  - `pointer: coarse`: 44 px controls.

## Components

| Component | Class / element | Rules |
|---|---|---|
| Primary button | `button`, `.btn` | Navy fill, 40 px tall (44 px on touch), darker on hover, 1 px press. One per area. |
| Secondary button | `.secondary` | White with a strong border; navy tint on hover. Use for alternatives and downloads. |
| Danger button | `.danger` | Red. Use only for irreversible actions, always behind a `Confirm` dialog. |
| Text button | `.link` | Inline actions within prose. |
| Small button | `.small` | Row actions; 32 px (40 px on touch). |
| Input / select / textarea | native elements | 40 px, strong border; navy border plus 3 px navy glow on focus; red border with `.field.flag`. |
| Field | `<Field label hint error>` | Visible label always; hint and error sit under the control, and errors are bold red. |
| Card | `.card`, `.card.flat` | White, 1 px border, 8 px radius, shadow-1. A leading `h2` gets a divider. `.flat` is for full-bleed tables. |
| Page heading | `.pagehead` | `h1` with a saffron left rule, muted description, controls aligned right. |
| Key figures | `<Figure k v tone>` in `.figs` | Separate tiles. `tone="bad"`/`"warn"` adds a coloured left edge, a faint wash and a coloured value. Use only when the API value needs action. |
| Table | `table` in `.tablewrap` / `.scrollbox` | Sticky header inside scroll boxes, zebra rows, navy-tint hover, right-aligned tabular numbers. |
| Badge | `<Badge v>` | Status colour by value (see `TONE` in `ui.tsx`). Text is upper-case with underscores turned to spaces. |
| Simulated marker | `<Badge v="SIMULATED">` → `.b-sim` | Dashed amber outline, regular weight. It marks a data source, not a status. |
| Tabs | `<Tabs>` | `role="tablist"`/`tab`, 44 px tall, navy 3 px underline on the active tab. |
| Banner | `.banner.info/.warn/.error/.ok` | 4 px status edge on the left; `role="alert"` for errors. |
| Toast | `.banner.toast` | Fixed bottom-right so it never shifts the layout; shadow-3. |
| Empty state | `<Empty title>` | Dashed border on a sunken surface, centred. Distinct from informational banners. |
| Loading | `<Loading>` | Skeleton lines with `role="status"` and screen-reader text. |
| Dialog | `<Confirm>` (`.overlay` + `.dialog`) | Navy top edge; fades and rises in; for consequential actions. |
| Rule name | `<RuleName id>` | Title from `GET /api/v1/rules` (cached once per page load), code in mono beneath; falls back to the code. |
| Seat strip | `<SeatStrip>` | One square per seat; colour plus shape, with an `aria-label` carrying the counts. |

## Do and don't

- **Do:**
  - Use tokens, never raw hex, in new CSS.
  - Keep one primary action per card.
  - Label simulated data.
  - Put errors next to the field.
- **Don't:**
  - Add new fonts, gradients, glass effects or icon fonts.
  - Use saffron for text on white.
  - Colour a number red unless the API says it's over a limit.
  - Show fabricated statistics.
