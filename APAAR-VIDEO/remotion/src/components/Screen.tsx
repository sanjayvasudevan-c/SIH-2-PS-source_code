/** Real screen recordings, directed: browser frame, keyframed camera, motion-tracked callouts. */
import React from "react";
import { Video } from "@remotion/media";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, clamp, ease } from "../theme";

export const CLIP_W = 2560;
export const CLIP_H = 1440;
/** Browser window placement on the 1920x1080 canvas at zoom 1. */
export const FRAME = { x: 176, y: 96, w: 1568, h: 882 + 44 }; // 44 px title bar
const CONTENT = { x: FRAME.x, y: FRAME.y + 44, w: 1568, h: 882 };
const K = CONTENT.w / CLIP_W; // clip px -> canvas px at zoom 1

/** Camera keyframe: t in seconds (shot time); zoom; focus point in clip pixels. */
export type Key = { t: number; zoom: number; cx: number; cy: number };

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** Interpolate the camera at shot-time t (seconds) with eased segments. */
export const cameraAt = (keys: Key[], t: number): Key => {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.t) {
      const p = ease.inOut((t - a.t) / Math.max(0.001, b.t - a.t));
      return { t, zoom: lerp(a.zoom, b.zoom, p), cx: lerp(a.cx, b.cx, p), cy: lerp(a.cy, b.cy, p) };
    }
  }
  return keys[keys.length - 1];
};

/** Map a clip-pixel point to canvas pixels under the camera. */
export const toCanvas = (cam: Key, px: number, py: number) => {
  // focus point on canvas at zoom 1
  const fx = CONTENT.x + cam.cx * K;
  const fy = CONTENT.y + cam.cy * K;
  // zoom about the focus, then pull the focus part-way towards the frame centre
  const pull = Math.min(1, (cam.zoom - 1) / 0.6);
  const tx = (960 - fx) * 0.85 * pull;
  const ty = (560 - fy) * 0.85 * pull;
  const x = CONTENT.x + px * K;
  const y = CONTENT.y + py * K;
  return { x: fx + (x - fx) * cam.zoom + tx, y: fy + (y - fy) * cam.zoom + ty, fx, fy, tx, ty };
};

export const BrowserChrome: React.FC<{ url: string }> = ({ url }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: FRAME.w, height: 44, background: "#e9edf3",
    borderRadius: "14px 14px 0 0", display: "flex", alignItems: "center", gap: 14, padding: "0 18px", fontFamily: FONT }}>
    <div style={{ display: "flex", gap: 8 }}>
      {["#e0533f", "#e2a23b", "#2f9e83"].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.85 }} />)}
    </div>
    <div style={{ flex: 1, height: 28, borderRadius: 14, background: "#fff", display: "flex", alignItems: "center", padding: "0 16px",
      fontSize: 16, color: "#4a5a70" }}>
      <span style={{ color: "#2f9e83", marginRight: 8 }}>●</span>{url}
    </div>
  </div>
);

export type Shot = {
  clip: string;
  /** seconds into the source clip where this shot starts */
  from: number;
  /** playback speed (speed ramps for repetitive navigation) */
  rate?: number;
  keys: Key[];
  url?: string;
};

/** One directed recording shot: browser window + camera + optional overlay children (callouts). */
export const CameraClip: React.FC<{ shot: Shot; children?: (cam: Key) => React.ReactNode }> = ({ shot, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cam = cameraAt(shot.keys, t);
  const m = toCanvas(cam, cam.cx, cam.cy);
  // subtle handheld breath: sub-pixel drift so the frame never feels locked off
  const bx = Math.sin(frame / 47) * 1.6;
  const by = Math.cos(frame / 61) * 1.2;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080,
        transformOrigin: `${m.fx}px ${m.fy}px`,
        transform: `translate(${m.tx + bx}px, ${m.ty + by}px) scale(${cam.zoom})` }}>
        <div style={{ position: "absolute", left: FRAME.x, top: FRAME.y, width: FRAME.w, height: FRAME.h, borderRadius: 14,
          boxShadow: "0 40px 90px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)", overflow: "hidden", background: "#fff" }}>
          <BrowserChrome url={shot.url ?? "apaar-student-register.vercel.app"} />
          <div style={{ position: "absolute", left: 0, top: 44, width: CONTENT.w, height: CONTENT.h, overflow: "hidden" }}>
            <Video src={staticFile(`clips/${shot.clip}`)} trimBefore={Math.round(shot.from * fps)} playbackRate={shot.rate ?? 1}
              muted style={{ width: CONTENT.w, height: CONTENT.h }} />
          </div>
        </div>
      </div>
      {children?.(cam)}
    </AbsoluteFill>
  );
};

/** Motion-tracked annotation: a saffron ring on the element and a label card with a leader line. */
export const Callout: React.FC<{
  cam: Key;
  box: { x: number; y: number; w: number; h: number };
  text: string;
  at: number; // frame within shot when it appears
  until: number;
  side?: "left" | "right" | "top" | "bottom";
}> = ({ cam, box, text, at, until, side = "right" }) => {
  const f = useCurrentFrame();
  const inP = interpolate(f, [at, at + 14], [0, 1], { ...clamp, easing: ease.out });
  const outP = interpolate(f, [until - 10, until], [1, 0], { ...clamp, easing: ease.in });
  const o = Math.min(inP, outP);
  if (o <= 0) return null;
  const a = toCanvas(cam, box.x, box.y);
  const b = toCanvas(cam, box.x + box.w, box.y + box.h);
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const off = 70;
  const lx = side === "right" ? b.x + off : side === "left" ? a.x - off : cx;
  const ly = side === "top" ? a.y - off : side === "bottom" ? b.y + off : cy;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        {/* focus dimming outside the element */}
        <path fillRule="evenodd" fill={`rgba(6,26,66,${0.42 * o})`}
          d={`M0 0 H1920 V1080 H0 Z M${a.x - 8} ${a.y - 8} H${b.x + 8} V${b.y + 8} H${a.x - 8} Z`} />
        <rect x={a.x - 8} y={a.y - 8} width={(b.x - a.x + 16) * inP} height={b.y - a.y + 16} rx={10} fill="none"
          stroke={C.saffron} strokeWidth={3} opacity={o} />
        <line x1={side === "right" ? b.x + 8 : side === "left" ? a.x - 8 : cx} y1={side === "top" ? a.y - 8 : side === "bottom" ? b.y + 8 : cy}
          x2={lx} y2={ly} stroke={C.saffron} strokeWidth={2} opacity={o} />
      </svg>
      <div style={{ position: "absolute", left: side === "left" ? undefined : lx, right: side === "left" ? 1920 - lx : undefined,
        top: ly, transform: `translate(${side === "top" || side === "bottom" ? "-50%" : "0"}, -50%)`,
        opacity: o, translate: `0 ${interpolate(inP, [0, 1], [10, 0])}px`,
        background: C.white, color: C.ink, fontFamily: FONT, fontWeight: 700, fontSize: 26, padding: "12px 20px",
        borderRadius: 10, borderLeft: `5px solid ${C.saffron}`, boxShadow: "0 12px 30px rgba(0,0,0,0.3)", maxWidth: 520, lineHeight: 1.25 }}>
        {text}
      </div>
    </AbsoluteFill>
  );
};
