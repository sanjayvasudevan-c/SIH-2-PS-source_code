#!/usr/bin/env python3
"""Chatterbox narration: a voice test, then one WAV per script segment, plus a timing map for the edit.

Run with the Chatterbox venv:  /home/user/cbx/bin/python APAAR-VIDEO/scripts/narrate.py [test|all|<segment ids>]
Outputs: narration/test.wav, narration/segments/<id>.wav, remotion/src/data/narration.json, remotion/public/audio/<id>.wav
"""
from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

import torch
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = json.loads((ROOT / "narration" / "script.json").read_text())
SEG_DIR = ROOT / "narration" / "segments"
PUB = ROOT / "remotion" / "public" / "audio"
DATA = ROOT / "remotion" / "src" / "data" / "narration.json"

# Spoken forms: what the voice should say, while captions keep the written forms.
SAY = [
    (r"\bAPAAR\b", "Ah-paar"),
    (r"\bAICTE\b", "A I C T E"),
    (r"\bS-I-H two six two six three\b", "S I H, two six two six three"),
    (r"\bFastAPI\b", "Fast A P I"),
    (r"\bPostgreSQL\b", "Postgres Q L"),
    (r"\bReact\b", "React"),
]


def spoken(text: str) -> str:
    for pat, rep in SAY:
        text = re.sub(pat, rep, text)
    return text


def main():
    torch.set_num_threads(4)
    which = sys.argv[1:] or ["test"]
    model = ChatterboxTTS.from_pretrained(device="cpu")
    # calm presenter: moderate exaggeration, slightly lower cfg for natural pacing
    kw = dict(exaggeration=0.45, cfg_weight=0.45, temperature=0.7)
    if which == ["test"]:
        wav = model.generate(spoken("This is the APAAR Student Register, built for AICTE. Problem statement S-I-H two six two six three."), **kw)
        ta.save(str(ROOT / "narration" / "test.wav"), wav, model.sr)
        print("voice test ->", ROOT / "narration" / "test.wav")
        return
    SEG_DIR.mkdir(parents=True, exist_ok=True)
    PUB.mkdir(parents=True, exist_ok=True)
    timing = json.loads(DATA.read_text()) if DATA.exists() else {}
    for seg in SCRIPT["segments"]:
        if which != ["all"] and seg["id"] not in which:
            continue
        torch.manual_seed(26263)
        wav = model.generate(spoken(seg["text"]), **kw)
        out = SEG_DIR / f"{seg['id']}.wav"
        ta.save(str(out), wav, model.sr)
        shutil.copy(out, PUB / out.name)
        dur = wav.shape[-1] / model.sr
        timing[seg["id"]] = {"id": seg["id"], "start": seg["start"], "duration": round(dur, 3), "window": seg["window"],
                             "file": f"audio/{out.name}", "text": seg["text"]}
        flag = "  OVER WINDOW" if dur > seg["window"] else ""
        print(f"{seg['id']:16} {dur:6.2f}s / window {seg['window']:5.1f}s{flag}", flush=True)
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps(timing, indent=1))


if __name__ == "__main__":
    main()
