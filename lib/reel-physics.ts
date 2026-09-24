// Film-reel motion: a strip position with momentum, friction, a magnetic settle on the nearest frame,
// and a slow idle run. The second reel follows the first through a spring, so it lags and catches up.

export type Reel = { x: number; v: number };

export const FRICTION = 3.4; // 1/s: velocity halves in ~0.2s
const SNAP_STIFFNESS = 70;
const SNAP_DAMPING = 2 * 0.85 * Math.sqrt(SNAP_STIFFNESS);
const SNAP_BELOW = 90; // px/s: slower than this, the nearest frame starts to pull
export const IDLE_AFTER = 1.5; // s without input before the film starts running on its own
export const IDLE_SPEED = 48; // px/s: a visible, unhurried run
const FOLLOW_STIFFNESS = 38;
const FOLLOW_DAMPING = 2 * 0.7 * Math.sqrt(FOLLOW_STIFFNESS);

export const wrap = (x: number, span: number) => ((x % span) + span) % span;

export function nearestFrame(x: number, frame: number) {
  return Math.round(x / frame) * frame;
}

/** Advances the lead reel. `idle` is seconds since the last input; `reduced` removes all inertia. */
export function stepLead(r: Reel, dt: number, frame: number, idle: number, reduced: boolean) {
  const h = Math.min(dt, 1 / 30);
  if (reduced) {
    r.v = 0;
    r.x = nearestFrame(r.x, frame);
    return;
  }
  if (idle > IDLE_AFTER) {
    // Running on its own: ease towards a slow constant speed, never snapping.
    r.v += (IDLE_SPEED - r.v) * Math.min(1, h * 1.5);
  } else {
    r.v *= Math.exp(-FRICTION * h);
    if (Math.abs(r.v) < SNAP_BELOW) {
      const a = SNAP_STIFFNESS * (nearestFrame(r.x, frame) - r.x) - SNAP_DAMPING * r.v;
      r.v += a * h;
    }
  }
  r.x += r.v * h;
}

/** The second reel runs the other way at `ratio` of the lead's position, on a spring. */
export function stepFollower(f: Reel, lead: Reel, dt: number, ratio: number, reduced: boolean) {
  const target = -lead.x * ratio;
  if (reduced) {
    f.x = target;
    f.v = 0;
    return;
  }
  const h = Math.min(dt, 1 / 30);
  const a = FOLLOW_STIFFNESS * (target - f.x) - FOLLOW_DAMPING * f.v;
  f.v += a * h;
  f.x += f.v * h;
}

/**
 * Where a frame sits on the curved strip. `x` is its signed distance from the strip's centre (px);
 * the strip bends around a vertical cylinder of radius `radius`, and sags (`bow` px at the edge of
 * `halfWidth`) so the two reels bow away from each other.
 */
export function placeOnCurve(x: number, radius: number, bow: number, halfWidth: number) {
  const theta = x / radius;
  const clamped = Math.max(-1.4, Math.min(1.4, theta));
  const edge = Math.min(1, Math.abs(x) / halfWidth);
  return {
    x: radius * Math.sin(clamped),
    z: radius * (Math.cos(clamped) - 1),
    y: bow * edge * edge,
    rotateY: (clamped * 180) / Math.PI,
  };
}
