// Scenes 1–6: a question → geometry → motion → field → equations → light.
import {
  easeInOut,
  easeOut,
  type Env,
  fade,
  ink,
  lerp,
  type Layout,
  seg,
  wobble,
} from "../engine/core";
import { circlePts, dot, handwrite, linePts, mathText, type Pt, stroke } from "../engine/ink";
import { glow } from "../engine/texture";
import { axisLine, cannonballs, earth, equations, euclid, fieldLines, table } from "./geometry";

export const Q1 = "What is knowledge?";
export const q1Size = (e: Env) => Math.min(e.w * (e.portrait ? 0.085 : 0.075), 84);

/** 01. A single mark becomes a question. Behind it, a faint engraved medallion. */
export function sceneQuestion(e: Env) {
  const { t, w, h } = e;
  const cx = w / 2,
    cy = h * 0.42;
  dot(e, cx, cy, 3.2 * easeOut(seg(t, 0.3, 1.2)), 1 - seg(t, 1.6, 2.4));
  // The engraving: concentric hatching, like the ground of an old portrait plate.
  const eng = fade(t, 1.5, 4, 7.4, 9) * 0.08;
  if (eng > 0.002) {
    const R = Math.min(w, h) * 0.24;
    for (let i = 0; i < 22; i++)
      stroke(e, circlePts(cx, cy, R * (0.3 + i * 0.033), 90, 0.6, i), 1, 0.5, eng);
  }
  handwrite(e, Q1, seg(t, 1.2, 4.8), 1 - seg(t, 7.6, 8.4), cx, cy, q1Size(e), "center");
}

/** 02. Euclid, Elements I.1: on a given line, construct an equilateral triangle. */
export function sceneEuclid(e: Env, L: Layout) {
  const { t } = e;
  const { A, B, C, r } = euclid(L);
  const out = 1 - seg(t, 20.5, 21.8); // everything but circle A leaves before Newton
  // Circle A, set down by the arriving ink, then traced by the compass.
  stroke(e, circlePts(A[0], A[1], r, 140, 0.7, 1), 1, 1.1, seg(t, 10.6, 11.6));
  // The compass: hinge above, one leg at the centre, one on the circle.
  const compass = (c: Pt, a: number, alpha: number) => {
    if (alpha <= 0.01) return;
    const tip: Pt = [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
    const hinge: Pt = [
      (c[0] + tip[0]) / 2 + Math.sin(a) * r * 0.1,
      (c[1] + tip[1]) / 2 - Math.abs(Math.cos(a)) * r * 0.55 - r * 0.2,
    ];
    stroke(e, [c, hinge, tip], 1, 1.4, alpha * 0.85);
    dot(e, hinge[0], hinge[1], 3, alpha);
  };
  compass(A, -Math.PI / 2 + seg(t, 11.2, 13) * Math.PI * 2, fade(t, 11, 11.4, 12.8, 13.2));
  stroke(e, linePts(A, B, 20, 0.5, 2), easeInOut(seg(t, 12.6, 13.8)), 1.1, out);
  stroke(
    e,
    circlePts(B[0], B[1], r, 140, 0.7, 3, Math.PI),
    easeInOut(seg(t, 13.8, 15.6)),
    1.1,
    out,
  );
  compass(B, Math.PI + seg(t, 13.8, 15.6) * Math.PI * 2, fade(t, 13.6, 14, 15.4, 15.9) * out);
  stroke(e, linePts(A, C, 20, 0.5, 4), easeInOut(seg(t, 15.8, 16.8)), 1.3, out);
  stroke(e, linePts(B, C, 20, 0.5, 5), easeInOut(seg(t, 16.4, 17.4)), 1.3, out);
  const lab = fade(t, 16.8, 17.6, 20.5, 21.5);
  const s = Math.max(14, r * 0.14);
  handwrite(e, "A", 1, lab, A[0] - s * 0.9, A[1] + s * 0.6, s);
  handwrite(e, "B", 1, lab, B[0] + s * 0.4, B[1] + s * 0.6, s);
  handwrite(e, "C", 1, lab, C[0] - s * 0.3, C[1] - s * 0.9, s);
  // The proposition, in the margin (Heath's translation of Elements I.1).
  const note = fade(t, 17.2, 18.2, 20.2, 21.2);
  const nx = L.align === "center" ? L.dx : L.dx - r * 1.5;
  const ny = A[1] + r * (L.align === "center" ? 1.35 : 1.25);
  handwrite(
    e,
    "Prop. I.",
    seg(t, 17.2, 17.9),
    note,
    nx,
    ny,
    s * 1.05,
    L.align === "center" ? "center" : "left",
  );
  handwrite(
    e,
    "On a given finite straight line to construct an equilateral triangle.",
    seg(t, 17.6, 19.6),
    note * 0.85,
    nx,
    ny + s * 1.5,
    s * 0.8,
    L.align === "center" ? "center" : "left",
  );
}

/** 03. Newton's cannonball: the thrown stone and the Moon obey one law. */
export function sceneNewton(e: Env, L: Layout) {
  const { t } = e;
  const { A, r } = euclid(L);
  const { E, r0, M } = earth(L);
  // Euclid's circle becomes the Earth.
  const k = easeInOut(seg(t, 22, 23.6));
  const leave = 1 - seg(t, 32.6, 33.8);
  stroke(
    e,
    circlePts(lerp(A[0], E[0], k), lerp(A[1], E[1], k), lerp(r, r0, k), 140, 0.7, 1),
    1,
    1.1,
    t < 33 ? 1 : leave,
  );
  // The mountain.
  stroke(
    e,
    [
      [M[0] - r0 * 0.18, E[1] - r0 * 0.98],
      [M[0], M[1]],
      [M[0] + r0 * 0.18, E[1] - r0 * 0.98],
    ],
    seg(t, 23.4, 24),
    1.1,
    leave,
  );
  // Shots, one after another; the last goes all the way round.
  const shots = cannonballs(L);
  shots.forEach((path, i) => {
    const t0 = 24.2 + i * 1.35;
    const p = seg(t, t0, t0 + (i === shots.length - 1 ? 2.6 : 1.1));
    const last = i === shots.length - 1;
    stroke(e, path, p, last ? 1.2 : 0.8, (last ? 1 : 0.55) * (last ? (t < 33 ? 1 : leave) : leave));
    if (p > 0 && p < 1) {
      const j = Math.min(path.length - 1, Math.floor(p * (path.length - 1)));
      dot(e, path[j][0], path[j][1], 3, 1);
    }
  });
  // The Moon keeps going: same law, farther out.
  const mo = fade(t, 28.5, 29.5, 32.4, 33.4);
  if (mo > 0) {
    const a = t * 0.5;
    const rr = L.R * 1.25;
    stroke(e, circlePts(E[0], E[1], rr, 160, 0.4, 9), 1, 0.6, mo * 0.35);
    dot(e, E[0] + Math.cos(a) * rr, E[1] + Math.sin(a) * rr, 4.5, mo);
  }
  const eq = fade(t, 28.8, 29.8, 32.2, 33.2);
  const s = Math.max(18, L.R * 0.16);
  const ex = L.align === "center" ? L.dx : L.dx + L.R * 1.05;
  const ey = L.align === "center" ? E[1] + L.R * 1.45 : E[1] - L.R * 0.9;
  handwrite(
    e,
    "F = G m₁m₂ / r²",
    seg(t, 28.8, 30.4),
    eq,
    ex,
    ey,
    s,
    L.align === "center" ? "center" : "left",
  );
}

/** 04. Faraday: the space between is full of lines of force. */
export function sceneFaraday(e: Env, L: Layout) {
  const { t, w } = e;
  const out = 1 - seg(t, 44.2, 45.4);
  const inA = seg(t, 34.6, 35.4);
  const R = L.R;
  // The one remaining line: the magnet's axis.
  stroke(e, linePts(axisLine(L)[0], axisLine(L)[1], 30, 0.4, 6), 1, 0.9, inA * out * 0.8);
  // The bar magnet moves in and out of the coil; the needle answers (induction needs change).
  const shift = Math.sin(seg(t, 40, 44) * Math.PI * 3) * R * 0.18 * seg(t, 40, 40.6);
  const vel = Math.cos(seg(t, 40, 44) * Math.PI * 3) * seg(t, 40, 40.6) * (1 - seg(t, 43.6, 44));
  const mx = L.dx + shift;
  const mw = R * 0.62,
    mh = R * 0.16;
  const mag = seg(t, 35.4, 36.4) * out;
  if (mag > 0) {
    e.ctx.fillStyle = `rgba(255,244,228,${mag})`;
    e.ctx.fillRect(mx - mw / 2, L.dy - mh / 2, mw, mh);
    stroke(
      e,
      [
        [mx - mw / 2, L.dy - mh / 2],
        [mx + mw / 2, L.dy - mh / 2],
        [mx + mw / 2, L.dy + mh / 2],
        [mx - mw / 2, L.dy + mh / 2],
        [mx - mw / 2, L.dy - mh / 2],
      ],
      1,
      1.2,
      mag,
    );
    stroke(
      e,
      [
        [mx, L.dy - mh / 2],
        [mx, L.dy + mh / 2],
      ],
      1,
      0.8,
      mag,
    );
    const s = Math.max(12, mh * 0.6);
    handwrite(e, "S", 1, mag, mx - mw / 4, L.dy + 1, s, "center");
    handwrite(e, "N", 1, mag, mx + mw / 4, L.dy + 1, s, "center");
  }
  // Lines of force, drawn out from the poles.
  const lines = fieldLines(L);
  lines.forEach((pts, i) => {
    const moved = pts.map(([x, y]) => [x + shift, y] as Pt);
    stroke(
      e,
      moved,
      easeInOut(seg(t, 36 + (i >> 1) * 0.45, 38.2 + (i >> 1) * 0.45)),
      0.8,
      out * 0.75,
    );
  });
  // Iron filings: short dashes laid along the field.
  const fil = fade(t, 37.5, 39.5, 44, 45) * 0.35;
  if (fil > 0) {
    e.ctx.strokeStyle = ink(fil);
    e.ctx.lineWidth = 0.8;
    e.ctx.beginPath();
    for (let i = 0; i < 180; i++) {
      const gx = L.dx + (wobble(i * 1.37, 3) * 0.5 + ((i * 0.618) % 1) - 0.5) * R * 3.2;
      const gy = L.dy + (((i * 0.382) % 1) - 0.5) * R * 2.2;
      const x = gx - mx,
        y = gy - L.dy;
      const r2 = x * x + y * y;
      if (r2 < (R * 0.35) ** 2) continue;
      // Dipole field direction along x: B ∝ (3x² − r², 3xy) / r⁵
      const bx = 3 * x * x - r2,
        by = 3 * x * y;
      const bl = Math.hypot(bx, by) || 1;
      const d = 4;
      e.ctx.moveTo(gx - (bx / bl) * d, gy - (by / bl) * d);
      e.ctx.lineTo(gx + (bx / bl) * d, gy + (by / bl) * d);
    }
    e.ctx.stroke();
  }
  // Coil and galvanometer.
  const coil = seg(t, 38.6, 40) * out;
  if (coil > 0 && w > 500) {
    const cx = L.dx + R * 1.25,
      cy = L.dy;
    const loops: Pt[] = [];
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 12;
      loops.push([
        cx - R * 0.25 + (i / 120) * R * 0.5 + Math.cos(a) * 3,
        cy + Math.sin(a) * R * 0.2,
      ]);
    }
    stroke(e, loops, coil, 0.8, 0.8);
    const gx = cx + R * 0.1,
      gy = cy + R * 0.75;
    stroke(
      e,
      [
        [cx + R * 0.25, cy],
        [cx + R * 0.35, gy - R * 0.15],
      ],
      coil,
      0.7,
      0.6,
    );
    stroke(e, circlePts(gx, gy, R * 0.15, 60, 0.4, 8), coil, 1, 0.9);
    const ang = -Math.PI / 2 + vel * 0.9;
    stroke(
      e,
      [
        [gx, gy],
        [gx + Math.cos(ang) * R * 0.13, gy + Math.sin(ang) * R * 0.13],
      ],
      coil,
      1.4,
      1,
    );
  }
}

/** 05. Maxwell: the same lines, in mathematics; the mathematics predicts a wave. */
export function sceneMaxwell(e: Env, L: Layout) {
  const { t, w, ctx } = e;
  const eqs = equations(L);
  const show = fade(t, 48.2, 49.2, 53, 54);
  eqs.forEach((q, i) => mathText(e, q.text, show * (i === 3 ? 1 : 0.92), q.x, q.y, q.size));
  // The margin note: displacement current, Maxwell's own addition, the term that makes waves.
  const note = fade(t, 50.4, 51.4, 53, 53.8);
  const last = eqs[3];
  ctx.save();
  ctx.font = `italic 400 ${last.size}px ${e.fonts.body}`;
  const lw = ctx.measureText("∇ × B = μ₀J + ").width;
  const tw = ctx.measureText("μ₀ε₀ ∂E/∂t").width;
  ctx.restore();
  stroke(
    e,
    circlePts(last.x + lw + tw / 2, last.y, tw * 0.62, 70, 1.2, 4),
    seg(t, 50.4, 51.4),
    0.9,
    note,
  );
  // The wave: born from the equations, accelerating, becoming light.
  const wv = seg(t, 54.6, 55.2) * (1 - seg(t, 57.4, 58.2));
  if (wv > 0) {
    const speed = 2 + seg(t, 54.6, 57) ** 2 * 26;
    const amp = L.R * 0.35 * (1 - seg(t, 55.8, 57));
    const k = (Math.PI * 2) / (L.R * (1.2 - seg(t, 54.6, 57) * 0.7));
    const pts: Pt[] = [];
    for (let x = 0; x <= w; x += 4)
      pts.push([x, L.dy + Math.sin(x * k - t * speed) * amp * Math.min(1, x / (w * 0.15))]);
    stroke(e, pts, 1, 1.2 + seg(t, 55.5, 57) * 1.5, wv);
    const light = seg(t, 55.6, 57);
    if (light > 0) {
      ctx.fillStyle = `rgba(255,251,242,${(light * 0.82).toFixed(3)})`;
      ctx.fillRect(0, 0, w, e.h);
    }
  }
}

/** 06. Einstein: light's speed is fixed, so time must give. Then geometry becomes gravity. */
export function sceneEinstein(e: Env, L: Layout) {
  const { t, w, h, ctx } = e;
  // The whiteout clears, leaving one beam.
  const clear = 1 - seg(t, 57, 58.6);
  if (clear > 0) {
    ctx.fillStyle = `rgba(255,251,242,${(clear * 0.82).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  }
  const out = 1 - seg(t, 67.2, 68.4);
  // The beam runs below the carriage, clear of the question.
  const by = L.dy + L.R * 1.15;
  glow(e, w / 2, by, w * 0.5, 0.25 * out * seg(t, 57, 58));
  stroke(
    e,
    [
      [0, by],
      [w, by],
    ],
    1,
    1.4,
    0.85 * out,
  );
  const px = ((t * 0.35) % 1) * w;
  glow(e, px, by, 30, 0.9 * out);
  dot(e, px, by, 2.5, out);

  // The light clock: a photon bounces between two mirrors in a moving carriage. At rest it
  // goes straight up and down; seen from the platform it zigzags, so it has farther to go.
  const R = L.R;
  const cw = R * 0.55,
    ch = R * 0.9;
  const baseY = L.dy + R * 0.55;
  const clockIn = seg(t, 59, 60) * out;
  const travel = ((t - 59) * R * 0.18) % (R * 2.2);
  const carX = L.dx - R * 1.1 + travel;
  if (clockIn > 0) {
    stroke(
      e,
      [
        [carX - cw / 2, baseY - ch],
        [carX + cw / 2, baseY - ch],
      ],
      1,
      1.4,
      clockIn,
    );
    stroke(
      e,
      [
        [carX - cw / 2, baseY],
        [carX + cw / 2, baseY],
      ],
      1,
      1.4,
      clockIn,
    );
    const period = 1.4;
    const ph = ((t - 59) % period) / period;
    const py = ph < 0.5 ? baseY - ch * ph * 2 : baseY - ch * (2 - ph * 2);
    dot(e, carX, py, 3, clockIn);
    // Its zigzag, as the platform sees it.
    const trail: Pt[] = [];
    for (let i = 0; i <= 40; i++) {
      const tt = t - 59 - i * 0.05;
      if (tt < 0) break;
      const p2 = (tt % period) / period;
      trail.push([
        L.dx - R * 1.1 + ((tt * R * 0.18) % (R * 2.2)),
        p2 < 0.5 ? baseY - ch * p2 * 2 : baseY - ch * (2 - p2 * 2),
      ]);
    }
    stroke(e, trail, 1, 0.7, clockIn * 0.4);
    // Ground line.
    stroke(
      e,
      [
        [L.dx - R * 1.6, baseY + 6],
        [L.dx + R * 1.6, baseY + 6],
      ],
      1,
      0.6,
      clockIn * 0.5,
    );
  }
  // Two clocks: the moving one runs slow.
  const clocks = seg(t, 60.5, 61.5) * out;
  const drawClock = (x: number, y: number, rate: number, label: string) => {
    const r = R * 0.17;
    stroke(e, circlePts(x, y, r, 60, 0.4, x), 1, 1, clocks);
    const a = -Math.PI / 2 + (t - 60.5) * rate * 1.6;
    stroke(
      e,
      [
        [x, y],
        [x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8],
      ],
      1,
      1.3,
      clocks,
    );
    handwrite(e, label, 1, clocks * 0.8, x, y + r + 14, Math.max(12, r * 0.55), "center");
  };
  const cy = L.dy - R * 0.35;
  const off = e.portrait ? Math.min(R * 1.2, e.w / 2 - R * 0.3) : R * 1.5;
  drawClock(L.dx - off, e.portrait ? cy - R * 0.55 : cy, 1, "at rest");
  drawClock(L.dx + off, e.portrait ? cy - R * 0.55 : cy, 0.62, "moving");
  const eq = fade(t, 62.5, 63.5, 66.8, 67.8);
  handwrite(
    e,
    "t′ = γ ( t − v x / c² )",
    seg(t, 62.5, 64),
    eq,
    L.dx,
    L.dy - R * 0.62,
    Math.max(16, R * 0.15),
    "center",
  );

  // The coordinate grid, then curvature: geometry becomes gravity (1915). At the end it
  // straightens into the lattice Cantor's table will use.
  const g = table(L);
  const gridA = seg(t, 63.5, 65) * (t < 69.5 ? 1 : 0);
  if (gridA > 0) {
    const bend = seg(t, 65, 67) * (1 - seg(t, 68, 69.4));
    const extra = 1;
    const outer = 1 - seg(t, 68, 69.4);
    const warp = (x: number, y: number): Pt => {
      const dx = x - L.dx,
        dy = y - L.dy;
      const d2 = dx * dx + dy * dy;
      const f = bend * R * 0.9 * Math.exp(-d2 / (R * R * 1.2));
      const d = Math.sqrt(d2) || 1;
      return [x - (dx / d) * f * 0.35, y - (dy / d) * f * 0.35 + f * 0.25];
    };
    for (let i = -extra; i <= g.cols + extra; i++) {
      const inside = i >= 0 && i <= g.cols;
      const a = gridA * (inside ? 0.45 : 0.45 * outer);
      if (a < 0.01) continue;
      const x = g.x0 + i * g.cell;
      const pts: Pt[] = [];
      for (let j = -extra * 4; j <= (g.rows + extra) * 4; j++) {
        const y = g.y0 + (j / 4) * g.cell;
        if (!inside || (j >= 0 && j <= g.rows * 4)) pts.push(warp(x, y));
      }
      stroke(e, pts, 1, 0.6, a);
    }
    for (let j = -extra; j <= g.rows + extra; j++) {
      const inside = j >= 0 && j <= g.rows;
      const a = gridA * (inside ? 0.45 : 0.45 * outer);
      if (a < 0.01) continue;
      const y = g.y0 + j * g.cell;
      const pts: Pt[] = [];
      for (let i = -extra * 4; i <= (g.cols + extra) * 4; i++) {
        const x = g.x0 + (i / 4) * g.cell;
        if (!inside || (i >= 0 && i <= g.cols * 4)) pts.push(warp(x, y));
      }
      stroke(e, pts, 1, 0.6, a);
    }
    // The mass that curves it.
    dot(e, L.dx, L.dy, 5 * bend, bend);
  }
}
