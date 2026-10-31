# APAAR Student Register: film storyboard

240 s · 1920×1080 · 30 fps. Narration comes from `narration/script.json` (12 segments, 416 words).
Everything in the walkthrough is a real Playwright capture of the running app, using synthetic seed data.

| # | Time | Scene | Picture | Sound |
|---|------|-------|---------|-------|
| 1 | 0–20 s | Opening | A network of 64 institution nodes in three depth layers draws lines into one register hub as the camera dollies in. Title blur-reveals at 10.6 s: "APAAR Student Register", with the SIH26263 line above and a saffron rule below. Push-out at 18.4 s. | Pulse, then impact on the title. Score enters. VO s1_open. |
| 2 | 20–50 s | Problem | Title card: "Oversight mostly sees totals, not students." Then three code-drawn paper-collage beats: **Hidden excess** (burnt orange), **Counted twice** (mustard), **A letter and a long wait** (teal). | Paper SFX on each beat. VO s2_problem. |
| 3 | 50–70 s | Solution | Collage **One register** (blue), then a zoom-through into a real capture of the institution dashboard, pulling back. | Whoosh and impact. VO s3_solution. |
| 4 | 70–190 s | Walkthrough | Seven chapters, each pinned to a narration segment; camera keys and callouts come from recorded element boxes (see the next table). | Click and toggle SFX on every real click; whoosh plus saffron wipe between chapters. |
| 5 | 190–220 s | Architecture | Animated system diagram: React (7 roles · 23 screens) → FastAPI → Validation engine (26 rules, only writer) → seat ledger, identity, signed credentials, audit chain → PostgreSQL. The APAAR registry is drawn as a dashed amber box labelled **Simulated**. | Data pulses along the edges. VO s5_architecture. |
| 6 | 220–240 s | Close | Title; "Every seat counted. Every student verifiable."; SIH26263; the live URL; an honesty line about simulated integrations; fade to ink. | Impact; score resolves. VO s6_close. |

## Walkthrough chapters (scene 4)

| Chapter | Film time | Clips | Key moment |
|---------|-----------|-------|------------|
| National register | 70–85.6 s | s01_national | Zoom to the figures, then to the Narmada MBA excess alert (68 against 60 approved) |
| Upload and validation | 85.6–109 s | s04_upload, s05_fix (fast-forward over the six repetitive fixes, labelled on screen) | "Did you mean" suggestion from the simulated registry check; duplicate row left out |
| Seat check | 109–121 s | s07_seatcheck | The advisory seat result |
| Duplicates | 121–138 s | s09_privacy_inst, s11_priority | Identity withheld; match weights shown |
| Signed records | 138–164 s | s12_issue_student, s13_verify, s14_consent_student | Six checks pass; one changed value makes verification fail; consent request |
| Under 18 | 164–175 s | s16_minor | Share held until guardian consent is recorded (R015) |
| Audit and honesty | 175–190 s | s15_audit, s17_status | Hash chain intact; public status page showing the simulated items |

The resolved edit decision list (each clip's in and out points and speed) is computed in `remotion/src/scenes/S4Walkthrough.tsx` (`EDL`) from `remotion/src/data/clips.json`.
