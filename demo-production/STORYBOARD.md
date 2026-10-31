# Storyboard: "One register, every seat accounted for"

- **Format:** 1920×1080, 30 fps, 16:9.
- **Main cut:** about 4–5 minutes.
- **Short cut:** about 75 s, made from scenes 0, 3, 4, 6, 8, 12 and 15.

All footage is real Playwright recordings of the running application on a freshly seeded synthetic database.

**Narration** is in [`narration/script.json`](narration/script.json), which is the single source of truth for words and timing.

**Design principles:**

| | Principle | How it is applied |
|---|---|---|
| 01 | Guide the eye | A restrained zoom towards the region being explained; a callout label next to it |
| 02 | Show where you are | A persistent chapter breadcrumb (top left) plus the role badge of the signed-in user |
| 03 | Cause and effect | Split screen when one actor's action changes another's view (commit → AICTE dashboard; Godavari vs AICTE view) |
| 04 | Explain alongside | Lower-third callouts appear *while* the action happens, never as text-only slides |
| 05 | Readable interactions | Injected cursor with click ripple, click SFX, slow typing, 300–600 ms holds after each action |
| 06 | Chapters | Six chapter cards with number, title and a one-line promise |

**Audio:**
- Kokoro voice for the base narration.
- Chatterbox re-renders it with per-line expression (exaggeration/CFG), so intonation rises at questions and outcomes and falls at explanations.
- A warm, very slow synthesised pad plus a single low sustained tone, ducked under the voice.
- SFX: mouse click, toggle, key taps, transition whoosh, success chime.

| # | Chapter | Scene | Dur. (s) | Browser actions (real) | Visual emphasis | Transition | Expected state |
|---|---|---|---|---|---|---|---|
| 0 | — | Cold open | 9 | none (Remotion title over blurred dashboard still) | logo mark, title, tricolour line draws | fade in | — |
| 1 | 01 · The problem | Why totals fail | 12 | none (motion graphics: "Totals" vs "Student-level records") | animated counters | whoosh | — |
| 2 | 02 · Sign in | Portal and roles | 12 | open login, hover accounts, click *Institution data-entry staff (Kaveri)*, press A+ then A | callout "One account per role, all synthetic" | cut | Kaveri dashboard |
| 3 | 02 · Sign in | Institution dashboard | 14 | scroll through programmes | zoom on BTECH-CSE seat strip; callout "53/60 within intake · TFW 3/3" | zoom | — |
| 4 | 03 · Submit | Upload Demo A | 16 | Upload records → choose file → Upload and check | zoom on figures 5/2/9 | cut | preview 5/2/9 |
| 5 | 03 · Submit | Guided correction | 26 | Error tab; Use this on Sanjana; edit Arun's APAAR; fix 5 others; Leave out duplicate Riya | zoom on suggestion; highlight red field → green badge | cut | 0 errors, 15 committable |
| 6 | 03 · Submit | Commit with projection + live AICTE | 16 | open dialog, Commit 15 rows; AICTE window updates | **split screen** institution ↔ AICTE national register | split | Committed 15 |
| 7 | 04 · Prevent | Seat check | 12 | Godavari seat check REGULAR ×1 | zoom on red result | cut | "exceed by 1" |
| 8 | 04 · Prevent | Upload Demo B + flags | 18 | upload, projection +4, commit, open Flags | zoom on red projection line | cut | C001 +4, C002 7/6, D003 |
| 9 | 05 · Review | Privacy-preserving conflict | 15 | open D003 as Godavari, then as AICTE | **split screen** withheld ↔ both names | split | — |
| 10 | 05 · Review | Workflow and auto-resolve | 18 | AICTE requests clarification; Godavari cancels 4; C001 history shows SYSTEM_AUTO_RESOLVED | callout on timeline | cut | C001 RESOLVED |
| 11 | 05 · Review | Review priority and identity | 16 | review priority list; identity candidates weights | callout on disclaimer | cut | — |
| 12 | 06 · Verify | Issue and share a signed record | 20 | Kaveri admin issues; student ticks 3 claims, Create share token | zoom on QR + checkboxes | cut | token created |
| 13 | 06 · Verify | Verify, tamper, revoke | 20 | paste token → Verify; Tamper → fail; revoke as admin → verify shows Revoked | green checks → red check | cut | — |
| 14 | 06 · Verify | Consent-based check | 18 | verifier request; student allows; verifier views result | callout "Only these fields" | cut | APPROVED |
| 15 | — | Audit and close | 16 | auditor: Verify chain integrity; closing card with summary | "Chain intact" zoom; end card | fade out | — |

**Short cut (≈75 s):** 0 → 3 → 4 → 5 (abridged) → 6 → 8 → 12/13 (abridged) → 15.
