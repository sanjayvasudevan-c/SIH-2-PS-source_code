#!/usr/bin/env python3
"""Plan the detailed demo: fit real recordings to each narration segment, derive an automatic camera that zooms in on
every click (and eases onto highlighted elements), and write remotion/src/data/tour.json. Copies clips and voice into
remotion/public. Re-run whenever the voice or the recordings change.

  python3 APAAR-VIDEO/tour/plan_tour.py
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
RM = ROOT / "remotion"
SRC_DIRS = [ROOT / "recordings", HERE / "rec"]
PUB_CLIPS, PUB_VOICE = RM / "public" / "clips", RM / "public" / "tour"
SCRIPT = json.loads((HERE / "script.json").read_text())
TIMING_P = HERE / "voice" / "timing.json"
TIMING = {}
for _p in sorted((HERE / "voice").glob("timing*.json")):
    TIMING.update(json.loads(_p.read_text()))

LEAD, TAIL = 0.5, 1.3
EXTRA = {"k00_meet": 2.0, "k01_problem": 3.0, "k02_idea": 1.5, "k14_why": 2.0, "k15_close": 3.5}                   # silence before / after each line
MAX_RATE = 2.2                            # footage never plays slower than real time; longer footage is sped up to this
ZOOM_CLICK, ZOOM_BOX = 1.65, 1.28
HOST = "apaar-student-register.vercel.app"

# segment → visuals. clip: name, optional (from, to) in seconds or event refs "click:Label"/"box:label"/"beat:label" with offsets.
V = {
    "k00_meet": [{"clip": "n_student_correction", "to": "box:details", "pad": 1.4}, {"scene": "S1Open", "w": 1, "offset": 5.0}],
    "k01_problem": [{"scene": "HiddenExcess", "w": 1}, {"scene": "CountedTwice", "w": 1}, {"scene": "LetterAndWait", "w": 1}],
    "k02_idea": [{"scene": "OneRegister", "w": 1}, {"clip": "s03_dashboard"}],
    "k03_upload": [{"clip": "s04_upload"}],
    "k04_fix": [{"clip": "s05_fix", "to": "beat:ff_start", "pad": .3}, {"clip": "s05_fix", "from": "click:All rows", "pad": -.5}, {"clip": "s06_commit_inst"}],
    "k05_seat": [{"clip": "s07_seatcheck"}],
    "k05b_dashboard": [{"clip": "n_dash"}],
    "k07b_flags": [{"clip": "s10_workflow_aicte"}, {"clip": "s10_workflow_auto"}],
    "k06_national": [{"clip": "s06_commit_aicte", "from": "beat:live_update", "pad": -1.5}, {"clip": "s01_national", "to": "click:Programmes tab", "pad": -.3}],
    "k07_priority": [{"clip": "s11_priority", "to": "click:Identity candidates", "pad": -.2}],
    "k08_duplicate": [{"clip": "s09_privacy_inst"}, {"clip": "s11_priority", "from": "click:Identity candidates", "pad": -.4}],
    "k09_share": [{"clip": "s12_issue_inst", "from": "click:Signed records tab", "pad": -.4}, {"clip": "s12_issue_student"}],
    "k10_verify": [{"clip": "s13_verify"}],
    "k11_consent": [{"clip": "s14_consent_student"}, {"clip": "s14_consent_result"}],
    "k12_minor": [{"clip": "s16_minor"}],
    "k13_audit": [{"clip": "s15_audit"}, {"clip": "s17_status"}],
    "k14_why": [{"scene": "WhyBetter"}],
    "k15_close": [{"scene": "S6Close"}],
}
URL = {"n_login": "/#/login", "n_dash": "/#/inst", "s03_dashboard": "/#/inst", "s04_upload": "/#/inst/upload", "s05_fix": "/#/inst/imports/…",
       "s06_commit_inst": "/#/inst/imports/…", "s06_commit_aicte": "/#/aicte", "n_add": "/#/inst/add", "n_records": "/#/records",
       "n_record_detail": "/#/records/…", "s12_issue_inst": "/#/records/…", "s07_seatcheck": "/#/seat-check", "s10_workflow_aicte": "/#/issues/…",
       "s10_workflow_auto": "/#/issues/…", "n_corrections": "/#/corrections", "n_reports": "/#/reports", "n_access": "/#/inst/system-access",
       "s01_national": "/#/aicte", "n_national_more": "/#/aicte", "s11_priority": "/#/aicte/priority", "n_queue": "/#/issues",
       "s09_privacy_inst": "/#/issues/…", "n_intake": "/#/aicte/intakes", "n_identity": "/#/aicte/identity", "n_rules": "/#/aicte/rules",
       "n_integrations": "/#/aicte/integrations", "s12_issue_student": "/#/me", "n_student_correction": "/#/me", "s13_verify": "/#/verify",
       "s14_consent_verifier": "/#/verifier/requests", "s14_consent_student": "/#/me", "s14_consent_result": "/#/verifier/requests",
       "s16_minor": "/#/me", "s15_audit": "/#/audit", "s17_status": "/#/status"}
SECTION_OF = {s["id"]: s["section"] for s in SCRIPT}


def load_clip(name):
    for d in SRC_DIRS:
        j = d / f"{name}.json"
        if j.exists():
            return d, json.loads(j.read_text())
    raise FileNotFoundError(name)


def ref_time(meta, ref, default):
    if ref is None:
        return default
    if isinstance(ref, (int, float)):
        return float(ref)
    kind, label = ref.split(":", 1)
    n = 0
    if "#" in label:
        label, n = label.rsplit("#", 1); n = int(n)
    hits = [e for e in meta["events"] if e["type"] == kind and e.get("label") == label]
    if len(hits) <= n:
        raise KeyError(f"{ref} not in clip")
    return hits[n]["t"]


def camera(meta, a, b, rate):
    """Keys in shot seconds: zoom in on every click, ease onto highlighted boxes, return to overview in between."""
    foc = []
    for e in meta["events"]:
        if not (a - .3 <= e["t"] <= b):
            continue
        T = (e["t"] - a) / rate
        if e["type"] == "click" and e.get("x"):
            foc.append((T - .55, T + .75, ZOOM_CLICK, e["x"], e["y"]))
        elif e["type"] == "box" and e.get("w"):
            z = min(ZOOM_BOX, 2400 / max(1, e["w"]), 1300 / max(1, e["h"]))
            if z > 1.05:
                foc.append((T - .3, T + 1.5, z, e["x"] + e["w"] / 2, e["y"] + e["h"] / 2))
    foc.sort()
    # clicks win over overlapping boxes
    merged = []
    for f in foc:
        if merged and f[0] < merged[-1][1]:
            if f[2] >= merged[-1][2]:
                merged[-1] = (merged[-1][0], merged[-1][1], merged[-1][2], merged[-1][3], merged[-1][4])
                merged.append((max(f[0], merged[-1][0] + .25), f[1], f[2], f[3], f[4]))
            continue
        merged.append(f)
    keys = [{"t": 0, "zoom": 1.0, "cx": 1280, "cy": 720}]
    last = keys[0]
    for i, (s, e, z, x, y) in enumerate(merged):
        s = max(s, last["t"] + .05)
        mv = .45
        keys.append({**last, "t": round(max(last["t"], s - mv), 3)})
        last = {"t": round(max(s, last["t"] + .1), 3), "zoom": round(z, 3), "cx": x, "cy": y}
        keys.append(last)
        nxt = merged[i + 1][0] if i + 1 < len(merged) else None
        hold_end = e if nxt is None or nxt - e > 1.1 else max(e, nxt - .45)
        keys.append({**last, "t": round(max(last["t"], hold_end), 3)})
        last = keys[-1]
        if nxt is None or nxt - e > 1.1:
            last = {"t": round(last["t"] + .5, 3), "zoom": 1.0, "cx": 1280, "cy": 720}
            keys.append(last)
    clicks = [[round((e["t"] - a) / rate, 3), e.get("x", 1280), e.get("y", 720)] for e in meta["events"] if e["type"] == "click" and a <= e["t"] <= b]
    return keys, clicks


def add_hold(items, p, hold, tt, sid):
    at = max(p["a"], p["b"] - .08)
    # an active hold: tour the page's highlighted elements (boxes, then click targets), one every ~2 s
    pts = []
    for e in p["meta"]["events"]:
        if e["t"] > p["b"] + .05 or e["t"] < p["a"] - .5:
            continue                                  # only what this shot actually showed
        if e["type"] == "box" and e.get("w"):
            z = max(1.12, min(1.5, 2300 / max(1, e["w"]), 1250 / max(1, e["h"])))
            pts.append((e["x"] + e["w"] / 2, e["y"] + e["h"] / 2, z))
        elif e["type"] == "click" and e.get("x"):
            pts.append((e["x"], e["y"], 1.45))
    pts = pts[-4:] or [(1280, 720, 1.15)]
    keys = [{"t": 0, "zoom": 1.0, "cx": 1280, "cy": 720}]
    k, i_ = 0.0, 0
    while k < hold - .3:
        x, y, z = pts[i_ % len(pts)]
        keys.append({"t": round(k + .6, 3), "zoom": round(z, 3), "cx": x, "cy": y})
        keys.append({"t": round(min(hold, k + 2.0), 3), "zoom": round(z * 1.04, 3), "cx": x, "cy": y})
        k += 2.0; i_ += 1
    items.append({"kind": "clip", "name": f"{p['name']}.mp4", "start": round(tt, 3), "dur": round(hold, 3), "from": round(at, 3),
                  "rate": 0.02, "keys": keys, "url": HOST + URL.get(p["name"], "/"), "seg": sid, "still": True})
    return tt + hold


def main():
    PUB_CLIPS.mkdir(parents=True, exist_ok=True); PUB_VOICE.mkdir(parents=True, exist_ok=True)
    t = 0.0
    segs, items, clicks, missing = [], [], [], []
    for s in SCRIPT:
        sid = s["id"]
        tm = TIMING.get(sid)
        vdur = tm["duration"] if tm else len(s["text"].split()) / 2.75
        if not tm:
            missing.append(sid)
        dur = LEAD + vdur + TAIL + EXTRA.get(sid, 0.0)
        sents = [{"text": x["text"], "t0": round(t + LEAD + x["start"], 3), "t1": round(t + LEAD + x["end"], 3)} for x in (tm["sentences"] if tm else [])]
        voice = None
        if tm:
            shutil.copy(HERE / "voice" / f"{sid}.wav", PUB_VOICE / f"{sid}.wav"); voice = f"tour/{sid}.wav"
        segs.append({"id": sid, "section": s["section"], "title": s.get("title", s["section"]), "points": s.get("points", []), "role": s.get("role", ""), "start": round(t, 3), "dur": round(dur, 3), "voice": voice,
                     "voiceStart": round(t + LEAD, 3), "text": s["text"], "sentences": sents})
        vis = V[sid]
        # resolve clip ranges
        plan = []
        for v in vis:
            if "scene" in v:
                plan.append({"kind": "scene", "name": v["scene"], "w": v.get("w", 1), "offset": v.get("offset", 0)})
                continue
            d, meta = load_clip(v["clip"])
            ev = meta["events"]
            first = min((e["t"] for e in ev), default=0.0)
            last = max((e["t"] for e in ev), default=meta["duration"])
            a = ref_time(meta, v.get("from"), max(0.0, first - .7))
            b = ref_time(meta, v.get("to"), min(meta["duration"] - .05, last + 1.3))
            if v.get("from") and v.get("pad"): a = max(0.0, a + v["pad"])
            if v.get("to") and v.get("pad") and not v.get("from"): b = min(meta["duration"] - .05, b + v["pad"])
            if v.get("to") and v.get("from") and v.get("pad"): b = min(meta["duration"] - .05, b + abs(v["pad"]))
            if b - a < .8: b = min(meta["duration"] - .05, a + .8)
            shutil.copy(d / f"{v['clip']}.mp4", PUB_CLIPS / f"{v['clip']}.mp4")
            plan.append({"kind": "clip", "name": v["clip"], "meta": meta, "a": a, "b": b})
        clip_src = sum(p["b"] - p["a"] for p in plan if p["kind"] == "clip")
        scene_w = sum(p["w"] for p in plan if p["kind"] == "scene")
        # scenes share time with clips: a scene gets 4.5 s per weight unless it is the only visual
        scene_time = dur if clip_src == 0 else min(dur * .45, 4.5 * scene_w)
        clip_time = dur - scene_time if scene_w else dur
        rate = 1.0
        hold = 0.0
        if clip_src:
            rate = clip_src / clip_time
            if rate > MAX_RATE:          # too much footage: trim each clip's tail proportionally
                keep = clip_time * MAX_RATE / clip_src
                for p in plan:
                    if p["kind"] == "clip": p["b"] = p["a"] + (p["b"] - p["a"]) * keep
                rate = MAX_RATE
            hold = 0.0
            if rate < 1.0:               # too little footage: play at real time, then hold the last frame with a slow push-in
                hold = clip_time - clip_src
                rate = 1.0
        tt = t
        for p in plan:
            if p["kind"] == "scene":
                d_ = scene_time * p["w"] / scene_w
                items.append({"kind": "scene", "name": p["name"], "start": round(tt, 3), "dur": round(d_, 3), "seg": sid, "offset": p.get("offset", 0)})
            else:
                d_ = (p["b"] - p["a"]) / rate
                keys, cl = camera(p["meta"], p["a"], p["b"], rate)
                items.append({"kind": "clip", "name": f"{p['name']}.mp4", "start": round(tt, 3), "dur": round(d_, 3), "from": round(p["a"], 3),
                              "rate": round(rate, 4), "keys": keys, "url": HOST + URL.get(p["name"], "/"), "seg": sid})
                clicks += [[round(tt + c[0], 3), c[1], c[2]] for c in cl]
                tt += d_
                last_clip = p
                if p is [q for q in plan if q["kind"] == "clip"][-1] and hold > 0.05:
                    tt = add_hold(items, p, hold, tt, sid)
                    hold = 0.0
                continue
            tt += d_
        t += dur
    total = round(t + 1.0, 3)
    data = {"fps": 30, "total": total, "segments": segs, "items": items, "clicks": clicks}
    out = RM / "src" / "data" / "tour.json"
    out.write_text(json.dumps(data, indent=1))
    rates = [i["rate"] for i in items if i["kind"] == "clip" and not i.get("still")]
    print(f"still holds: {sum(i['dur'] for i in items if i.get('still')):.1f}s")
    print(f"total {total:.1f}s ({total / 60:.1f} min), {len(items)} shots, {len(clicks)} clicks, rate {min(rates):.2f}–{max(rates):.2f}")
    if missing:
        print(f"voice missing for {len(missing)} segments (estimated): {', '.join(missing[:6])}{'…' if len(missing) > 6 else ''}")


if __name__ == "__main__":
    main()
