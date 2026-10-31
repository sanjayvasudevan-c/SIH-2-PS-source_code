import React from "react";
import { AbsoluteFill, Composition, Sequence } from "remotion";
import { Fonts } from "./components/Base";
import { Film, FILM_FRAMES } from "./Film";
import { CountedTwice, HiddenExcess, LetterAndWait, OneRegister } from "./components/CollageBeats";

const CollagePreview: React.FC = () => (
  <AbsoluteFill>
    <Fonts />
    <Sequence durationInFrames={180}><HiddenExcess /></Sequence>
    <Sequence from={180} durationInFrames={180}><CountedTwice /></Sequence>
    <Sequence from={360} durationInFrames={180}><LetterAndWait /></Sequence>
    <Sequence from={540} durationInFrames={180}><OneRegister /></Sequence>
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="APAARFilm" component={Film} durationInFrames={FILM_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="CollagePreview" component={CollagePreview} durationInFrames={720} fps={30} width={1920} height={1080} />
  </>
);
