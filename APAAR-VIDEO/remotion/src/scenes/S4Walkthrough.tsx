/** Scene 4 (70-190 s): the real product, directed. Chapters are pinned to narration; cuts, zooms and
 * callouts resolve against the recorder's event log (element boxes, clicks, beats) so they track real UI. */
import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Chapter, Ground } from "../components/Base";
import { Callout, CameraClip, CLIP_H, CLIP_W, Key, cameraAt as camAt, toCanvas } from "../components/Screen";
import clipsIndex from "../data/clips.json";
import { C, FPS, clamp, ease, s } from "../theme";

type Ev = { t: number; type: string; label?: string; x?: number; y?: number; w?: number; h?: number };
type Meta = { duration: number; events: Ev[] };
const CLIPS = clipsIndex as unknown as Record<string, Meta>;

/** Event reference: "beat:alert", "box:counts", "click:Check seats", a number (seconds), or "end". Optional offset. */
type Ref = string | number;
const evt = (clip: string, ref: string) => {
  const [type, label] = ref.split(/:(.*)/s);
  const e = CLIPS[clip]?.events.find((x) => x.type === type && (x.label ?? "") === label);
  if (!e) throw new Error(`event ${ref} not found in ${clip}`);
  return e;
};
const time = (clip: string, ref: Ref, dt = 0): number => {
  if (typeof ref === "number") return ref + dt;
  if (ref === "end") return CLIPS[clip].duration - 0.1 + dt;
  return evt(clip, ref).t + dt;
};
const boxOf = (clip: string, ref: string) => {
  const e = evt(clip, ref.startsWith("box:") ? ref : `box:${ref}`);
  return { x: e.x!, y: e.y!, w: e.w!, h: e.h! };
};

type Cam = { at: Ref; dt?: number; zoom: number; focus?: string; move?: number };
type Note = { at: Ref; dt?: number; for: number; box: string; text: string; side?: "left" | "right" | "top" | "bottom" };
type Seg = { clip: string; from: Ref; fromDt?: number; to: Ref; toDt?: number; rate?: number; fit?: boolean; ff?: boolean; cams?: Cam[]; notes?: Note[]; url?: string };
type Chap = { label: string; sub: string; start: number; end: number; segs: Seg[] };

/** The walkthrough, chapter by chapter (times are seconds within scene 4; scene 4 starts at 70 s). */
const CHAPTERS: Chap[] = [
  { label: "National register", sub: "AICTE view, computed from records", start: 0, end: 15.6, segs: [
    { clip: "s01_national.mp4", from: 0, to: "end", fit: true,
      cams: [{ at: "beat:figures", zoom: 1.32, focus: "box:figures" }, { at: "beat:alert", zoom: 1.5, focus: "box:alert" },
             { at: "click:Programmes tab", dt: -0.6, zoom: 1.0 }],
      notes: [{ at: "beat:alert", dt: 0.4, for: 3.4, box: "box:alert", text: "Narmada MBA: 68 within intake against 60 approved", side: "right" }] },
  ] },
  { label: "Upload and validation", sub: "26 rules on every row", start: 15.6, end: 39.0, segs: [
    { clip: "s04_upload.mp4", from: 1.2, to: "beat:counts", toDt: 1.6, rate: 1.5,
      cams: [{ at: "beat:counts", zoom: 1.35, focus: "box:counts" }] },
    { clip: "s05_fix.mp4", from: 1.8, to: "beat:ff_start", rate: 1.15,
      cams: [{ at: "beat:suggestion", dt: -0.6, zoom: 1.5, focus: "box:suggestion" }, { at: "beat:accepted", dt: 0.6, zoom: 1.0 }],
      notes: [{ at: "beat:suggestion", dt: 0.1, for: 2.6, box: "box:suggestion", text: "A one-digit typo, caught against the simulated registry", side: "bottom" }] },
    { clip: "s05_fix.mp4", from: "beat:ff_start", to: "beat:ff_end", fit: true, ff: true },
    { clip: "s05_fix.mp4", from: "click:All rows", fromDt: -0.5, to: "end", rate: 1.3,
      cams: [{ at: "box:duplicate", zoom: 1.3, focus: "box:duplicate" }, { at: "beat:ready", zoom: 1.3, focus: "box:counts" }] },
  ] },
  { label: "Seat check", sub: "before admitting a student", start: 39.0, end: 51.0, segs: [
    { clip: "s07_seatcheck.mp4", from: 0, to: "end", fit: true,
      cams: [{ at: "beat:result", zoom: 1.45, focus: "box:result" }],
      notes: [{ at: "beat:result", dt: 0.3, for: 3.2, box: "box:result", text: "Advice before admission, not a penalty after", side: "top" }] },
  ] },
  { label: "Duplicates across institutions", sub: "identity withheld · reviewed by people", start: 51.0, end: 68.0, segs: [
    { clip: "s09_privacy_inst.mp4", from: 0, to: "end", fit: true,
      cams: [{ at: "box:evidence", zoom: 1.4, focus: "box:evidence" }],
      notes: [{ at: "box:evidence", dt: 0.6, for: 3.6, box: "box:evidence", text: "The other institution sees: identity withheld", side: "top" }] },
    { clip: "s11_priority.mp4", from: "click:Identity candidates", fromDt: -0.4, to: "end", rate: 1.15,
      cams: [{ at: "beat:weights", zoom: 1.45, focus: "box:weights" }],
      notes: [{ at: "beat:weights", dt: 0.2, for: 3.2, box: "box:weights", text: "Why we think these match: every weight is shown", side: "top" }] },
  ] },
  { label: "Signed records and verification", sub: "selective disclosure · six checks", start: 68.0, end: 94.0, segs: [
    { clip: "s12_issue_student.mp4", from: 0, to: "end", rate: 1.3,
      cams: [{ at: "box:claims", zoom: 1.3, focus: "box:claims" }, { at: "beat:shared", zoom: 1.25, focus: "box:qr" }] },
    { clip: "s13_verify.mp4", from: 0, to: "beat:tampered", toDt: 1.4, fit: true,
      cams: [{ at: "beat:valid", zoom: 1.3, focus: "box:checks" }, { at: "click:tamper", dt: -0.2, zoom: 1.0 },
             { at: "beat:tampered", zoom: 1.35, focus: "box:failed" }],
      notes: [{ at: "beat:valid", dt: 0.2, for: 2.8, box: "box:checks", text: "Genuine and current: all six checks pass", side: "right" },
              { at: "beat:tampered", dt: 0.1, for: 1.3, box: "box:failed", text: "One value changed: verification fails", side: "right" }] },
    { clip: "s14_consent_student.mp4", from: 0, to: "end", fit: true,
      cams: [{ at: "box:fields", zoom: 1.35, focus: "box:fields" }] },
  ] },
  { label: "Students under 18", sub: "rule R015", start: 94.0, end: 105.0, segs: [
    { clip: "s16_minor.mp4", from: 0, to: "end", fit: true,
      cams: [{ at: "beat:held", zoom: 1.45, focus: "box:held" }],
      notes: [{ at: "beat:held", dt: 0.2, for: 3.4, box: "box:held", text: "Held until guardian consent is recorded", side: "bottom" }] },
  ] },
  { label: "Audit and honesty", sub: "hash chain · public status page", start: 105.0, end: 120.0, segs: [
    { clip: "s15_audit.mp4", from: 0, to: "end", rate: 1.1,
      cams: [{ at: "beat:intact", zoom: 1.45, focus: "box:chain" }] },
    { clip: "s17_status.mp4", from: 0, to: "end", fit: true, url: "apaar-student-register.vercel.app/#/status",
      cams: [{ at: "beat:counts", zoom: 1.3, focus: "box:counts" }, { at: "beat:simulated", dt: -0.4, zoom: 1.0 }] },
  ] },
];

type Planned = Seg & { fromT: number; toT: number; rateEff: number; start: number; dur: number };

/** Resolve event times, solve the 'fit' segment's speed so each chapter fills its narration window exactly. */
const plan = (ch: Chap): Planned[] => {
  const resolved = ch.segs.map((g) => {
    const fromT = time(g.clip, g.from, g.fromDt ?? 0);
    const toT = Math.min(time(g.clip, g.to, g.toDt ?? 0), CLIPS[g.clip].duration - 0.1);
    return { ...g, fromT, toT };
  });
  const window = ch.end - ch.start;
  const fixed = resolved.filter((g) => !g.fit).reduce((a, g) => a + (g.toT - g.fromT) / (g.rate ?? 1), 0);
  const fits = resolved.filter((g) => g.fit);
  const fitSrc = fits.reduce((a, g) => a + (g.toT - g.fromT), 0);
  const fitRate = fitSrc > 0 ? Math.max(0.6, Math.min(fits.some((g) => g.ff) ? 12 : 4, fitSrc / Math.max(0.5, window - fixed))) : 1;
  let t = ch.start;
  return resolved.map((g) => {
    const rateEff = g.fit ? fitRate : g.rate ?? 1;
    const dur = (g.toT - g.fromT) / rateEff;
    const out = { ...g, rateEff, start: t, dur };
    t += dur;
    return out;
  });
};

const PLAN = CHAPTERS.map((ch) => ({ ch, segs: plan(ch) }));

/** Camera keys (shot seconds) from cues: hold the previous framing, then move in ~0.9 s to the new one. */
const keysFor = (g: Planned): Key[] => {
  const center: Key = { t: 0, zoom: 1, cx: CLIP_W / 2, cy: CLIP_H / 2 };
  const keys: Key[] = [center];
  let prev = center;
  for (const c of g.cams ?? []) {
    const src = time(g.clip, c.at, c.dt ?? 0);
    const T = Math.max(0.05, (src - g.fromT) / g.rateEff);
    if (T > g.dur) continue;
    let cx = CLIP_W / 2, cy = CLIP_H / 2;
    if (c.focus) {
      const b = boxOf(g.clip, c.focus);
      cx = b.x + b.w / 2;
      cy = b.y + b.h / 2;
    }
    const move = c.move ?? 0.9;
    keys.push({ ...prev, t: Math.max(prev.t, T - move) });
    prev = { t: T, zoom: c.zoom, cx, cy };
    keys.push(prev);
  }
  return keys;
};

/** Saffron ring pulse on each real click (dip, spring, ripple) plus a click sound. */
const ClickFx: React.FC<{ g: Planned; keys: Key[] }> = ({ g, keys }) => {
  const f = useCurrentFrame();
  const clicks = CLIPS[g.clip].events.filter((e) => e.type === "click" && e.t >= g.fromT && e.t <= g.toT && (e.x ?? 0) > 0);
  return (
    <>
      {clicks.map((e, i) => {
        const T = (e.t - g.fromT) / g.rateEff;
        const fr = Math.round(T * FPS);
        const p = interpolate(f, [fr, fr + 14], [0, 1], clamp);
        const cam = keys.length ? camAt(keys, f / FPS) : keys[0];
        const pt = toCanvas(cam, e.x!, e.y!);
        return (
          <React.Fragment key={i}>
            {f >= fr && f < fr + 16 && (
              <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <circle cx={pt.x} cy={pt.y} r={10 + 34 * ease.out(p)} fill="none" stroke={C.saffron} strokeWidth={4 * (1 - p)} opacity={1 - p} />
              </svg>
            )}
            {!g.ff && <Sequence from={fr} layout="none"><Audio src={staticFile(`audio/sfx/${e.label?.includes("tab") ? "toggle" : "click"}.wav`)} volume={0.55} /></Sequence>}
          </React.Fragment>
        );
      })}
    </>
  );
};


const SegView: React.FC<{ g: Planned }> = ({ g }) => {
  const f = useCurrentFrame();
  const keys = keysFor(g);
  const dF = Math.round(g.dur * FPS);
  // push-in micro transition on each cut, subtle and quick
  const enter = interpolate(f, [0, 8], [0.97, 1], { ...clamp, easing: ease.out });
  const fade = interpolate(f, [0, 6, dF - 5, dF], [0, 1, 1, 0.85], clamp);
  return (
    <AbsoluteFill style={{ scale: `${enter}`, opacity: fade }}>
      <CameraClip shot={{ clip: g.clip, from: g.fromT, rate: g.rateEff, keys, url: g.url }}>
        {(cam) => (
          <>
            {(g.notes ?? []).map((n, i) => {
              const T = (time(g.clip, n.at, n.dt ?? 0) - g.fromT) / g.rateEff;
              const at = Math.round(T * FPS);
              return <Callout key={i} cam={cam} box={boxOf(g.clip, n.box)} text={n.text} at={at} until={at + Math.round(n.for * FPS)} side={n.side} />;
            })}
          </>
        )}
      </CameraClip>
      <ClickFx g={g} keys={keys} />
      {g.ff && (
        <div style={{ position: "absolute", right: 210, top: 120, padding: "8px 16px", borderRadius: 6, background: "rgba(6,26,66,0.82)",
          color: C.white, fontSize: 22, fontWeight: 700, opacity: interpolate(f, [4, 12], [0, 1], clamp) }}>
          Fast-forward ×{Math.round(g.rateEff)} · six more fixes
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Saffron wipe between chapters. */
const ChapterWipe: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at - 8, at + 8], [0, 1], { ...clamp, easing: ease.inOut });
  if (p <= 0 || p >= 1) return null;
  return <div style={{ position: "absolute", left: 1920 * p - 1920 * 0.15, top: 0, width: 1920 * 0.15, height: 1080, background: `linear-gradient(90deg, rgba(243,112,33,0), ${C.saffron})`, opacity: 0.85 }} />;
};

export const S4Walkthrough: React.FC = () => (
  <Ground>
    {PLAN.map(({ ch, segs }) => (
      <React.Fragment key={ch.label}>
        {segs.map((g, i) => (
          <Sequence key={i} from={Math.round(g.start * FPS)} durationInFrames={Math.max(1, Math.round(g.dur * FPS))}>
            <SegView g={g} />
          </Sequence>
        ))}
        <Sequence from={s(ch.start)} durationInFrames={s(ch.end - ch.start)} layout="none">
          <Chapter label={ch.label} sub={ch.sub} start={6} end={s(ch.end - ch.start)} />
        </Sequence>
      </React.Fragment>
    ))}
    {PLAN.slice(1).map(({ ch }) => (
      <React.Fragment key={`w-${ch.label}`}>
        <ChapterWipe at={s(ch.start)} />
        <Sequence from={s(ch.start) - 9} layout="none"><Audio src={staticFile("audio/sfx/whoosh.wav")} volume={0.35} /></Sequence>
      </React.Fragment>
    ))}
  </Ground>
);

/** Exposed for QA reports: the resolved edit decision list. */
export const EDL = PLAN.flatMap(({ ch, segs }) => segs.map((g) => ({ chapter: ch.label, clip: g.clip, from: +g.fromT.toFixed(2),
  to: +g.toT.toFixed(2), rate: +g.rateEff.toFixed(2), start: +(70 + g.start).toFixed(2), dur: +g.dur.toFixed(2) })));
