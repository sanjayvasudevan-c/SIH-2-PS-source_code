/**
 * Code-drawn editorial paper collage (stand-in for the gbro-collage-broll Gemini pipeline,
 * whose image and video models have no quota on the supplied key).
 * Style contract from the skill: flat colour field, black-and-white halftone cut-outs,
 * selective coloured cardstock, crisp cut edges, cream keylines, soft paper shadows, paper grain,
 * stop-motion assembly from an empty field. No text, numbers, logos or UI inside the collage.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, ease } from "../theme";

export const CREAM = "#f3ead7";
const STEP = 2; // stop-motion: hold each pose for 2 frames (15 poses per second)

/** Frame quantised to stop-motion steps. */
export const useStopFrame = () => {
  const f = useCurrentFrame();
  return Math.floor(f / STEP) * STEP;
};

/** Shared SVG defs: halftone dot patterns, paper grain, shadow. Render once per collage. */
export const CollageDefs: React.FC<{ id: string }> = ({ id }) => (
  <defs>
    <pattern id={`${id}-dots`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="9" height="9" fill="#efefe9" />
      <circle cx="4.5" cy="4.5" r="2.6" fill="#141414" />
    </pattern>
    <pattern id={`${id}-dots-fine`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="#f2f1ea" />
      <circle cx="3" cy="3" r="1.25" fill="#1a1a1a" />
    </pattern>
    <pattern id={`${id}-dots-dense`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="7" height="7" fill="#2a2a2a" />
      <circle cx="3.5" cy="3.5" r="1.4" fill="#d9d9d2" />
    </pattern>
    {/* halftone shading: light-to-dark gradient expressed as dot density */}
    <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#fff" stopOpacity="0" />
      <stop offset="1" stopColor="#000" stopOpacity="0.35" />
    </linearGradient>
    <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} seed={7} result="n" />
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer><feFuncA type="table" tableValues="0 0.10" /></feComponentTransfer>
      <feComposite in2="SourceGraphic" operator="in" />
    </filter>
    <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="5" dy="7" stdDeviation="5" floodColor="#000" floodOpacity="0.22" />
    </filter>
  </defs>
);

/** A cut paper piece: keyline + shadow + grain around any SVG shape group. */
export const Piece: React.FC<{
  id: string;
  /** stop-motion entry: frame it starts moving, from-offset, settle duration */
  at: number;
  from?: [number, number];
  rot?: number;
  dur?: number;
  x?: number;
  y?: number;
  scale?: number;
  children: React.ReactNode;
}> = ({ id, at, from = [0, -900], rot = -6, dur = 10, x = 0, y = 0, scale = 1, children }) => {
  const f = useStopFrame();
  const p = interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: ease.out });
  if (f < at) return null;
  // overshoot then snap: the last step lands exactly, like a hand placing paper
  const snap = p > 0.92 ? 1 : p;
  const tx = x + from[0] * (1 - snap);
  const ty = y + from[1] * (1 - snap);
  const r = rot * (1 - snap);
  return (
    <g transform={`translate(${tx} ${ty}) rotate(${r}) scale(${scale})`} filter={`url(#${id}-shadow)`}>
      {children}
    </g>
  );
};

/** Keyline wrapper: draws the shape twice, cream border under, fill on top, grain over. */
export const Cut: React.FC<{ id: string; d: string; fill: string; keyline?: number }> = ({ id, d, fill, keyline = 7 }) => (
  <g>
    <path d={d} fill={CREAM} stroke={CREAM} strokeWidth={keyline} strokeLinejoin="round" />
    <path d={d} fill={fill} />
    <path d={d} fill={`url(#${id}-shade)`} />
    <path d={d} fill="#fff" filter={`url(#${id}-grain)`} />
  </g>
);

/** Flat colour field with paper fibre. */
export const Field: React.FC<{ color: string; children: React.ReactNode; id: string }> = ({ color, children, id }) => (
  <AbsoluteFill style={{ background: color }}>
    <svg viewBox="0 0 1920 1080" width="100%" height="100%">
      <CollageDefs id={id} />
      <rect width="1920" height="1080" fill={color} />
      <rect width="1920" height="1080" fill="#fff" filter={`url(#${id}-grain)`} />
      {children}
    </svg>
  </AbsoluteFill>
);

/* ------------------------------------------------------------------ shape library (paths) */

/** Halftone student bust: head + shoulders, about 220 x 300 at scale 1, origin top-left. */
export const BUST =
  "M110 18 C150 18 172 52 170 92 C168 128 146 152 110 154 C74 152 52 128 50 92 C48 52 70 18 110 18 Z " +
  "M18 300 C20 222 56 182 110 180 C164 182 200 222 202 300 Z";

/** College facade: pediment + four columns + base, about 360 x 300. */
export const FACADE =
  "M10 110 L180 20 L350 110 Z M30 120 H330 V140 H30 Z M48 145 H86 V262 H48 Z M118 145 H156 V262 H118 Z " +
  "M204 145 H242 V262 H204 Z M274 145 H312 V262 H274 Z M20 268 H340 V296 H20 Z";

/** Envelope outline 260 x 170 plus flap. */
export const ENVELOPE = "M0 0 H260 V170 H0 Z";
export const FLAP = "M0 0 L130 92 L260 0";

/** Open hand offering, simple cut silhouette, about 420 x 170 (sleeve + palm + thumb). */
export const HAND =
  "M0 60 H200 C230 58 250 50 276 46 C300 42 330 44 360 52 C392 60 412 72 410 86 C408 98 392 100 372 96 " +
  "L330 90 C350 100 360 112 352 122 C344 132 326 130 300 124 C282 136 254 140 220 136 H0 Z";
