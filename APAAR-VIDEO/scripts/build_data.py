"""Collect recorder event logs and clips into the Remotion project, and build the SFX cue sheet."""
import json, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REC, RM = ROOT / "recordings", ROOT / "remotion"
(RM / "public/clips").mkdir(parents=True, exist_ok=True)
clips = {}
for j in sorted(REC.glob("*.json")):
    if j.name == "index.json":
        continue
    mp4 = j.with_suffix(".mp4")
    if not mp4.exists():
        continue
    d = json.loads(j.read_text())
    clips[mp4.name] = {"duration": d["duration"], "events": d["events"]}
    shutil.copy2(mp4, RM / "public/clips" / mp4.name)
(RM / "src/data/clips.json").write_text(json.dumps(clips, indent=1))

# Sound design outside the walkthrough (walkthrough clicks are placed by the scene from real click events).
cues = [
    {"at": 0.4, "sfx": "pulse", "gain": 0.35},
    {"at": 10.5, "sfx": "impact", "gain": 0.5},          # title
    {"at": 19.6, "sfx": "whoosh", "gain": 0.4},          # into problem
    {"at": 23.0, "sfx": "paper", "gain": 0.45}, {"at": 32.3, "sfx": "paper", "gain": 0.45}, {"at": 39.2, "sfx": "paper", "gain": 0.45},
    {"at": 49.6, "sfx": "whoosh", "gain": 0.4},          # into solution
    {"at": 51.2, "sfx": "paper", "gain": 0.4},
    {"at": 56.4, "sfx": "whoosh", "gain": 0.35},         # zoom-through
    {"at": 58.0, "sfx": "impact", "gain": 0.35},
    {"at": 69.6, "sfx": "whoosh", "gain": 0.4},          # into walkthrough
    {"at": 189.6, "sfx": "whoosh", "gain": 0.4},         # into architecture
    *[{"at": 192 + 2.2 * i, "sfx": "pulse", "gain": 0.22} for i in range(10)],
    {"at": 219.6, "sfx": "whoosh", "gain": 0.35},
    {"at": 221.5, "sfx": "impact", "gain": 0.45},        # close title
]
(RM / "src/data/sfx.json").write_text(json.dumps(cues, indent=1))
print(f"{len(clips)} clips, {len(cues)} cues")
