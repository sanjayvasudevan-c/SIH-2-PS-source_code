/** Scene 2 (20-50 s): the problem, told in paper collage. Scene 3 (50-70 s): one register, revealed in the real product. */
import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Ground, Kinetic } from "../components/Base";
import { CountedTwice, HiddenExcess, LetterAndWait, OneRegister } from "../components/CollageBeats";
import { CameraClip } from "../components/Screen";
import { C, FONT, clamp, ease, s } from "../theme";

/** Directional mask wipe with a saffron leading edge (the film's one transition language). */
export const Wipe: React.FC<{ at: number; dur?: number; children: React.ReactNode }> = ({ at, dur = 16, children }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + dur], [0, 1], { ...clamp, easing: ease.inOut });
  if (f < at) return null;
  const edge = 1920 * (1 - p);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${edge}px)` }}>{children}</AbsoluteFill>
      {p < 1 && <div style={{ position: "absolute", left: edge - 6, top: 0, width: 12, height: 1080, background: C.saffron }} />}
    </AbsoluteFill>
  );
};

/** Typography lower-left label over a collage (never inside it). */
const Label: React.FC<{ text: string; at: number; until: number }> = ({ text, at, until }) => {
  const f = useCurrentFrame();
  const o = Math.min(interpolate(f, [at, at + 12], [0, 1], clamp), interpolate(f, [until - 10, until], [1, 0], clamp));
  return (
    <div style={{ position: "absolute", left: 72, top: 64, opacity: o, fontFamily: FONT }}>
      <div style={{ background: "rgba(6,26,66,0.9)", color: C.white, fontSize: 34, fontWeight: 700, padding: "14px 24px",
        borderLeft: `6px solid ${C.saffron}`, translate: `${interpolate(f, [at, at + 14], [-30, 0], { ...clamp, easing: ease.out })}px 0` }}>
        {text}
      </div>
    </div>
  );
};

// frame offsets within scene 2 (scene starts at 20 s)
const P = { title: 0, beat1: s(3), beat2: s(12.3), beat3: s(19.2), out: s(29.2) };

export const S2Problem: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Ground>
        <AbsoluteFill style={{ justifyContent: "center", padding: "0 180px" }}>
          <div style={{ color: C.mist, fontSize: 30, marginBottom: 14, opacity: interpolate(f, [4, 16], [0, 1], clamp) }}>The problem</div>
          <Kinetic text="Oversight mostly sees totals, not students." start={6} stagger={3} size={84} />
        </AbsoluteFill>
      </Ground>
      <Wipe at={P.beat1}>
        <Sequence from={P.beat1} layout="none"><HiddenExcess /></Sequence>
      </Wipe>
      <Wipe at={P.beat2}>
        <Sequence from={P.beat2} layout="none"><CountedTwice /></Sequence>
      </Wipe>
      <Wipe at={P.beat3}>
        <Sequence from={P.beat3} layout="none"><LetterAndWait /></Sequence>
      </Wipe>
      <Label text="Excess hides inside a declared total" at={P.beat1 + 40} until={P.beat2} />
      <Label text="One student, two institutions" at={P.beat2 + 40} until={P.beat3} />
      <Label text="Verification: a letter and a long wait" at={P.beat3 + 40} until={P.out} />
    </AbsoluteFill>
  );
};

/** Scene 3: the ledger collage zooms through into the real national dashboard, which the camera pulls back to reveal. */
export const S3Solution: React.FC = () => {
  const f = useCurrentFrame();
  const through = interpolate(f, [s(6.2), s(7.4)], [1, 9], { ...clamp, easing: ease.in });
  const throughFade = interpolate(f, [s(6.9), s(7.4)], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Sequence from={s(7)} layout="none">
        <Ground>
          <CameraClip shot={{ clip: "s03_dashboard.mp4", from: 0.3, rate: 0.75, keys: [
            { t: 0, zoom: 1.6, cx: 1100, cy: 560 },
            { t: 3.2, zoom: 1.0, cx: 1280, cy: 720 },
            { t: 13, zoom: 1.0, cx: 1280, cy: 720 },
          ] }} />
          <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 0 34px 0", alignItems: "center" }}>
            <div style={{ fontFamily: FONT, color: C.white, fontSize: 30, fontWeight: 700, letterSpacing: "0.01em",
              opacity: interpolate(f, [s(10.5), s(11.2)], [0, 1], clamp) }}>
              One register · student-level · keyed to APAAR ID
            </div>
          </AbsoluteFill>
        </Ground>
      </Sequence>
      {f < s(7.4) && (
        <AbsoluteFill style={{ opacity: throughFade, scale: `${through}`, transformOrigin: "50% 45%" }}>
          <OneRegister />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
