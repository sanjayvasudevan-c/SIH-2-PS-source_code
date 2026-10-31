import { Easing } from "remotion";

export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const s = (seconds: number) => Math.round(seconds * FPS);

/** Film palette: the product's own institutional navy, white and a restrained saffron. */
export const C = {
  ink: "#061a42",
  navy: "#0a2556",
  navy2: "#12387a",
  navy3: "#1d4a94",
  line: "rgba(220, 230, 245, 0.18)",
  mist: "#9fb0cf",
  paper: "#f6f4ee",
  white: "#ffffff",
  saffron: "#f37021",
  saffronSoft: "rgba(243, 112, 33, 0.18)",
  green: "#2f9e83",
  red: "#e0533f",
  amber: "#e2a23b",
};

export const FONT = '"Atkinson Hyperlegible", system-ui, sans-serif';
export const MONO = '"IBM Plex Mono", ui-monospace, monospace';

/** One easing language for the whole film. */
export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // arrivals
  inOut: Easing.bezier(0.65, 0, 0.35, 1), // camera moves
  in: Easing.bezier(0.7, 0, 0.84, 0), // exits
};

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
