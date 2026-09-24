"use client";

import { ease, ink, lerp, seg, type Sketch } from "./useSketch";
import s from "./sketch.module.css";

const LOOP = 16; // seconds, including a rest at the end

type P = [number, number];
const bez = (a: P, c: P, b: P, k: number): P => [
  (1 - k) ** 2 * a[0] + 2 * (1 - k) * k * c[0] + k * k * b[0],
  (1 - k) ** 2 * a[1] + 2 * (1 - k) * k * c[1] + k * k * b[1],
];

// Two roads in the same brown ink: the left one worn (footprints), the right one grassy and
// wanting wear. A schoolboy walks up, stops at the fork, looks down each, and takes the grassy one.
export const roadScene: Sketch = (ctx, w, h, time) => {
  const t = time % LOOP;
  const base: P = [w * 0.5, h + 4];
  const fork: P = [w * 0.5, h * 0.56];
  const L = { c: [w * 0.4, h * 0.34] as P, end: [w * 0.25, h * 0.1] as P };
  const R = { c: [w * 0.62, h * 0.32] as P, end: [w * 0.76, h * 0.06] as P };
  const width = (y: number) => lerp(6, Math.min(110, w * 0.12), (y / h) ** 1.3); // perspective: roads narrow into the distance
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // The wood: a few line-drawn trees on either side.
  const tree = (x: number, y: number, sc: number, a: number) => {
    ctx.strokeStyle = ink(0.35 * a);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 26 * sc);
    ctx.stroke();
    // Canopy: an irregular, scribbled outline, with a few inner strokes for leaves.
    ctx.beginPath();
    const cy = y - 34 * sc;
    for (let i = 0; i <= 28; i++) {
      const ang = (i / 28) * Math.PI * 2;
      const r = (11 + Math.sin(ang * 5 + x) * 3 + Math.sin(ang * 11 + y) * 1.5) * sc;
      const px = x + Math.cos(ang) * r * 1.1,
        py = cy + Math.sin(ang) * r * 0.9;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.strokeStyle = ink(0.3 * a);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 22 * sc);
    ctx.lineTo(x - 5 * sc, y - 32 * sc);
    ctx.moveTo(x, y - 25 * sc);
    ctx.lineTo(x + 6 * sc, y - 36 * sc);
    ctx.strokeStyle = ink(0.28 * a);
    ctx.stroke();
  };
  const woods = seg(t, 0, 1.2);
  for (const [fx, fy, sc] of [
    [0.08, 0.95, 1.4],
    [0.18, 0.7, 1.1],
    [0.12, 0.42, 0.8],
    [0.34, 0.22, 0.6],
    [0.5, 0.18, 0.5],
    [0.9, 0.9, 1.3],
    [0.82, 0.62, 1],
    [0.92, 0.36, 0.75],
    [0.62, 0.16, 0.55],
  ] as const)
    tree(w * fx, h * fy, sc * Math.max(1.6, h / 170), woods);

  // The roads: two edges each, drawn on.
  const roadDraw = ease(seg(t, 0.2, 1.4));
  const edge = (pts: P[], p: number, a: number) => {
    ctx.strokeStyle = ink(a);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const n = Math.max(1, Math.floor(pts.length * p));
    pts.slice(0, n).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };
  const trunk: P[] = Array.from({ length: 30 }, (_, i) => [
    lerp(base[0], fork[0], i / 29),
    lerp(base[1], fork[1], i / 29),
  ]);
  const branch = (c: P, end: P) => Array.from({ length: 40 }, (_, i) => bez(fork, c, end, i / 39));
  const left = branch(L.c, L.end);
  const right = branch(R.c, R.end);
  for (const side of [-1, 1]) {
    edge(
      trunk.map(([x, y]) => [x + (side * width(y)) / 2, y]),
      roadDraw,
      0.7,
    );
    edge(
      left.map(([x, y]) => [x + (side * width(y)) / 2, y]),
      roadDraw,
      0.6,
    );
    edge(
      right.map(([x, y]) => [x + (side * width(y)) / 2, y]),
      roadDraw,
      0.6,
    );
  }
  // Worn: many old footprints on the left road.
  ctx.fillStyle = ink(0.28 * roadDraw);
  for (let i = 2; i < 38; i += 1.5) {
    const [x, y] = left[Math.floor(i)];
    const o = (Math.floor(i) % 2 ? 1 : -1) * width(y) * 0.14;
    ctx.fillRect(x + o, y, 1.6, 2.2);
  }
  // Grassy: tufts across the right road.
  ctx.strokeStyle = ink(0.4 * roadDraw);
  ctx.lineWidth = 0.8;
  for (let i = 3; i < 38; i += 3) {
    const [x, y] = right[i];
    const g = width(y) * 0.3;
    for (const dx of [-g, g * 0.2]) {
      ctx.beginPath();
      ctx.moveTo(x + dx - 2, y);
      ctx.lineTo(x + dx, y - 4 * (y / h + 0.3));
      ctx.lineTo(x + dx + 2, y);
      ctx.stroke();
    }
  }

  // The boy's route: up the trunk, a pause at the fork, then the grassy road.
  const walk1 = ease(seg(t, 1.4, 5));
  const walk2 = seg(t, 7.6, 12.5);
  const onRight = t >= 7.6;
  const pos: P = onRight
    ? right[Math.min(39, Math.floor(walk2 * 39))]
    : [lerp(base[0], fork[0], walk1), lerp(h * 0.98, fork[1] + 4, walk1)];
  // His own footsteps on the grass: the road begins to be taken.
  if (onRight) {
    ctx.fillStyle = ink(0.55);
    for (let i = 1; i < Math.floor(walk2 * 39); i++) {
      const [x, y] = right[i];
      ctx.fillRect(x + (i % 2 ? 1.5 : -1.5), y, 1.6, 2.2);
    }
  }
  const scale = lerp(2.1, 0.55, (h - pos[1]) / h);
  const moving = (t > 1.4 && t < 5) || (t > 7.6 && t < 12.5);
  // Looking: left at 5.2–6.2, right at 6.2–7.2.
  const look = t < 5.2 || t > 7.4 ? 0 : t < 6.2 ? -1 : 1;
  boy(ctx, pos[0], pos[1], scale, moving ? t : 0, look, seg(t, 12.5, 14.5));
  // A question mark over his head while he decides.
  const q = seg(t, 5.1, 5.5) * (1 - seg(t, 7, 7.5));
  if (q > 0) {
    ctx.font = `${16 * scale}px Georgia, serif`;
    ctx.fillStyle = ink(0.7 * q);
    ctx.textAlign = "center";
    ctx.fillText("?", pos[0] + 10 * scale, pos[1] - 42 * scale);
  }
};

/** A schoolboy seen from behind: messy hair, a satchel, legs that swing when he walks. */
function boy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  k: number,
  walkT: number,
  look: number,
  gone: number,
) {
  const a = 1 - gone;
  if (a <= 0) return;
  const step = Math.sin(walkT * 9) * 4 * k;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = ink(0.9 * a);
  ctx.fillStyle = ink(0.9 * a);
  ctx.lineWidth = Math.max(1, 1.6 * k);
  ctx.beginPath(); // legs
  ctx.moveTo(-2 * k, -12 * k);
  ctx.lineTo(-2 * k + step * 0.4, 0);
  ctx.moveTo(2 * k, -12 * k);
  ctx.lineTo(2 * k - step * 0.4, 0);
  ctx.stroke();
  ctx.fillStyle = `rgba(245,230,204,${a})`; // shirt
  ctx.fillRect(-5 * k, -26 * k, 10 * k, 14 * k);
  ctx.strokeRect(-5 * k, -26 * k, 10 * k, 14 * k);
  ctx.fillStyle = ink(0.75 * a); // satchel
  ctx.fillRect(-4 * k, -24 * k, 8 * k, 9 * k);
  ctx.beginPath(); // head
  ctx.arc(look * 1.5 * k, -31 * k, 5 * k, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,244,228,${a})`;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath(); // messy hair
  for (let i = -3; i <= 3; i++) {
    ctx.moveTo(look * 1.5 * k + i * 1.4 * k, -35 * k);
    ctx.lineTo(look * 1.5 * k + i * 1.9 * k + (i % 2) * 1.2 * k, -38.5 * k - Math.abs(i % 3) * k);
  }
  ctx.stroke();
  ctx.restore();
}

/** Frost's lines, at the top of Roads. The drawing itself stands on the footer (SiteFooter). */
export function FrostQuote() {
  return (
    <blockquote className={s.quote}>
      <p>
        Two roads diverged in a wood, and I—
        <br />I took the one less traveled by,
      </p>
      <footer>Robert Frost, “The Road Not Taken” (1916)</footer>
    </blockquote>
  );
}
