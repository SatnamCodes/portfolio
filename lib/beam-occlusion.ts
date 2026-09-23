import type { Vec2 } from "./prism-optics";

export type Segment = {
  from: Vec2;
  to: Vec2;
  halfWidth: number;
  // Width multiplier at the far end (exit bands widen as they travel).
  spread: number;
  // Segment whose shadow falls on this one; -1 for the source beam.
  parent: number;
};

// The cursor is a disc of this radius (scene units) held in the plane of the light.
export const OBSTRUCTION_RADIUS = 0.2;
// A hand never blocks light perfectly: some always scatters past the edges.
const MAX_BLOCK = 0.92;
// Recovery may overshoot slightly past baseline, read as a brief brightening.
const MIN_AMOUNT = -0.1;

// Engage fast (critically damped, follows the cursor), release slowly with a little overshoot.
export const ENGAGE = { stiffness: 260, damping: 2 * Math.sqrt(260) };
export const RELEASE = { stiffness: 20, damping: 2 * 0.5 * Math.sqrt(20) };

export function coverage(p: Vec2, seg: Segment, radius = OBSTRUCTION_RADIUS) {
  const dx = seg.to[0] - seg.from[0];
  const dy = seg.to[1] - seg.from[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const rx = p[0] - seg.from[0];
  const ry = p[1] - seg.from[1];
  const t = (rx * ux + ry * uy) / len;
  if (t <= 0 || t >= 1) return { amount: 0, t };
  const d = Math.abs(rx * uy - ry * ux);
  const hw = seg.halfWidth * (1 + (seg.spread - 1) * t);
  // Fraction of the beam's cross-section the disc covers: 0 when grazing, 1 when it spans the core.
  const overlap = (radius + hw - d) / (2 * Math.min(radius, hw));
  const x = Math.min(1, Math.max(0, overlap));
  return { amount: x * x * (3 - 2 * x) * MAX_BLOCK, t };
}

export type SpringState = { x: number; v: number };

export function stepSpring(s: SpringState, target: number, dt: number) {
  const { stiffness, damping } = target > s.x ? ENGAGE : RELEASE;
  const a = stiffness * (target - s.x) - damping * s.v;
  s.v += a * dt;
  s.x = Math.max(MIN_AMOUNT, Math.min(1, s.x + s.v * dt));
  if (s.x === MIN_AMOUNT || s.x === 1) s.v = 0;
}

export class OcclusionField {
  readonly amount: SpringState[];
  readonly at: number[];
  readonly upstream: number[];

  constructor(readonly segments: Segment[]) {
    this.amount = segments.map(() => ({ x: 0, v: 0 }));
    this.at = segments.map(() => 0.5);
    this.upstream = segments.map(() => 0);
  }

  // `pointer` is in the segments' 2D space, or null when nothing obstructs the light.
  step(pointer: Vec2 | null, dt: number) {
    const h = Math.min(dt, 1 / 30);
    this.segments.forEach((seg, i) => {
      const c = pointer ? coverage(pointer, seg) : { amount: 0, t: this.at[i] };
      if (c.amount > 0.001) this.at[i] += (c.t - this.at[i]) * Math.min(1, h * 30);
      stepSpring(this.amount[i], c.amount, h);
    });
    this.segments.forEach((_, i) => {
      let transmitted = 1;
      for (let p = this.segments[i].parent; p >= 0; p = this.segments[p].parent) {
        transmitted *= 1 - Math.max(0, this.amount[p].x);
      }
      this.upstream[i] = 1 - transmitted;
    });
  }

  get settled() {
    return this.amount.every((s) => Math.abs(s.x) < 1e-3 && Math.abs(s.v) < 1e-3);
  }
}
