const KEY = "prism-seed";

// One seed per browser session: stable across reloads and navigation, new on the next visit.
export function sessionSeed(): number {
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored !== null && /^\d+$/.test(stored)) return Number(stored);
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    sessionStorage.setItem(KEY, String(seed));
    return seed;
  } catch {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEG = Math.PI / 180;

export type PrismVariation = {
  rotZ: number;
  tiltX: number;
  tiltY: number;
  lightAngle: number;
  entryT: number;
  dispersion: number;
  dustDrift: number;
  dustSpeed: number;
  camera: [number, number, number];
  phase: number;
  roughness: number;
  vertexJitter: number[];
  bandWidthJitter: number[];
};

// Every value is a bounded offset around a composed baseline: the picture is always the same
// picture, never re-randomised.
export function prismVariation(seed: number): PrismVariation {
  const r = mulberry32(seed);
  const range = (lo: number, hi: number) => lo + (hi - lo) * r();
  return {
    // Nearly face-on, like a prism set on a desk: only a sliver of the base and right faces shows.
    rotZ: range(2, 5) * DEG,
    tiltX: range(-7, -4) * DEG,
    tiltY: range(-8, -4) * DEG,
    lightAngle: range(16.5, 21) * DEG,
    entryT: range(0.42, 0.56),
    dispersion: range(0.78, 1),
    dustDrift: range(-1, 1),
    dustSpeed: range(0.7, 1.15),
    camera: [range(-0.3, 0.3), range(-0.2, 0.2), range(-0.4, 0.4)],
    phase: range(0, Math.PI * 2),
    roughness: range(0.02, 0.06),
    vertexJitter: Array.from({ length: 6 }, () => range(-0.008, 0.008)),
    bandWidthJitter: Array.from({ length: 7 }, () => range(0.9, 1.1)),
  };
}
