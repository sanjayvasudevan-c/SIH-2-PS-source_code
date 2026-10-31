/** The film: one 240 s timeline, six scenes, narration, ducked score, sound design and captions. */
import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, interpolate, staticFile } from "remotion";
import { Finish, Fonts } from "./components/Base";
import { Captions, Seg } from "./components/Captions";
import narration from "./data/narration.json";
import cues from "./data/sfx.json";
import { S1Open } from "./scenes/S1Open";
import { S2Problem, S3Solution } from "./scenes/S2S3";
import { S4Walkthrough } from "./scenes/S4Walkthrough";
import { S5Architecture, S6Close } from "./scenes/S5S6";
import { FPS, s } from "./theme";

export const FILM_FRAMES = s(240);
export const SCENES = { s1: [0, 20], s2: [20, 50], s3: [50, 70], s4: [70, 190], s5: [190, 220], s6: [220, 240] } as const;

const segs: Seg[] = Object.values(narration as Record<string, Seg>).sort((a, b) => a.start - b.start);

/** Music ducks to -14 dB under the voice, with 0.4 s ramps. */
const musicVolume = (frame: number) => {
  const t = frame / FPS;
  let duck = 0;
  for (const g of segs) {
    duck = Math.max(duck, interpolate(t, [g.start - 0.4, g.start, g.start + g.duration, g.start + g.duration + 0.6], [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  }
  return interpolate(duck, [0, 1], [0.85, 0.2]);
};

export const Film: React.FC = () => (
  <AbsoluteFill style={{ background: "#061a42" }}>
    <Fonts />
    <Sequence from={s(SCENES.s1[0])} durationInFrames={s(20)}><S1Open /></Sequence>
    <Sequence from={s(SCENES.s2[0])} durationInFrames={s(30)}><S2Problem /></Sequence>
    <Sequence from={s(SCENES.s3[0])} durationInFrames={s(20)}><S3Solution /></Sequence>
    <Sequence from={s(SCENES.s4[0])} durationInFrames={s(120)}><S4Walkthrough /></Sequence>
    <Sequence from={s(SCENES.s5[0])} durationInFrames={s(30)}><S5Architecture /></Sequence>
    <Sequence from={s(SCENES.s6[0])} durationInFrames={s(20)}><S6Close /></Sequence>
    <Finish grain={0.045} />
    <Captions segs={segs} />

    <Audio src={staticFile("audio/score.wav")} volume={musicVolume} />
    {segs.map((g) => (
      <Sequence key={g.id} from={Math.round(g.start * FPS)} layout="none">
        <Audio src={staticFile(g.file)} volume={1} />
      </Sequence>
    ))}
    {(cues as { at: number; sfx: string; gain: number }[]).map((c, i) => (
      <Sequence key={i} from={Math.round(c.at * FPS)} layout="none">
        <Audio src={staticFile(`audio/sfx/${c.sfx}.wav`)} volume={c.gain} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
