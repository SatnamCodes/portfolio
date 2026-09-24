export type Vec2 = readonly [number, number];

// Red → violet, matching the order of the spectrum tokens.
export const WAVELENGTHS_NM = [700, 620, 580, 530, 470, 440, 400] as const;

// Real crown glass spreads the spectrum by ~1.5°, which is invisible at this scale.
// The index range is exaggerated ~9× but keeps Cauchy's 1/λ² spacing, so violet still bends most
// and the violet end fans wider than the red end.
const N_RED = 1.47;
const N_SPAN = 0.16;

export function refractiveIndex(wavelengthNm: number, dispersion: number): number {
  const cauchy = (l: number) => 1 / (l * l);
  const f = (cauchy(wavelengthNm) - cauchy(700)) / (cauchy(400) - cauchy(700));
  return N_RED + N_SPAN * dispersion * f;
}

const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
const scale = (a: Vec2, k: number): Vec2 => [a[0] * k, a[1] * k];
const dot = (a: Vec2, b: Vec2) => a[0] * b[0] + a[1] * b[1];
const normalize = (a: Vec2): Vec2 => scale(a, 1 / Math.hypot(a[0], a[1]));
export const lerp2 = (a: Vec2, b: Vec2, t: number): Vec2 => add(a, scale(sub(b, a), t));

function outwardNormal(p: Vec2, q: Vec2, centroid: Vec2): Vec2 {
  const e = sub(q, p);
  let n = normalize([-e[1], e[0]]);
  if (dot(n, sub(p, centroid)) < 0) n = scale(n, -1);
  return n;
}

// `n` faces the incident side; eta = n1 / n2.
function refract(d: Vec2, n: Vec2, eta: number): Vec2 | null {
  const cosi = -dot(n, d);
  const k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) return null;
  return normalize(add(scale(d, eta), scale(n, eta * cosi - Math.sqrt(k))));
}

function raySegment(o: Vec2, d: Vec2, p: Vec2, q: Vec2): number | null {
  const e = sub(q, p);
  const denom = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(denom) < 1e-9) return null;
  const w = sub(p, o);
  const t = (w[0] * e[1] - w[1] * e[0]) / denom;
  const u = (w[0] * d[1] - w[1] * d[0]) / denom;
  return t > 1e-6 && u >= 0 && u <= 1 ? t : null;
}

export type Triangle = { apex: Vec2; left: Vec2; right: Vec2 };

export function equilateral(side: number, jitter: readonly number[] = []): Triangle {
  const h = (side * Math.sqrt(3)) / 2;
  const j = (i: number) => (jitter[i] ?? 0) * side;
  return {
    apex: [j(0), (2 * h) / 3 + j(1)],
    left: [-side / 2 + j(2), -h / 3 + j(3)],
    right: [side / 2 + j(4), -h / 3 + j(5)],
  };
}

export type Band = { index: number; n: number; internalEnd: Vec2; exitDir: Vec2 };
export type Trace = { entry: Vec2; incomingDir: Vec2; bands: Band[] };

/**
 * White light enters the left face (apex→left edge) at `entryT`, travelling at `angle` radians,
 * and each wavelength refracts twice (in through the left face, out through the right face).
 */
export function traceDispersion(
  tri: Triangle,
  angle: number,
  entryT: number,
  dispersion: number,
): Trace {
  const centroid: Vec2 = [
    (tri.apex[0] + tri.left[0] + tri.right[0]) / 3,
    (tri.apex[1] + tri.left[1] + tri.right[1]) / 3,
  ];
  const entry = lerp2(tri.left, tri.apex, entryT);
  const incomingDir: Vec2 = [Math.cos(angle), Math.sin(angle)];
  const nIn = outwardNormal(tri.left, tri.apex, centroid);
  const exitFaces: [Vec2, Vec2][] = [
    [tri.apex, tri.right],
    [tri.left, tri.right],
  ];

  const bands: Band[] = [];
  WAVELENGTHS_NM.forEach((wl, index) => {
    const n = refractiveIndex(wl, dispersion);
    const inside = refract(incomingDir, nIn, 1 / n);
    if (!inside) return;
    for (const [p, q] of exitFaces) {
      const t = raySegment(entry, inside, p, q);
      if (t === null) continue;
      const hit = add(entry, scale(inside, t));
      const out = refract(inside, scale(outwardNormal(p, q, centroid), -1), n);
      if (out) bands.push({ index, n, internalEnd: hit, exitDir: out });
      return;
    }
  });
  return { entry, incomingDir, bands };
}

// On-screen size of the prism, shared by the WebGL scene and the drawn fallback.
export const PRISM_SCALE = 1.04;

// On phones the prism moves this many px left of its usual place, so the interests fit beside the fan.
export const narrowShift = (width: number) => (width < 768 ? width * 0.14 : 0);
