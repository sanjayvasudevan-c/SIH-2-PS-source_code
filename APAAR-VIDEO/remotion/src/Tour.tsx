/** The detailed demo: every page of the app, real recordings with an automatic zoom on every click, an info rail that
 * names the page and lists its key points in sync with the voice, sentence-timed captions, warm music ducked under
 * the narration. Everything is driven by data/tour.json (built by APAAR-VIDEO/tour/plan_tour.py). */
import React from "react";
import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Finish, Fonts, Ground } from "./components/Base";
import { CountedTwice, HiddenExcess, LetterAndWait, OneRegister } from "./components/CollageBeats";
import tour from "./data/tour.json";
import { S1Open } from "./scenes/S1Open";
import { S5Architecture, S6Close } from "./scenes/S5S6";
import { C, FONT, MONO, clamp, ease } from "./theme";

type Key = { t: number; zoom: number; cx: number; cy: number };
type Item = { kind: "clip" | "scene"; name: string; start: number; dur: number; offset?: number; from?: number; rate?: number; keys?: Key[]; url?: string; seg: string; still?: boolean };
type Sent = { text: string; t0: number; t1: number };
type Seg = { id: string; section: string; title: string; role: string; points: string[]; start: number; dur: number; voice: string | null; voiceStart: number; text: string; sentences: Sent[] };
const T = tour as unknown as { fps: number; total: number; segments: Seg[]; items: Item[]; clicks: [number, number, number][] };
export const TOUR_FRAMES = Math.ceil(T.total * 30);
const FPS = 30;
const f = (s: number) => Math.round(s * FPS);

// ── layout: browser window on the left, info rail on the right, captions underneath
const WIN = { x: 44, y: 126, w: 1392 };
const BAR = 40;
const CW = WIN.w, CH = Math.round(WIN.w * 1440 / 2560);   // content area (recordings are 2560×1440)
const K = CW / 2560;
const FOCUS = { x: WIN.x + CW / 2, y: WIN.y + BAR + CH / 2 };
const RAIL = { x: 1468, y: 126, w: 408, h: BAR + CH };

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const camAt = (keys: Key[], t: number): Key => {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.t) { const p = ease.inOut((t - a.t) / Math.max(0.001, b.t - a.t)); return { t, zoom: lerp(a.zoom, b.zoom, p), cx: lerp(a.cx, b.cx, p), cy: lerp(a.cy, b.cy, p) }; }
  }
  return keys[keys.length - 1];
};
/** clip pixel → canvas pixel under the camera (zoom about the focus point, pulled towards the window centre) */
const xf = (cam: Key) => {
  const fx = WIN.x + cam.cx * K, fy = WIN.y + BAR + cam.cy * K;
  const pull = Math.min(1, (cam.zoom - 1) / 0.5);
  let tx = (FOCUS.x - fx) * 0.9 * pull, ty = (FOCUS.y - fy) * 0.9 * pull;
  const z = Math.max(1, cam.zoom);
  // keep the zoomed page covering the whole window: never reveal empty space at an edge
  const X0 = WIN.x, X1 = WIN.x + CW, Y0 = WIN.y + BAR, Y1 = WIN.y + BAR + CH;
  tx = Math.min(X0 - fx - (X0 - fx) * z, Math.max(X1 - fx - (X1 - fx) * z, tx));
  ty = Math.min(Y0 - fy - (Y0 - fy) * z, Math.max(Y1 - fy - (Y1 - fy) * z, ty));
  return { fx, fy, tx, ty, z };
};

const Shot: React.FC<{ it: Item }> = ({ it }) => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  const cam = camAt(it.keys!, t);
  const m = xf(cam);
  const dF = f(it.dur);
  const enter = it.still ? 1 : interpolate(fr, [0, 7], [0, 1], { ...clamp, easing: ease.out });
  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <div style={{ position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: BAR + CH, overflow: "hidden", borderRadius: 14,
        boxShadow: "0 30px 70px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.08)", background: "#fff" }}>
        <div style={{ position: "absolute", left: -WIN.x, top: -WIN.y, width: 1920, height: 1080, transformOrigin: `${m.fx}px ${m.fy}px`,
          transform: `translate(${m.tx}px, ${m.ty}px) scale(${m.z})` }}>
          <div style={{ position: "absolute", left: WIN.x, top: WIN.y + BAR, width: CW, height: CH, overflow: "hidden" }}>
            <Video src={staticFile(`clips/${it.name}`)} trimBefore={Math.round((it.from ?? 0) * FPS)} playbackRate={it.rate ?? 1} muted
              style={{ width: CW, height: CH }} />
          </div>
        </div>
        {/* browser bar stays put while the page zooms */}
        <div style={{ position: "absolute", left: 0, top: 0, width: WIN.w, height: BAR, background: "#e9edf3", display: "flex", alignItems: "center", gap: 12, padding: "0 16px", fontFamily: FONT }}>
          {["#e0533f", "#e2a23b", "#2f9e83"].map((c) => <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c, opacity: .85 }} />)}
          <div style={{ marginLeft: 10, flex: 1, maxWidth: 760, height: 26, borderRadius: 13, background: "#fff", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 15, color: "#4a5a70" }}>
            <span style={{ color: "#2f9e83", marginRight: 8 }}>●</span>{it.url}
          </div>
          {cam.zoom > 1.08 && <div style={{ marginLeft: "auto", fontSize: 14, color: "#4a5a70", fontFamily: MONO }}>{cam.zoom.toFixed(1)}×</div>}
        </div>
      </div>
      {dF > 0 && <ClickFx it={it} />}
    </AbsoluteFill>
  );
};

/** Click ripple at every recorded click, tracked through the camera. */
const ClickFx: React.FC<{ it: Item }> = ({ it }) => {
  const fr = useCurrentFrame();
  const local = T.clicks.filter(([c]) => c >= it.start - 0.01 && c < it.start + it.dur).map(([c, x, y]) => [c - it.start, x, y]);
  return (
    <>
      {local.map(([c, px, py], i) => {
        const p = interpolate(fr, [f(c), f(c) + 15], [0, 1], clamp);
        if (p <= 0 || p >= 1) return null;
        const m = xf(camAt(it.keys!, fr / FPS));
        const X = m.fx + (WIN.x + px * K - m.fx) * m.z + m.tx, Y = m.fy + (WIN.y + BAR + py * K - m.fy) * m.z + m.ty;
        return (
          <div key={i} style={{ position: "absolute", left: X - 30, top: Y - 30, width: 60, height: 60, borderRadius: 30,
            border: `${4 * (1 - p)}px solid ${C.saffron}`, background: `rgba(243,112,33,${0.22 * (1 - p)})`,
            transform: `scale(${0.4 + 1.6 * ease.out(p)})`, opacity: 1 - p * 0.6 }} />
        );
      })}
    </>
  );
};

/** Right-hand rail: role/section, page title, key points that appear as the voice reaches them. */
const Rail: React.FC<{ seg: Seg; index: number }> = ({ seg, index }) => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  const inP = interpolate(fr, [0, 10], [0, 1], { ...clamp, easing: ease.out });
  const vs = seg.voiceStart - seg.start, vd = Math.max(1, seg.dur - vs - 0.3);
  const n = seg.points.length;
  const pages = T.segments.filter((s) => s.points.length);
  const pageNo = pages.findIndex((s) => s.id === seg.id) + 1;
  return (
    <div style={{ position: "absolute", left: RAIL.x, top: RAIL.y, width: RAIL.w, height: RAIL.h, fontFamily: FONT, color: C.white, opacity: inP,
      transform: `translateX(${(1 - inP) * 24}px)` }}>
      <div style={{ fontSize: 18, letterSpacing: ".08em", textTransform: "uppercase", color: C.saffron, fontWeight: 700 }}>{seg.section}</div>
      <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.12, marginTop: 10 }}>{seg.title}</div>
      <div style={{ width: 64, height: 4, background: C.saffron, margin: "20px 0 24px" }} />
      {seg.points.map((p, i) => {
        const at = vs + (i / n) * vd * 0.85;
        const k = interpolate(t, [at, at + 0.35], [0, 1], { ...clamp, easing: ease.out });
        return (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18, opacity: k, transform: `translateY(${(1 - k) * 12}px)` }}>
            <div style={{ flex: "0 0 30px", height: 30, borderRadius: 15, background: k >= 1 ? C.saffron : "transparent", border: `2px solid ${C.saffron}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>{i + 1}</div>
            <div style={{ fontSize: 25, lineHeight: 1.3, color: "#e9eef7" }}>{p}</div>
          </div>
        );
      })}
      {pageNo > 0 && (
        <div style={{ position: "absolute", left: 0, bottom: 0, fontSize: 16, color: C.mist, fontFamily: MONO }}>
          step {pageNo} of {pages.length}
          <div style={{ marginTop: 8, width: RAIL.w, height: 4, background: "rgba(255,255,255,.12)", borderRadius: 2 }}>
            <div style={{ width: `${(pageNo / pages.length) * 100}%`, height: 4, background: C.saffron, borderRadius: 2 }} />
          </div>
        </div>
      )}
    </div>
  );
};

/** Top bar: brand + role journey. */
const TopBar: React.FC<{ seg: Seg }> = ({ seg }) => (
  <div style={{ position: "absolute", left: WIN.x, top: 40, right: 44, height: 60, display: "flex", alignItems: "center", fontFamily: FONT, color: C.white }}>
    <div style={{ fontSize: 24, fontWeight: 700 }}>APAAR Student Register</div>
    <div style={{ marginLeft: 18, fontSize: 18, color: C.mist }}>one student's journey · synthetic data</div>
    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
      {["Institution", "AICTE", "Student", "Employer", "Audit"].map((r) => {
        const on = seg.role === r;
        return <div key={r} style={{ padding: "6px 14px", borderRadius: 16, fontSize: 16, fontWeight: 700, background: on ? C.saffron : "rgba(255,255,255,.08)", color: on ? "#fff" : C.mist }}>{r}</div>;
      })}
    </div>
  </div>
);
/** Sentence-timed captions, split into short phrases. */
const Captions: React.FC = () => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  const phrases: Sent[] = [];
  for (const s of T.segments) for (const x of s.sentences) {
    const words = x.text.replace("S-I-H two six two six three", "SIH26263").split(" "), chunks: string[] = []; let cur: string[] = [];
    words.forEach((w, i) => { cur.push(w); if (cur.length >= 9 || (/[,;:]$/.test(w) && cur.length >= 4) || i === words.length - 1) { chunks.push(cur.join(" ")); cur = []; } });
    const total = chunks.reduce((a, c) => a + c.length, 0); let tt = x.t0;
    for (const c of chunks) { const d = (x.t1 - x.t0) * c.length / total; phrases.push({ text: c, t0: tt, t1: tt + d }); tt += d; }
  }
  const p = phrases.find((x) => t >= x.t0 && t < x.t1 + 0.05);
  if (!p) return null;
  const k = interpolate(t, [p.t0, p.t0 + 0.12], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ maxWidth: 1500, padding: "10px 26px", borderRadius: 12, background: "rgba(6,20,48,.78)", color: "#fff", fontFamily: FONT, fontSize: 34,
        lineHeight: 1.25, opacity: k, textAlign: "center" }}>{p.text}</div>
    </div>
  );
};

/** "Why it is better": before and after, row by row. */
const ROWS: [string, string][] = [
  ["Totals declared by colleges", "Seats counted from student records"],
  ["Excess hidden inside numbers", "Excess named per programme, live"],
  ["Duplicates found late, if ever", "Flagged early; identities withheld"],
  ["Letters and weeks to verify", "Six checks in seconds, with consent"],
  ["Edits leave no trace", "Hash-chained audit anyone can verify"],
];
export const WhyBetter: React.FC = () => {
  const fr = useCurrentFrame();
  const { durationInFrames: D } = useVideoConfig();
  const step = Math.max(24, (D * 0.82) / ROWS.length);   // one row per spoken sentence
  return (
    <Ground>
      <div style={{ position: "absolute", left: 140, top: 110, fontFamily: FONT, color: C.white }}>
        <div style={{ fontSize: 22, letterSpacing: ".1em", color: C.saffron, fontWeight: 700 }}>WHY IT IS BETTER</div>
        <div style={{ fontSize: 56, fontWeight: 700, marginTop: 8 }}>From totals to students</div>
      </div>
      <div style={{ position: "absolute", left: 140, top: 270, width: 1640, fontFamily: FONT }}>
        <div style={{ display: "flex", fontSize: 22, color: C.mist, marginBottom: 14 }}><div style={{ width: 760 }}>Today</div><div>With the register</div></div>
        {ROWS.map(([a, b], i) => {
          const k = interpolate(fr, [6 + i * step, 22 + i * step], [0, 1], { ...clamp, easing: ease.out });
          const k2 = interpolate(fr, [14 + i * step, 32 + i * step], [0, 1], { ...clamp, easing: ease.out });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", height: 104, borderTop: "1px solid rgba(255,255,255,.12)" }}>
              <div style={{ width: 760, fontSize: 32, color: "#b8c3d8", opacity: k, transform: `translateX(${(1 - k) * -20}px)` }}>
                <span style={{ color: C.red, marginRight: 14 }}>✕</span>{a}</div>
              <div style={{ fontSize: 34, fontWeight: 700, color: C.white, opacity: k2, transform: `translateX(${(1 - k2) * 20}px)` }}>
                <span style={{ color: C.green, marginRight: 14 }}>✓</span>{b}</div>
            </div>
          );
        })}
      </div>
    </Ground>
  );
};

const SCENES: Record<string, React.FC> = { S1Open, HiddenExcess, CountedTwice, LetterAndWait, OneRegister, S5Architecture, S6Close, WhyBetter };

// ── music: warm bed ducked under the voice
const VOICE = T.segments.filter((s) => s.voice).map((s) => [s.voiceStart, s.voiceStart + (s.dur - (s.voiceStart - s.start) - 0.35)] as [number, number]);
const musicVolume = (frame: number) => {
  const t = frame / FPS;
  let duck = 0;
  for (const [a, b] of VOICE) duck = Math.max(duck, interpolate(t, [a - .35, a, b, b + .5], [0, 1, 1, 0], clamp));
  const fadeIn = interpolate(t, [0, 1.2], [0, 1], clamp), fadeOut = interpolate(t, [T.total - 3, T.total], [1, 0], clamp);
  return interpolate(duck, [0, 1], [0.62, 0.17]) * fadeIn * fadeOut;
};

export const Tour: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Fonts />
      <Ground>{null}</Ground>
      {T.items.map((it, i) => {
        return (
          <Sequence key={i} from={f(it.start)} durationInFrames={Math.max(1, f(it.dur))}>
            {it.kind === "scene"
              ? <Sequence from={-f(it.offset ?? 0)} layout="none">{React.createElement(SCENES[it.name] ?? WhyBetter)}</Sequence>
              : <Shot it={it} />}
          </Sequence>
        );
      })}
      {/* rail and top bar for page segments */}
      {T.segments.map((s, i) => {
        const hasClip = T.items.some((it) => it.seg === s.id && it.kind === "clip");
        if (!hasClip) return null;
        const firstClip = T.items.find((it) => it.seg === s.id && it.kind === "clip")!;
        return (
          <Sequence key={s.id} from={f(firstClip.start)} durationInFrames={f(s.start + s.dur - firstClip.start)}>
            <TopBar seg={s} />
            <Rail seg={{ ...s, start: firstClip.start }} index={i} />
          </Sequence>
        );
      })}
      <Finish grain={0.03} />
      <Captions />
      <Audio src={staticFile("audio/warm.wav")} volume={musicVolume} />
      {T.segments.filter((s) => s.voice).map((s) => (
        <Sequence key={s.id} from={f(s.voiceStart)} layout="none"><Audio src={staticFile(s.voice!)} /></Sequence>
      ))}
      {T.clicks.map(([c], i) => (
        <Sequence key={`c${i}`} from={f(c)} layout="none"><Audio src={staticFile("audio/sfx/click.wav")} volume={0.45} /></Sequence>
      ))}
      {T.segments.slice(1).map((s) => (
        <Sequence key={`w${s.id}`} from={Math.max(0, f(s.start) - 6)} layout="none"><Audio src={staticFile("audio/sfx/whoosh.wav")} volume={0.18} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
