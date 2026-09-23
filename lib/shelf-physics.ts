// A small rigid-body-ish model for one shelf of books. Each book has four spring-driven degrees of freedom:
// lift (px up), pull (px toward the viewer), turn (rotateY, deg) and tip (rotateZ about its foot, deg).
// Books have mass from their size, lean into gaps opened by a pulled neighbour, wobble when the hand
// brushes past them fast, and knock their neighbours when they are pushed back hard.

export type Pose = { lift: number; pull: number; turn: number; tip: number };
const KEYS = ["lift", "pull", "turn", "tip"] as const;

export type BookBody = {
  mass: number;
  flat: boolean;
  x: Pose;
  v: Pose;
  hold: "focus" | "touch" | null;
  wasOut: boolean;
};

export const INFLUENCE = 150;
const STIFFNESS = 240;
const DAMPING = 2 * 0.62 * Math.sqrt(STIFFNESS);
const PULLED: Pose = { lift: 12, pull: 28, turn: 0, tip: 0 };
const REST: Pose = { lift: 0, pull: 0, turn: 0, tip: 0 };
const MAX_PULL = 42;

export function massFor(width: number, height: number) {
  return 0.7 + ((width * height) / (54 * 230)) * 0.9;
}

export function body(width: number, height: number, flat: boolean): BookBody {
  return {
    mass: massFor(width, height),
    flat,
    x: { ...REST },
    v: { ...REST },
    hold: null,
    wasOut: false,
  };
}

export type Centre = { x: number; y: number } | null;

export type StepInput = {
  dt: number;
  pointer: { x: number; y: number; vx: number } | null;
  centres: Centre[];
  reduced: boolean;
};

// Target pose for one book from the hand's position (0 when out of reach).
export function reach(pointer: { x: number; y: number }, c: { x: number; y: number }): Pose {
  const dx = pointer.x - c.x;
  const d = Math.hypot(dx, (pointer.y - c.y) * 0.5);
  if (d > INFLUENCE) return { ...REST };
  const t = (1 - d / INFLUENCE) ** 2;
  const side = Math.max(-1, Math.min(1, dx / INFLUENCE));
  return { lift: 16 * t, pull: MAX_PULL * t, turn: -side * 16 * t, tip: side * 2 * t };
}

/** Advances the shelf; returns true while anything is still moving. */
export function step(books: BookBody[], { dt, pointer, centres, reduced }: StepInput): boolean {
  const h = Math.min(dt, 1 / 30);
  const targets = books.map((b, i) => {
    if (b.hold) return { ...PULLED };
    const c = centres[i];
    return pointer && c ? reach(pointer, c) : { ...REST };
  });

  // A pulled-out book opens a gap; its neighbours lean into it.
  books.forEach((b, i) => {
    if (b.flat) return;
    const out = (j: number) =>
      books[j] ? Math.min(1, Math.max(0, books[j].x.pull / MAX_PULL)) : 0;
    targets[i].tip += 3.2 * out(i + 1) - 3.2 * out(i - 1);
  });

  let moving = false;
  books.forEach((b, i) => {
    const target = targets[i];
    if (b.flat) {
      target.turn = 0;
      target.tip = 0;
    }
    if (reduced) {
      b.x = { ...target };
      b.v = { ...REST };
      return;
    }
    // The hand brushing past fast pushes the spines it passes.
    if (pointer && centres[i] && !b.flat) {
      const t = reach(pointer, centres[i]!).pull / MAX_PULL;
      b.v.tip += (Math.max(-130, Math.min(130, pointer.vx * 0.02)) * t) / b.mass;
    }
    for (const k of KEYS) {
      const a = (STIFFNESS * (target[k] - b.x[k]) - DAMPING * b.v[k]) / b.mass;
      b.v[k] += a * h;
      b.x[k] += b.v[k] * h;
      if (Math.abs(b.v[k]) > 0.02 || Math.abs(target[k] - b.x[k]) > 0.02) moving = true;
    }
    // Pushed back hard: a knock that the neighbours feel.
    if (b.x.pull > 20) b.wasOut = true;
    if (b.wasOut && b.x.pull < 3 && b.v.pull < -60) {
      b.wasOut = false;
      const knock = Math.min(1, -b.v.pull / 300) * 22;
      if (books[i - 1] && !books[i - 1].flat) books[i - 1].v.tip -= knock / books[i - 1].mass;
      if (books[i + 1] && !books[i + 1].flat) books[i + 1].v.tip += knock / books[i + 1].mass;
      moving = true;
    }
  });
  return moving;
}

// How a book's pose reads as light: a shadow cast on the back of the case (light from the upper left).
export function shadowFor(p: Pose) {
  return {
    x: 5 + p.pull * 0.2 - p.tip * 0.6,
    y: 4 + p.lift * 0.55 + p.pull * 0.12,
    scale: 1 + p.pull * 0.004,
    opacity: Math.max(0.08, 0.26 - p.pull * 0.0035),
    contact: 0.55 * Math.max(0, 1 - p.lift / 10),
  };
}
