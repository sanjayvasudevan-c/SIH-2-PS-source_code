/** Scene 1 (0-20 s): a national network of institutions converges on one register; title reveal. */
import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { Ground, Kinetic } from "../components/Base";
import { C, FONT, clamp, ease, s } from "../theme";

type Node = { x: number; y: number; z: number; r: number; delay: number };

/** Deterministic nodes in three depth layers around a central register. */
const NODES: Node[] = Array.from({ length: 64 }).map((_, i) => {
  const a = random(`a${i}`) * Math.PI * 2;
  const rad = 260 + random(`r${i}`) * 820;
  const z = [0.55, 0.8, 1.15][i % 3];
  return { x: 960 + Math.cos(a) * rad * 1.35, y: 540 + Math.sin(a) * rad * 0.72, z, r: 3 + random(`s${i}`) * 4, delay: random(`d${i}`) * 140 };
});

export const S1Open: React.FC = () => {
  const f = useCurrentFrame();
  // camera: slow dolly-in across the whole opening, with depth-scaled parallax drift
  const dolly = interpolate(f, [0, s(20)], [1.0, 1.32], { ...clamp, easing: ease.inOut });
  const drift = interpolate(f, [0, s(20)], [40, -40], clamp);
  const lines = interpolate(f, [s(1.5), s(8)], [0, 1], { ...clamp, easing: ease.out });
  const hub = interpolate(f, [s(0.6), s(2.2)], [0, 1], { ...clamp, easing: ease.out });
  const netFade = interpolate(f, [s(9.5), s(12)], [1, 0.28], clamp);
  const titleOut = interpolate(f, [s(18.4), s(20)], [1, 0], { ...clamp, easing: ease.in });
  const push = interpolate(f, [s(18.4), s(20)], [1, 1.25], { ...clamp, easing: ease.in });

  return (
    <Ground>
      <AbsoluteFill style={{ opacity: netFade, scale: `${push}` }}>
        <svg viewBox="0 0 1920 1080" width="100%" height="100%">
          {NODES.map((n, i) => {
            const k = (dolly - 1) * n.z * 2.2 + 1;
            const x = 960 + (n.x - 960) * k + drift * n.z;
            const y = 540 + (n.y - 540) * k;
            const appear = interpolate(f, [n.delay * 0.5, n.delay * 0.5 + 18], [0, 1], { ...clamp, easing: ease.out });
            const draw = Math.max(0, Math.min(1, lines * 1.6 - n.delay / 240));
            // a data pulse travelling inward along each connection, staggered per node
            const cyc = ((f + n.delay * 3) % 90) / 90;
            const px = x + (960 - x) * cyc;
            const py = y + (540 - y) * cyc;
            return (
              <g key={i} opacity={appear * (0.35 + 0.5 * n.z / 1.15)}>
                <line x1={x} y1={y} x2={x + (960 - x) * draw} y2={y + (540 - y) * draw} stroke={C.line} strokeWidth={1.1 * n.z} />
                {draw > 0.98 && i % 4 === 0 && <circle cx={px} cy={py} r={2.4 * n.z} fill={C.saffron} opacity={0.75 * Math.sin(cyc * Math.PI)} />}
                <circle cx={x} cy={y} r={n.r * n.z * k} fill={i % 7 === 0 ? C.saffron : C.white} opacity={i % 7 === 0 ? 0.9 : 0.75} />
              </g>
            );
          })}
          {/* the register: one hub, ringed */}
          <g transform={`translate(960 540) scale(${hub * dolly})`}>
            <circle r={58} fill="none" stroke={C.saffron} strokeWidth={2} opacity={0.8} />
            <circle r={36} fill={C.white} />
            <rect x={-14} y={-18} width={28} height={36} rx={3} fill={C.navy2} />
            <rect x={-8} y={-10} width={16} height={3} fill={C.white} />
            <rect x={-8} y={-3} width={16} height={3} fill={C.white} />
            <rect x={-8} y={4} width={10} height={3} fill={C.white} />
          </g>
        </svg>
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: titleOut, scale: `${push}` }}>
        <div style={{ width: 1400, textAlign: "center" }}>
          <div style={{ fontFamily: FONT, fontSize: 30, color: C.mist, letterSpacing: "0.02em", marginBottom: 18,
            opacity: interpolate(f, [s(10.2), s(11)], [0, 1], clamp) }}>
            Smart India Hackathon · SIH26263
          </div>
          <Kinetic text="APAAR Student Register" start={s(10.6)} stagger={4} size={112} align="center" blur />
          <div style={{ height: 4, width: interpolate(f, [s(12.2), s(13.4)], [0, 260], { ...clamp, easing: ease.out }), background: C.saffron, margin: "26px auto 22px" }} />
          <Kinetic text="Student enrolment register for AICTE-approved institutions" start={s(13)} stagger={2} size={36} weight={400} color={C.mist} align="center" />
        </div>
      </AbsoluteFill>
    </Ground>
  );
};
