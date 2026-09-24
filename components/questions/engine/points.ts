// Point clouds: the connective tissue. Any drawing can be sampled into N points and flow into any
// other, so words become geometry, field lines become equations, equations become a wave.
import { clamp, easeInOut, type Env, ink, rng } from "./core";

export const N = 520;
export type Cloud = Float32Array; // [x0,y0,x1,y1,…]

const cache = new Map<string, Cloud>();
export function cached(key: string, make: () => Cloud) {
  let c = cache.get(key);
  if (!c) {
    c = make();
    cache.set(key, c);
  }
  return c;
}
export const clearClouds = () => cache.clear();

function resample(pts: number[][], seed: number): Cloud {
  const out = new Float32Array(N * 2);
  if (!pts.length) return out;
  const r = rng(seed);
  // Keep a stable order along x so morphs sweep rather than scramble.
  const pick = Array.from({ length: N }, () => pts[Math.floor(r() * pts.length)]).sort(
    (a, b) => a[0] - b[0],
  );
  pick.forEach((p, i) => {
    out[i * 2] = p[0];
    out[i * 2 + 1] = p[1];
  });
  return out;
}

/** Points on the ink of some text, drawn at (x, y). */
export function textCloud(
  text: string,
  font: string,
  size: number,
  x: number,
  y: number,
  align: CanvasTextAlign,
  maxW = 9999,
): Cloud {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.font = `400 ${size}px ${font}`;
  const lines = text.split("\n");
  const tw = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)));
  const lh = size * 1.15;
  c.width = Math.ceil(tw + size);
  c.height = Math.ceil(lh * lines.length + size * 0.6);
  ctx.font = `400 ${size}px ${font}`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000";
  lines.forEach((l, i) => ctx.fillText(l, size / 2, i * lh + size * 0.2));
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const ox = align === "center" ? x - c.width / 2 : align === "right" ? x - c.width : x - size / 2;
  const oy = y - c.height / 2;
  const pts: number[][] = [];
  const step = Math.max(1, Math.round(size / 18));
  for (let py = 0; py < c.height; py += step)
    for (let px = 0; px < c.width; px += step)
      if (data[(py * c.width + px) * 4 + 3] > 140) pts.push([ox + px, oy + py]);
  return resample(pts, text.length * 31 + size);
}

export function pathCloud(paths: number[][][], seed = 7): Cloud {
  // Even spacing along the paths.
  const segs: [number[], number[], number][] = [];
  let total = 0;
  for (const p of paths)
    for (let i = 1; i < p.length; i++) {
      const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      segs.push([p[i - 1], p[i], l]);
      total += l;
    }
  const pts: number[][] = [];
  const r = rng(seed);
  for (let i = 0; i < N; i++) {
    let d = r() * total;
    for (const [a, b, l] of segs) {
      if (d <= l) {
        const f = d / (l || 1);
        pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
        break;
      }
      d -= l;
    }
  }
  return resample(pts, seed);
}

export function pointCloud(x: number, y: number, spread = 1): Cloud {
  const r = rng(99);
  const pts = Array.from({ length: N }, () => [x + (r() - 0.5) * spread, y + (r() - 0.5) * spread]);
  return resample(pts, 5);
}

/** Draws the cloud part-way between two shapes. Each point leaves at its own moment, so the
 *  change reads as a flow; the cursor gently pushes ink aside. */
export function morph(e: Env, a: Cloud, b: Cloud, p: number, alpha: number, size = 1.3) {
  if (alpha <= 0.002) return;
  const { ctx, pointer } = e;
  ctx.fillStyle = ink(alpha);
  const r = rng(3);
  for (let i = 0; i < N; i++) {
    const delay = r() * 0.45;
    const q = easeInOut(clamp((p - delay) / 0.55));
    const ax = a[i * 2],
      ay = a[i * 2 + 1],
      bx = b[i * 2],
      by = b[i * 2 + 1];
    // Curved paths: a sideways swing that peaks mid-flight.
    const sw = Math.sin(q * Math.PI) * (r() - 0.5) * 60;
    let x = ax + (bx - ax) * q + sw * 0.4;
    let y = ay + (by - ay) * q + sw * 0.25;
    if (pointer.active) {
      const dx = x - pointer.x,
        dy = y - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 6400) {
        const k = (1 - d2 / 6400) * 10;
        const d = Math.sqrt(d2) || 1;
        x += (dx / d) * k;
        y += (dy / d) * k;
      }
    }
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }
}
