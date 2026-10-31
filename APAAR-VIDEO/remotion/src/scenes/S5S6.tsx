/** Scene 5 (190-220 s): the real architecture, animated. Scene 6 (220-240 s): closing. */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Ground, Kinetic } from "../components/Base";
import { C, FONT, MONO, clamp, ease, s } from "../theme";

type N = { id: string; x: number; y: number; w: number; title: string; sub: string; at: number; tone?: "core" | "sim" | "ext" | "data" };
const NODES: N[] = [
  { id: "ui", x: 160, y: 470, w: 300, title: "React interface", sub: "7 roles · 23 screens", at: 0.4 },
  { id: "api", x: 560, y: 470, w: 300, title: "FastAPI service", sub: "/api/v1 · role checks", at: 2.2 },
  { id: "eng", x: 960, y: 470, w: 320, title: "Validation engine", sub: "26 rules · only writer", at: 4.2, tone: "core" },
  { id: "led", x: 1400, y: 250, w: 320, title: "Seat ledger", sub: "counted from records", at: 7.0 },
  { id: "idn", x: 1400, y: 400, w: 320, title: "Identity matching", sub: "Indian-name aware", at: 8.0 },
  { id: "crd", x: 1400, y: 550, w: 320, title: "Signed credentials", sub: "Ed25519 · selective disclosure", at: 9.0 },
  { id: "aud", x: 1400, y: 700, w: 320, title: "Audit chain", sub: "hash-linked, verifiable", at: 10.0 },
  { id: "db", x: 960, y: 800, w: 320, title: "PostgreSQL", sub: "Neon in the demo", at: 12.5, tone: "data" },
  { id: "apaar", x: 960, y: 160, w: 320, title: "APAAR registry", sub: "simulated until access", at: 15.0, tone: "sim" },
  { id: "ext", x: 160, y: 160, w: 340, title: "DigiLocker · AISHE · approvals", sub: "need official access", at: 18.0, tone: "ext" },
];
const EDGES: [string, string, number][] = [
  ["ui", "api", 1.6], ["api", "eng", 3.6], ["eng", "led", 6.6], ["eng", "idn", 7.6], ["eng", "crd", 8.6], ["eng", "aud", 9.6],
  ["eng", "db", 12.0], ["eng", "apaar", 14.6],
];
const byId = (id: string) => NODES.find((n) => n.id === id)!;
const H = 96;

export const S5Architecture: React.FC = () => {
  const f = useCurrentFrame();
  const cam = interpolate(f, [0, s(30)], [1.08, 1.0], { ...clamp, easing: ease.inOut });
  const camX = interpolate(f, [0, s(30)], [60, -20], { ...clamp, easing: ease.inOut });
  const out = interpolate(f, [s(28.6), s(30)], [1, 0], clamp);
  return (
    <Ground>
      <AbsoluteFill style={{ opacity: out }}>
        <div style={{ position: "absolute", left: 72, top: 54, fontFamily: FONT, color: C.mist, fontSize: 26 }}>How it is built</div>
        <AbsoluteFill style={{ scale: `${cam}`, translate: `${camX}px 0` }}>
          <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
            {EDGES.map(([a, b, at], i) => {
              const A = byId(a);
              const B = byId(b);
              const x1 = A.x + A.w / 2, y1 = A.y + H / 2, x2 = B.x + B.w / 2, y2 = B.y + H / 2;
              const draw = interpolate(f, [s(at), s(at) + 18], [0, 1], { ...clamp, easing: ease.out });
              const sim = B.tone === "sim";
              const cyc = ((f - s(at)) % 45) / 45;
              return (
                <g key={i}>
                  <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * draw} y2={y1 + (y2 - y1) * draw} stroke={sim ? C.amber : "rgba(220,230,245,0.45)"}
                    strokeWidth={2.5} strokeDasharray={sim ? "10 9" : undefined} />
                  {draw >= 1 && !sim && (
                    <circle cx={x1 + (x2 - x1) * cyc} cy={y1 + (y2 - y1) * cyc} r={5} fill={C.saffron} opacity={Math.sin(cyc * Math.PI)} />
                  )}
                </g>
              );
            })}
          </svg>
          {NODES.map((n) => {
            const p = interpolate(f, [s(n.at), s(n.at) + 16], [0, 1], { ...clamp, easing: ease.out });
            const pop = interpolate(f, [s(n.at), s(n.at) + 16], [0, 1], { ...clamp, easing: ease.pop });
            const tone = n.tone ?? "plain";
            return (
              <div key={n.id} style={{ position: "absolute", left: n.x, top: n.y, width: n.w, height: H, opacity: p,
                translate: `0 ${interpolate(p, [0, 1], [18, 0])}px`, scale: `${interpolate(pop, [0, 1], [0.92, 1])}`,
                borderRadius: 12, padding: "16px 20px", fontFamily: FONT,
                background: tone === "core" ? C.white : tone === "ext" ? "transparent" : "rgba(255,255,255,0.08)",
                color: tone === "core" ? C.ink : C.white,
                border: tone === "sim" ? `2px dashed ${C.amber}` : tone === "ext" ? "2px dashed rgba(159,176,207,0.6)" : `1px solid ${tone === "core" ? C.white : "rgba(255,255,255,0.22)"}`,
                boxShadow: tone === "core" ? `0 0 0 6px ${C.saffronSoft}` : undefined }}>
                <div style={{ fontSize: 25, fontWeight: 700, opacity: tone === "ext" ? 0.7 : 1 }}>{n.title}</div>
                <div style={{ fontSize: 18, marginTop: 4, color: tone === "core" ? "#4a5a70" : tone === "sim" ? C.amber : C.mist }}>{n.sub}</div>
                {tone === "sim" && <div style={{ position: "absolute", right: 14, top: -16, background: C.amber, color: C.ink, fontSize: 15,
                  fontWeight: 700, padding: "3px 10px", borderRadius: 6 }}>Simulated</div>}
              </div>
            );
          })}
        </AbsoluteFill>
      </AbsoluteFill>
    </Ground>
  );
};

export const S6Close: React.FC = () => {
  const f = useCurrentFrame();
  const settle = interpolate(f, [0, s(4)], [1.06, 1], { ...clamp, easing: ease.out });
  return (
    <Ground>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", scale: `${settle}` }}>
        <svg width="120" height="120" viewBox="-60 -60 120 120" style={{ opacity: interpolate(f, [0, 20], [0, 1], clamp), marginBottom: 26 }}>
          <circle r={56} fill="none" stroke={C.saffron} strokeWidth={2.5} />
          <circle r={36} fill={C.white} />
          <rect x={-14} y={-18} width={28} height={36} rx={3} fill={C.navy2} />
          <rect x={-8} y={-10} width={16} height={3} fill={C.white} />
          <rect x={-8} y={-3} width={16} height={3} fill={C.white} />
          <rect x={-8} y={4} width={10} height={3} fill={C.white} />
        </svg>
        <Kinetic text="APAAR Student Register" start={8} stagger={4} size={104} align="center" blur />
        <div style={{ height: 4, width: interpolate(f, [s(1.4), s(2.4)], [0, 300], { ...clamp, easing: ease.out }), background: C.saffron, margin: "24px 0 22px" }} />
        <Kinetic text="Every seat counted. Every student verifiable." start={s(1.8)} stagger={3} size={46} weight={400} color={C.mist} align="center" />
        <div style={{ marginTop: 60, display: "flex", gap: 48, fontFamily: FONT, fontSize: 24, color: C.mist,
          opacity: interpolate(f, [s(5), s(6)], [0, 1], clamp) }}>
          <span><b style={{ color: C.white }}>SIH26263</b> · Smart India Hackathon</span>
          <span style={{ fontFamily: MONO, color: C.white }}>apaar-student-register.vercel.app</span>
        </div>
        <div style={{ marginTop: 26, fontFamily: FONT, fontSize: 18, color: "rgba(159,176,207,0.75)", opacity: interpolate(f, [s(7), s(8)], [0, 1], clamp) }}>
          Prototype with synthetic data. APAAR registry checks are simulated. Not an official AICTE website.
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: C.ink, opacity: interpolate(f, [s(18.6), s(20)], [0, 1], clamp) }} />
    </Ground>
  );
};
