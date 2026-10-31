import React from "react";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, FONT, MONO, clamp, ease } from "../theme";

/** Product fonts, self-hosted (same files the web app ships). */
export const Fonts: React.FC = () => (
  <style>{`
    @font-face { font-family: "Atkinson Hyperlegible"; font-weight: 400; src: url(${staticFile("fonts/atkinson-hyperlegible-latin-400-normal.woff2")}) format("woff2"); }
    @font-face { font-family: "Atkinson Hyperlegible"; font-weight: 700; src: url(${staticFile("fonts/atkinson-hyperlegible-latin-700-normal.woff2")}) format("woff2"); }
    @font-face { font-family: "IBM Plex Mono"; font-weight: 400; src: url(${staticFile("fonts/ibm-plex-mono-latin-400-normal.woff2")}) format("woff2"); }
  `}</style>
);

/** Deep institutional ground with a soft light pool; no neon, no glow. */
export const Ground: React.FC<{ tone?: "navy" | "paper"; children?: React.ReactNode }> = ({ tone = "navy", children }) => (
  <AbsoluteFill
    style={{
      background:
        tone === "navy"
          ? `radial-gradient(120% 90% at 50% 40%, ${C.navy2} 0%, ${C.navy} 45%, ${C.ink} 100%)`
          : `radial-gradient(120% 90% at 50% 35%, #ffffff 0%, ${C.paper} 60%, #e9e5da 100%)`,
      fontFamily: FONT,
      color: tone === "navy" ? C.white : C.ink,
    }}
  >
    {children}
  </AbsoluteFill>
);

/** Controlled vignette and fine animated grain for a filmic finish. */
export const Finish: React.FC<{ grain?: number }> = ({ grain = 0.05 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)" }} />
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: grain, mixBlendMode: "overlay" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={frame % 7} />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

/** Word-by-word masked rise: each word slides up out of its own mask. */
export const Kinetic: React.FC<{
  text: string;
  start?: number;
  stagger?: number;
  size?: number;
  weight?: number;
  color?: string;
  align?: "left" | "center";
  exitAt?: number;
  style?: React.CSSProperties;
}> = ({ text, start = 0, stagger = 3, size = 64, weight = 700, color = C.white, align = "left", exitAt, style }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const exit = exitAt === undefined ? 1 : interpolate(frame, [exitAt, exitAt + 12], [1, 0], { ...clamp, easing: ease.in });
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start",
      gap: `0 ${size * 0.28}px`, fontSize: size, fontWeight: weight, color, lineHeight: 1.12, letterSpacing: "-0.01em", opacity: exit, ...style }}>
      {words.map((w, i) => (
        <span key={i} style={{ overflow: "hidden", display: "inline-block", paddingBottom: size * 0.08 }}>
          <span style={{ display: "inline-block",
            translate: `0 ${interpolate(frame, [start + i * stagger, start + i * stagger + 16], [110, 0], { ...clamp, easing: ease.out })}%` }}>
            {w}
          </span>
        </span>
      ))}
    </div>
  );
};

/** Small chapter marker, lower-left: saffron rule + label. */
export const Chapter: React.FC<{ label: string; sub?: string; start?: number; end: number }> = ({ label, sub, start = 0, end }) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [start, start + 18], [0, 1], { ...clamp, easing: ease.out });
  const outP = interpolate(frame, [end - 14, end], [1, 0], { ...clamp, easing: ease.in });
  return (
    <div style={{ position: "absolute", left: 72, top: 54, display: "flex", alignItems: "center", gap: 16, opacity: Math.min(inP, outP), fontFamily: FONT }}>
      <div style={{ width: interpolate(inP, [0, 1], [0, 46]), height: 3, background: C.saffron }} />
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.white, letterSpacing: "0.01em" }}>{label}</div>
        {sub && <div style={{ fontSize: 18, color: C.mist, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
};

export const Mono: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ fontFamily: MONO, ...style }}>{children}</span>
);
