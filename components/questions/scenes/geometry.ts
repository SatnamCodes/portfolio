// Geometry shared across scenes, so the object that ends one scene is exactly the object that
// begins the next (Euclid's circle becomes Newton's earth, Einstein's grid becomes Cantor's table).
import type { Layout } from "../engine/core";
import type { Pt } from "../engine/ink";

export function euclid(L: Layout) {
  const r = L.R * (L.align === "center" ? 0.62 : 0.72);
  const A: Pt = [L.dx - r / 2, L.dy + r * 0.25];
  const B: Pt = [L.dx + r / 2, L.dy + r * 0.25];
  const C: Pt = [L.dx, A[1] - r * Math.sin(Math.PI / 3)];
  return { A, B, C, r };
}

export function earth(L: Layout) {
  const r0 = L.R * 0.42;
  const E: Pt = [L.dx, L.dy + L.R * 0.12];
  return { E, r0, M: [E[0], E[1] - r0 * 1.16] as Pt };
}

/** Newton's cannonball (Principia, De mundi systemate): shots from a mountain at rising speed
 *  fall farther, until one never lands and becomes an orbit. Integrated, not faked. */
export function cannonballs(L: Layout): Pt[][] {
  const { E, r0 } = earth(L);
  const rm = r0 * 1.16;
  const GM = 1;
  const vc = Math.sqrt(GM / rm);
  return [0.5, 0.66, 0.8, 0.9, 1].map((f) => {
    let x = 0,
      y = -rm,
      vx = vc * f,
      vy = 0,
      angle = 0,
      prev = Math.atan2(y, x);
    const pts: Pt[] = [[E[0] + x, E[1] + y]];
    const dt = (rm * 0.004) / vc;
    for (let i = 0; i < 20000; i++) {
      const r = Math.hypot(x, y);
      const a = -GM / (r * r * r);
      vx += a * x * dt;
      vy += a * y * dt;
      x += vx * dt;
      y += vy * dt;
      const ang = Math.atan2(y, x);
      let d = ang - prev;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      angle += d;
      prev = ang;
      if (i % 6 === 0) pts.push([E[0] + x, E[1] + y]);
      if (Math.hypot(x, y) < r0 || Math.abs(angle) >= Math.PI * 2) break;
    }
    return pts;
  });
}

/** Lines of force of a bar magnet (a dipole): r = k·sin²θ about the magnet's axis. */
export function fieldLines(L: Layout): Pt[][] {
  const s = L.R * 0.95;
  const lines: Pt[][] = [];
  for (const k of [0.35, 0.55, 0.8, 1.1, 1.5]) {
    for (const sign of [-1, 1]) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 60; i++) {
        const th = 0.18 + (i / 60) * (Math.PI - 0.36);
        const r = k * s * Math.sin(th) ** 2;
        pts.push([L.dx + r * Math.cos(th), L.dy + sign * r * Math.sin(th)]);
      }
      lines.push(pts);
    }
  }
  return lines;
}

export function axisLine(L: Layout): Pt[] {
  return [
    [L.dx - L.R * 1.7, L.dy],
    [L.dx + L.R * 1.7, L.dy],
  ];
}

export const MAXWELL = [
  "∇ · E = ρ / ε₀",
  "∇ · B = 0",
  "∇ × E = − ∂B/∂t",
  "∇ × B = μ₀J + μ₀ε₀ ∂E/∂t",
];
export function equations(L: Layout) {
  const size = Math.max(16, L.R * (L.align === "center" ? 0.2 : 0.17));
  const x = L.dx - L.R * (L.align === "center" ? 0.95 : 0.9);
  return MAXWELL.map((text, i) => ({ text, x, y: L.dy - size * 2.4 + i * size * 1.6, size }));
}

export function table(L: Layout) {
  const cols = L.align === "center" ? 6 : 8;
  const rows = cols;
  const cell = L.R * (L.align === "center" ? 0.3 : 0.24);
  const x0 = L.dx - (cols * cell) / 2;
  const y0 = L.dy - (rows * cell) / 2 - cell * 0.3;
  return { cols, rows, cell, x0, y0 };
}

export function tape(L: Layout, w: number) {
  const T = L.align === "center" ? Math.max(30, w / 9) : Math.min(58, Math.max(40, w / 24));
  return { T, y: L.dy };
}

// Turing's first example machine (1936, §3): prints 0 1 0 1 … on alternate squares.
export const TURING_STATES = ["b", "c", "e", "f"] as const;
