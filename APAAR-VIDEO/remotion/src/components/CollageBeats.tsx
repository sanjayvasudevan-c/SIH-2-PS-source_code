/** The four approved collage metaphors (Gate 1), drawn in code. Each is about 6 s and self-contained. */
import React from "react";
import { interpolate } from "remotion";
import { clamp, ease } from "../theme";
import { BUST, CREAM, Cut, ENVELOPE, FACADE, FLAP, Field, HAND, Piece, useStopFrame } from "./Collage";

/** 01 Excess hides inside the total: figures stack behind a blank card and spill past a saffron limit. */
export const HiddenExcess: React.FC = () => {
  const id = "c1";
  const behind = [
    // [x, y, at]: rows of students behind the card, the last ones rising above the limit strip
    [560, 560, 22], [700, 560, 26], [840, 560, 30], [980, 560, 34], [1120, 560, 38],
    [630, 470, 46], [770, 470, 50], [910, 470, 54], [1050, 470, 58],
    [640, 300, 66], [760, 250, 70], [880, 220, 74], [1000, 260, 78], [1120, 310, 82], [820, 120, 90], [960, 140, 94],
  ];
  return (
    <Field color="#B5481E" id={id}>
      {behind.map(([x, y, at], i) => (
        <Piece key={i} id={id} at={at} from={[0, 700]} rot={i % 2 ? 5 : -5} x={x} y={y} scale={0.62}>
          <Cut id={id} d={BUST} fill={`url(#${id}-dots${i % 3 === 0 ? "-fine" : ""})`} />
        </Piece>
      ))}
      {/* saffron limit strip: the approved line */}
      <Piece id={id} at={0} from={[-2200, 0]} rot={0} x={360} y={455}>
        <Cut id={id} d="M0 0 H1200 V22 H0 Z" fill="#f37021" keyline={5} />
      </Piece>
      {/* the blank declared total card */}
      <Piece id={id} at={8} from={[0, -1000]} rot={-4} x={560} y={520}>
        <Cut id={id} d="M0 0 H800 V420 H0 Z" fill="#f6efe0" />
        <path d="M60 330 H740" stroke="#0a2556" strokeWidth={14} strokeLinecap="round" opacity={0.85} />
        <path d="M60 280 H520" stroke="#0a2556" strokeWidth={8} strokeLinecap="round" opacity={0.35} />
      </Piece>
    </Field>
  );
};

/** 02 One student, counted twice: the same halftone student under two colleges, joined by a red thread. */
export const CountedTwice: React.FC = () => {
  const id = "c2";
  const f = useStopFrame();
  const thread = interpolate(f, [70, 110], [1, 0], { ...clamp, easing: ease.inOut });
  return (
    <Field color="#C9952B" id={id}>
      <Piece id={id} at={0} from={[-1400, 0]} rot={-3} x={170} y={190}>
        <Cut id={id} d={FACADE} fill={`url(#${id}-dots)`} />
      </Piece>
      <Piece id={id} at={8} from={[1400, 0]} rot={3} x={1390} y={190}>
        <Cut id={id} d={FACADE} fill={`url(#${id}-dots)`} />
      </Piece>
      {/* the same student, whole, under each college */}
      <Piece id={id} at={24} from={[0, 900]} rot={-8} x={330} y={500} scale={1.05}>
        <Cut id={id} d={BUST} fill={`url(#${id}-dots-fine)`} />
      </Piece>
      <Piece id={id} at={34} from={[0, 900]} rot={8} x={1430} y={500} scale={1.05}>
        <Cut id={id} d={BUST} fill={`url(#${id}-dots-fine)`} />
      </Piece>
      {/* pins */}
      <Piece id={id} at={52} from={[0, -300]} rot={0} x={445} y={720}><circle r={16} fill="#c62d1f" stroke={CREAM} strokeWidth={5} /></Piece>
      <Piece id={id} at={58} from={[0, -300]} rot={0} x={1545} y={720}><circle r={16} fill="#c62d1f" stroke={CREAM} strokeWidth={5} /></Piece>
      {/* the red thread that says: same person */}
      {f >= 70 && (
        <path d="M445 720 C780 900 1210 900 1545 720" fill="none" stroke="#c62d1f" strokeWidth={6} strokeLinecap="round"
          pathLength={1} strokeDasharray="1" strokeDashoffset={thread} />
      )}
    </Field>
  );
};

/** 03 A letter and a long wait: envelopes pile up under a paper clock while a hand offers one more. */
export const LetterAndWait: React.FC = () => {
  const id = "c3";
  const f = useStopFrame();
  const hand = interpolate(f, [0, 220], [0, 360 * 2.5]); // the clock keeps turning
  const sealPop = interpolate(f, [118, 126], [0, 1], { ...clamp, easing: ease.out });
  return (
    <Field color="#1F5F5B" id={id}>
      {/* paper clock */}
      <Piece id={id} at={0} from={[0, -800]} rot={10} x={1440} y={250}>
        <circle r={150} fill={CREAM} stroke={CREAM} strokeWidth={8} />
        <circle r={140} fill={`url(#${id}-dots-fine)`} />
        <circle r={112} fill="#f6efe0" />
        <line x1={0} y1={0} x2={0} y2={-88} stroke="#141414" strokeWidth={10} strokeLinecap="round" transform={`rotate(${hand})`} />
        <line x1={0} y1={0} x2={0} y2={-58} stroke="#141414" strokeWidth={14} strokeLinecap="round" transform={`rotate(${hand / 12})`} />
        <circle r={12} fill="#f37021" />
      </Piece>
      {/* envelope stack rising */}
      {Array.from({ length: 7 }).map((_, i) => (
        <Piece key={i} id={id} at={14 + i * 7} from={[0, 900]} rot={i % 2 ? 3 : -3} x={520 + (i % 2) * 18} y={760 - i * 74}>
          <Cut id={id} d={ENVELOPE} fill="#f6efe0" />
          <path d={FLAP} fill="none" stroke="#b9ad93" strokeWidth={4} />
        </Piece>
      ))}
      {/* the hand offering one more letter */}
      <Piece id={id} at={74} from={[1300, 0]} rot={0} x={980} y={620}>
        <Cut id={id} d={HAND} fill={`url(#${id}-dots)`} />
        <g transform="translate(250 -120) rotate(-8)">
          <Cut id={id} d={ENVELOPE} fill="#f6efe0" />
          <path d={FLAP} fill="none" stroke="#b9ad93" strokeWidth={4} />
          <g transform={`translate(130 92) scale(${sealPop})`}>
            <circle r={30} fill="#f37021" stroke={CREAM} strokeWidth={5} />
            <circle r={16} fill="none" stroke="#b9561a" strokeWidth={4} />
          </g>
        </g>
      </Piece>
    </Field>
  );
};

/** 04 One register: the scattered pieces file into ordered rows on one ledger page. */
export const OneRegister: React.FC = () => {
  const id = "c4";
  const rows = [0, 1, 2, 3];
  return (
    <Field color="#12387A" id={id}>
      <Piece id={id} at={0} from={[0, 1200]} rot={0} x={470} y={130}>
        <Cut id={id} d="M0 0 H70 V820 H0 Z" fill="#0a2556" keyline={6} />
      </Piece>
      <Piece id={id} at={6} from={[0, 1200]} rot={-3} x={530} y={130}>
        <Cut id={id} d="M0 0 H930 V820 H0 Z" fill="#f6efe0" />
        {rows.map((r) => (
          <path key={r} d={`M60 ${200 + r * 160} H870`} stroke="#c9bfa7" strokeWidth={3} />
        ))}
      </Piece>
      {rows.map((r) =>
        [0, 1, 2, 3, 4].map((c) => {
          const at = 24 + r * 12 + c * 3;
          return (
            <Piece key={`${r}-${c}`} id={id} at={at} from={[c % 2 ? 1400 : -1400, 0]} rot={c % 2 ? 6 : -6}
              x={620 + c * 160} y={190 + r * 160} scale={0.42}>
              <Cut id={id} d={BUST} fill={`url(#${id}-dots${(r + c) % 2 ? "-fine" : ""})`} keyline={10} />
            </Piece>
          );
        }),
      )}
      {/* saffron index tab clicks into place */}
      <Piece id={id} at={88} from={[400, 0]} rot={0} x={1420} y={200}>
        <Cut id={id} d="M0 0 H90 V130 H0 Z" fill="#f37021" keyline={5} />
      </Piece>
    </Field>
  );
};
