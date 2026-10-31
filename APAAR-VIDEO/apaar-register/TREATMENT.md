# APAAR Student Register: treatment

**Style:** Living Screencast (Lemo-Opuscar), with one change the user chose: the mascot is **hand-painted** (gouache and watercolour on paper) instead of a pixel sprite. The clash of two resolutions remains, as **two materials**: a soft, boiling, hand-painted character inside a crisp, vector-sharp government interface. Every other invariant of `STYLE.md` holds:
- the real UI, redrawn in HTML using the app's own stylesheet;
- the cursor is the user and the mascot is the software;
- the mascot stands only on the top edges of measured DOM elements;
- information layers only (chapter pill, key HUD, caption pill, ×N tag);
- zoom ≥ 1, and cuts only under chapter transitions.

**Format:**
- 240 s, 1920×1080, 30 fps (the master prompt fixes 30 fps).
- English voice: the existing Chatterbox narration, 12 segments, 416 words, fact-checked against the code.
- Burned-in captions plus `.srt`.
- −14 LUFS.
- No voice change: the script's start times are the timeline's skeleton.

## 1. Three candidate structures

1. **One record's journey.** The mascot is one student's record. It is born as a row in a spreadsheet, gets checked, is counted in a seat, is questioned as a possible duplicate, is signed and shared, is verified, and is finally written into the audit chain. One subject, one goal: to be counted and believed.
2. **A day at the register.** Morning upload, afternoon seat checks, evening verification. The light and theme shift with the hour. This is pretty, but the problem (totals hide students) has no character to carry it.
3. **The race.** A split screen of the old way (a letter, a stamp, a wait) against the register. It is strong for 20 s but monotonous for four minutes, and it would invent an old-way process we cannot show honestly.

**Chosen: 1, one record's journey.** The problem scene is the record's own problem: it disappears into a total. Every feature then becomes something that happens *to* this record, so the walkthrough has a protagonist instead of a feature list. It ends differently from how it began: lost in a number at the start, verifiable by anyone at the end.

## 2. Logline and arc

*A student's record, lost inside a declared total, finds its way into one register where it is checked, counted, protected and finally believed.*

- **Setup (0–50 s):** the record is a painted paper slip inside a giant number "60", invisible. It gets counted twice and waits for a letter.
- **Turn (50–70 s):** the number cracks open into a register of individual rows, and the slip finds its own row.
- **Development (70–190 s):** the walkthrough, with the mascot acting out each feature.
- **Ending (190–240 s):** the mascot rides a data pulse through the architecture, then lands on the title, which appears as a real UI element. The window settles as the mascot sleeps on its own verified record.

## 3. The mascot: "Chitti"

An original character: a **hand-painted saffron admission slip**.
- **Body:** a small rectangle of paper with a folded top-right corner. It is painted in warm saffron gouache (#F37021 into #C2410C at the edges), with paper grain showing through and a slightly uneven, wet-edge outline in navy ink.
- **Face:** two ink-dot eyes on a cream label patch, and a small brush-stroke mouth.
- **Limbs and identity:** two thin ink-line legs and arms that end in rounded nubs. There are no hands, because the cursor is the user's hand. A tiny APAAR-ID stripe (three painted dashes) runs across its middle.
- **Look of the line:** the outline "boils" on twos (redrawn with seeded jitter every 2 frames) so it feels painted, while position and camera stay smooth every frame.
- **Name:** *chitti* means a note or letter in several Indian languages. The name is used only in this document, never on screen.
- **Colour:** saffron is the only hue no UI element fills with (the app uses saffron only for thin rules), so the mascot finds the eye in every frame.

## 4. Benchmark

- **Apple "Guided Tour" product videos.** *Learn:* one feature per sentence, a calm voice, a real interface at full sharpness, and push-ins that wait for the narration. *Don't take:* its UI, music or typography.
- **Hand-painted 2D characters over clean graphic worlds** (picture-book animation, e.g. painted shorts that put gouache characters on flat, designed sets). *Learn:* the material contrast, boiling lines on twos and squash-and-stretch with a soft wet edge. *Don't take:* any character design, shot or palette.

## 5. Shot list

| # | Time | Framing | Camera | What happens | Why |
|---|------|---------|--------|--------------|-----|
| 1 | 0–3 | Close | Locked | A blinking caret in an empty "Declared admissions" field. The cursor types **60**, which swells to fill the frame as a painted numeral. | Hook: a total, typed by a hand, eats the screen |
| 2 | 3–10 | Wide → medium | Slow push | Inside the painted "60", dozens of slips are packed like bricks; one (Chitti) blinks. | We meet the protagonist trapped in a number |
| 3 | 10–20 | Medium | Pull back | A diegetic title: a window titled "APAAR Student Register" opens over the numeral, and Chitti lands on the title bar on a downbeat. | Diegetic title (native move) |
| 4 | 20–27 | Full | Drift | The problem card: "Oversight mostly sees totals, not students." Chitti is pressed flat under the 60. | State the problem |
| 5 | 27–35 | Medium | Push | **Hidden excess:** the 60 overflows; extra slips spill out of its edges, uncounted. | VO: excess hides in totals |
| 6 | 35–41 | Two-shot | Whip-pan | **Counted twice:** two college windows side by side, the same slip appearing in both (Chitti splits into a painted double). | VO: same student at two colleges |
| 7 | 41–50 | Medium | Slow drift | **The letter:** an envelope drifts; a clock hand sweeps; Chitti waits on the envelope flap, tapping. | VO: a letter and a long wait. Breath shot |
| 8 | 50–58 | Close → wide | Push through | The **native move**: the painted 60 cracks along its strokes and unfolds into table rows; each brick-slip slides into its own row. | The turn: totals become records |
| 9 | 58–70 | Wide | Pull back to full window | The full register window floats on its wallpaper; Chitti sits in its own row, which glows navy-tint. | The whole system in view |
| 10 | 70–86 | Medium | Push to figures, rack focus | **Ch 01, National register:** figures computed from rows; Chitti hops along the figure cards and points at the Narmada MBA alert (68 against 60). | Data computed, not declared |
| 11 | 86–109 | Medium/close | Push to cell, ×N time-lapse | **Ch 02, Upload and validation:** the spreadsheet drops in; Chitti runs along the rows as the 26 rules check them. A did-you-mean popover rises (registry check, simulated) and Chitti rides it (moving floor). Six fixes run at ×8 with a tag. | Software reading = mascot running rows |
| 12 | 109–121 | Close | Push + vignette freeze | **Ch 03, Seat check:** the cursor runs the check; the result banner states the projected intake. A spotlight freeze lands on the advice. | Advice before admission |
| 13 | 121–138 | Split-window reframe | Split | **Ch 04, Duplicates:** two institution windows; Chitti's painted double appears in the other; the other institution's identity is shown as "withheld". The name-match weights are listed and Chitti hops word to word (karaoke-ball). | Two places at once, privacy kept |
| 14 | 138–164 | Medium | Whip-pan cause → effect | **Ch 05, Signed records:** the record is signed with a painted wax-seal pulse (no official emblem); the student ticks only some details; the employer pastes the token; six checks tick down; a value is changed and the panel turns red; Chitti's paint smudges, then recovers. A consent request needs the student's Allow. | The key promise, then the proof of failure |
| 15 | 164–175 | Close | Push + vignette | **Ch 06, Under 18:** a smaller slip (a minor's record) rests under an amber "held until guardian consent" banner; Chitti stands guard. | Protection |
| 16 | 175–190 | Medium | Follow the mascot along a list | **Ch 07, Audit and honesty:** the audit rows chain together; Chitti walks the chain links; "Chain intact". The status page lists built / simulated / needs official access. | Accountability, honesty |
| 17 | 190–220 | Wide | Crane down through layers | **Architecture:** the window peels into layers (interface → service → validation engine → seat ledger · identity · credentials → audit chain → PostgreSQL); Chitti rides a data pulse down; the APAAR registry is a dashed amber box marked "Simulated". | The system, honestly labelled |
| 18 | 220–240 | Medium → wide | Pull back to the full window, dim | Close: the window title "APAAR Student Register"; "Every seat counted. Every student verifiable."; SIH26263; the URL. Chitti sleeps on its verified record as the window dims. | Echo of the opening: the slip is no longer lost |

## 6. Beat sheet and cue map

- **Tempo:** 96 bpm, so a bar is 2.5 s and the film is 96 bars. Cuts and chapter seams land on bar lines.
- **Score sections and instrumentation:**

| Bars | Time | Section | Instruments |
|------|------|---------|-------------|
| 1–8 | 0–20 | Opening | felt piano, single tones; the mascot's **kalimba** motif enters at bar 5 (the title) |
| 9–20 | 20–50 | Problem | low-passed, sparse; upright bass enters; drums out; a **near-silence** at bar 20 (49–50 s) |
| 21–28 | 50–70 | Turn | the first sound after the silence is the paper crack; full band enters (brushed kit, bass, piano, kalimba lead) |
| 29–76 | 70–190 | Walkthrough | band at half energy under the voice; a tom fill and soft crash at each chapter seam; drums drop under the tamper fail (bar 61, ~151 s); a held pad under each spotlight freeze |
| 77–88 | 190–220 | Architecture | pulse arpeggio on the kalimba; bass walk |
| 89–96 | 220–240 | Close | resolve; a second **near-silence** before the final title line, then the kalimba motif one last time |

- **Visual hits:** every visual beat is hung on a spoken word, using the word timings from whisper. `cuecheck` verifies the cut-to-bar alignment.

## 7. Sound design

| Section | Ambience | Foley | Music |
|---------|----------|-------|-------|
| Opening | soft room tone | key thocks for "60", paper rustle, brush swish | piano, kalimba |
| Problem | low room, a far clock | paper slips spilling, an envelope slide, a clock tick | sparse, low-passed |
| Turn | – | the paper crack and unfold, slips sliding into rows (a cascade of soft taps) | full band entry |
| Walkthrough | quiet office room tone | trackpad clicks, key thocks, popup pops, success chimes, the fail "thunk", the mascot's soft paper footsteps and landings (paper tap plus a wet brush flick) | band, ducked |
| Architecture | – | pulse blips per layer, a low whoosh per peel | arpeggio |
| Close | room tone | a page settle, the mascot's sleepy breath | resolve |

- **J-cuts and L-cuts:** the next chapter's click or room tone leads each seam by 0.3 s (J-cuts), and the problem-scene clock runs over the crack (an L-cut).

## 8. Subtitles and titles

- **Captions:** a frosted-glass pill at the bottom in Atkinson Hyperlegible 34 px, at most two lines and seven words per phrase, held ≥ max(1.8 s, speech + 0.6 s). Captions never sit over the element being discussed or under the mascot.
- **Chapter pill:** top left, "01 National register", frosted glass with a saffron dot.
- **Key HUD:** bottom right, for typed keys such as **6 0** and ⌘V.
- **Titles:** diegetic only (a window title, an empty-state heading, a notification).

## 9. Honesty rules for this film

- Every label, button, figure and message comes from the app's source or the recordings. No invented features.
- The APAAR registry and the other external integrations are always labelled **Simulated**.
- There is no official emblem or seal. The "signature" is a painted seal pulse, not a government mark.
- All data is synthetic seed data.
