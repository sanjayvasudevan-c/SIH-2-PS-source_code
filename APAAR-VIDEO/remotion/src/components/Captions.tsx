/** Captions from the generated narration: phrases timed proportionally across each segment's measured audio. */
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, FONT, FPS, clamp } from "../theme";

export type Seg = { id: string; start: number; duration: number; file: string; text: string };

/** Split text into readable phrases (max ~7 words, break at punctuation), timed by character share. */
export const phrases = (seg: Seg) => {
  const words = seg.text.split(" ");
  const out: { text: string; t0: number; t1: number }[] = [];
  let cur: string[] = [];
  const flush = () => {
    if (cur.length) out.push({ text: cur.join(" "), t0: 0, t1: 0 });
    cur = [];
  };
  for (const w of words) {
    cur.push(w);
    if (/[.,;:?!]$/.test(w) && cur.length >= 3) flush();
    else if (cur.length >= 7) flush();
  }
  flush();
  const total = out.reduce((a, p) => a + p.text.length, 0);
  let t = seg.start;
  for (const p of out) {
    const d = (p.text.length / total) * seg.duration;
    p.t0 = t;
    p.t1 = t + d;
    t += d;
  }
  return out;
};

export const Captions: React.FC<{ segs: Seg[] }> = ({ segs }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const all = segs.flatMap(phrases);
  const cur = all.find((p) => t >= p.t0 && t < p.t1 + 0.15);
  if (!cur) return null;
  const o = Math.min(interpolate(t, [cur.t0, cur.t0 + 0.12], [0, 1], clamp), interpolate(t, [cur.t1, cur.t1 + 0.15], [1, 0], clamp));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 26, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ fontFamily: FONT, fontSize: 32, fontWeight: 700, color: C.white, background: "rgba(6,26,66,0.82)",
        padding: "8px 22px", borderRadius: 8, maxWidth: 1500, textAlign: "center", lineHeight: 1.3 }}>
        {cur.text}
      </div>
    </div>
  );
};

/** SRT text for the same phrases (written by scripts/make_srt.mjs at build time). */
export const toSrt = (segs: Seg[]) => {
  const fmt = (x: number) => {
    const ms = Math.round(x * 1000);
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000), r = ms % 1000;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(r).padStart(3, "0")}`;
  };
  return segs.flatMap(phrases).map((p, i) => `${i + 1}\n${fmt(p.t0)} --> ${fmt(p.t1)}\n${p.text}\n`).join("\n");
};
