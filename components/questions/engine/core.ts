// Shared state and small maths for the procedural sequence. Everything is drawn into one 2D canvas
// in CSS pixels (the context is pre-scaled for the device pixel ratio).
export type Fonts = { display: string; fountain: string; meta: string; body: string };

export type Env = {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  t: number; // sequence time, seconds
  now: number; // wall clock, seconds (for grain and flicker only)
  fonts: Fonts;
  pointer: { x: number; y: number; active: boolean };
  portrait: boolean;
};

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
/** 0 → 1 over [a,b], holds, 1 → 0 over [c,d]. */
export const fade = (t: number, a: number, b: number, c: number, d: number) =>
  seg(t, a, b) * (1 - seg(t, c, d));
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export const easeOut = (x: number) => 1 - (1 - x) ** 3;
export const easeIn = (x: number) => x * x * x;

export const INK = [62, 39, 35] as const;
export const PAPER = [255, 244, 228] as const;
export const ink = (a: number) => `rgba(62,39,35,${a.toFixed(3)})`;
export const faded = (a: number) => `rgba(125,96,85,${a.toFixed(3)})`;

/** Seeded, deterministic randomness: organic variation that never changes the story. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth deterministic wobble for a hand-drawn line (not random per frame). */
export const wobble = (x: number, seed = 0) =>
  Math.sin(x * 1.7 + seed * 3.1) * 0.6 +
  Math.sin(x * 4.3 + seed * 1.3) * 0.3 +
  Math.sin(x * 9.1 + seed) * 0.1;

/** Where things go. Landscape: questions in a left column, the diagram right of centre.
 *  Portrait: questions across the top, the diagram below. Nothing sits in the bottom band, which
 *  is kept quiet because this sequence ends the page. */
export function layout(e: Env) {
  const { w, h, portrait } = e;
  if (portrait) {
    const R = Math.min(w * 0.3, h * 0.17);
    return {
      qx: w / 2,
      qy: h * 0.1,
      qw: w * 0.86,
      align: "center" as CanvasTextAlign,
      qSize: clamp(w * 0.068, 20, 30),
      dx: w / 2,
      dy: h * 0.5,
      R,
    };
  }
  const R = Math.min(w * 0.17, h * 0.24);
  return {
    qx: w * 0.07,
    qy: h * 0.16,
    qw: Math.min(w * 0.33, 520),
    align: "left" as CanvasTextAlign,
    qSize: clamp(w * 0.028, 24, 46),
    dx: w * 0.62,
    dy: h * 0.46,
    R,
  };
}
export type Layout = ReturnType<typeof layout>;
