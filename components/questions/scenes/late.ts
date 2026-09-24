// Scenes 7–12: infinity → self-reference → the machine → the human page → convergence → prism.
import { illustrationLayout } from "@/components/home/PrismIllustration";
import { spectrum } from "@/lib/tokens";
import {
  easeInOut,
  easeOut,
  type Env,
  fade,
  ink,
  lerp,
  type Layout,
  rng,
  seg,
} from "../engine/core";
import { caption, circlePts, handwrite, linePts, mathText, type Pt, stroke } from "../engine/ink";
import { glow } from "../engine/texture";
import { euclid, fieldLines, table, tape, TURING_STATES } from "./geometry";

// Cantor's table: row n lists the binary digits of the n-th sequence (seeded, fixed).
function digits(rows: number, cols: number) {
  const r = rng(1891);
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => (r() > 0.5 ? 1 : 0)),
  );
}

/** 07. Cantor: list every sequence, then build one that isn't on the list. */
export function sceneCantor(e: Env, L: Layout) {
  const { t, ctx } = e;
  const g = table(L);
  const d = digits(g.rows, g.cols);
  const keepDiag = t < 78.5 ? 1 : 1 - seg(t, 86, 87.5); // the diagonal survives into Gödel
  const out = 1 - seg(t, 78, 79.4);
  // The lattice left behind by Einstein's grid.
  for (let i = 0; i <= g.cols; i++)
    stroke(
      e,
      [
        [g.x0 + i * g.cell, g.y0],
        [g.x0 + i * g.cell, g.y0 + g.rows * g.cell],
      ],
      1,
      0.6,
      0.45 * out,
    );
  for (let j = 0; j <= g.rows; j++)
    stroke(
      e,
      [
        [g.x0, g.y0 + j * g.cell],
        [g.x0 + g.cols * g.cell, g.y0 + j * g.cell],
      ],
      1,
      0.6,
      0.45 * out,
    );
  ctx.save();
  ctx.font = `400 ${g.cell * 0.5}px ${e.fonts.body}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let j = 0; j < g.rows; j++)
    for (let i = 0; i < g.cols; i++) {
      const at = 70.2 + j * 0.28 + i * 0.03;
      const onDiag = i === j;
      const a = seg(t, at, at + 0.3) * (onDiag ? Math.max(out, keepDiag * 0.9) : out);
      if (a <= 0) continue;
      ctx.fillStyle = ink(a * (onDiag && t > 73.5 ? 1 : 0.75));
      ctx.fillText(String(d[j][i]), g.x0 + (i + 0.5) * g.cell, g.y0 + (j + 0.5) * g.cell);
    }
  // Row labels and the ellipses of "and so on, forever".
  ctx.font = `400 ${g.cell * 0.34}px ${e.fonts.meta}`;
  for (let j = 0; j < g.rows; j++) {
    ctx.fillStyle = `rgba(125,96,85,${(0.8 * out * seg(t, 70.2 + j * 0.28, 70.6 + j * 0.28)).toFixed(3)})`;
    ctx.fillText(String(j + 1), g.x0 - g.cell * 0.45, g.y0 + (j + 0.5) * g.cell);
  }
  ctx.fillStyle = ink(0.6 * out * seg(t, 72.4, 73));
  ctx.font = `400 ${g.cell * 0.5}px ${e.fonts.body}`;
  ctx.fillText("…", g.x0 + (g.cols + 0.5) * g.cell, g.y0 + g.rows * g.cell * 0.5);
  ctx.fillText("⋮", g.x0 + g.cols * g.cell * 0.5, g.y0 + (g.rows + 0.45) * g.cell);
  ctx.restore();
  // The diagonal.
  const diag: Pt[] = [
    [g.x0 + g.cell * 0.15, g.y0 + g.cell * 0.15],
    [g.x0 + g.cols * g.cell - g.cell * 0.15, g.y0 + g.rows * g.cell - g.cell * 0.15],
  ];
  stroke(e, linePts(diag[0], diag[1], 40, 0.8, 11), easeInOut(seg(t, 73.5, 75)), 1.6, keepDiag);
  // The new sequence: every diagonal digit flipped. It differs from row n at place n.
  const ny = g.y0 + (g.rows + 1.35) * g.cell;
  ctx.save();
  ctx.font = `400 ${g.cell * 0.5}px ${e.fonts.body}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < g.cols; i++) {
    const a = seg(t, 75.2 + i * 0.15, 75.6 + i * 0.15) * out;
    ctx.fillStyle = ink(a);
    ctx.fillText(String(1 - d[i][i]), g.x0 + (i + 0.5) * g.cell, ny);
  }
  ctx.restore();
  handwrite(
    e,
    "≠ every row",
    seg(t, 76.6, 77.6),
    out,
    g.x0 + g.cols * g.cell + g.cell * 0.3,
    ny,
    Math.max(14, g.cell * 0.42),
  );
  handwrite(
    e,
    "ℵ₀ < 2^ℵ₀",
    seg(t, 77, 78),
    out * 0.9,
    g.x0,
    g.y0 - g.cell * 0.6,
    Math.max(14, g.cell * 0.45),
  );
}

/** 08. Gödel: around the same diagonal, a sentence that speaks about itself. */
export function sceneGodel(e: Env, L: Layout) {
  const { t, ctx } = e;
  const g = table(L);
  const cx = L.dx,
    cy = g.y0 + (g.rows * g.cell) / 2;
  const a = fade(t, 80.4, 81.6, 86, 87);
  const size = Math.max(18, L.R * 0.2);
  // The page folds inward a little: the system turning back on itself.
  const fold = Math.sin(seg(t, 83.5, 86) * Math.PI) * 0.12;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(1, 0, -fold, 1 - fold * 0.5, 0, 0);
  ctx.translate(-cx, -cy);
  mathText(e, "G  ⟺  ¬ Prov ( ⌜G⌝ )", a, cx, cy - L.R * 1.05, size, "center");
  // The loop: an arrow leaves the end of the sentence and curls back to point at its own G.
  ctx.save();
  ctx.font = `italic 400 ${size}px ${e.fonts.body}`;
  const fw = ctx.measureText("G  ⟺  ¬ Prov ( ⌜G⌝ )").width;
  ctx.restore();
  const fy = cy - L.R * 1.05;
  const x1 = cx + fw / 2 - size * 0.4;
  const x0 = cx - fw / 2 + size * 0.25;
  const loop: Pt[] = [];
  for (let i = 0; i <= 60; i++) {
    const th = (i / 60) * Math.PI;
    loop.push([lerp(x1, x0, (1 - Math.cos(th)) / 2), fy + size * 0.7 + Math.sin(th) * size * 1.1]);
  }
  const lp = easeInOut(seg(t, 82, 83.6));
  stroke(e, loop, lp, 1, a * 0.8);
  if (lp > 0.98)
    stroke(
      e,
      [
        [x0 - size * 0.18, fy + size * 0.95],
        [x0, fy + size * 0.7],
        [x0 + size * 0.2, fy + size * 0.92],
      ],
      1,
      1,
      a * 0.8,
    );
  handwrite(
    e,
    "“this sentence is not provable”",
    seg(t, 83.4, 85),
    a * 0.75,
    cx,
    cy + L.R * 1.25,
    Math.max(13, size * 0.62),
    "center",
  );
  ctx.restore();
  // Gödel numbers flicker along the diagonal: statements become numbers.
  const nums = fade(t, 81, 82, 86, 87.2);
  if (nums > 0) {
    ctx.save();
    ctx.font = `400 ${g.cell * 0.28}px ${e.fonts.meta}`;
    ctx.fillStyle = `rgba(125,96,85,${(nums * 0.7).toFixed(3)})`;
    for (let i = 0; i < g.cols; i++)
      ctx.fillText(
        String(2 ** (i + 1) * 3 ** (i % 3)),
        g.x0 + (i + 0.9) * g.cell,
        g.y0 + (i + 0.3) * g.cell,
      );
    ctx.restore();
  }
}

/** 09. Turing: a tape, a head, a table of states. It prints 0 1 0 1 … (his first example). */
export function sceneTuring(e: Env, L: Layout) {
  const { t, w, ctx } = e;
  const { T, y } = tape(L, w);
  const a = seg(t, 88, 89.2);
  const out = 1 - seg(t, 99.2, 100.4);
  const steps = Math.max(0, Math.floor((t - 89.2) / 0.5));
  const headCell = steps; // one square right per step
  const scroll = Math.max(0, headCell - Math.floor((w * 0.55) / T)) * T;
  const x0 = -scroll + ((t - 89.2) % 0.5) * 0;
  ctx.save();
  // The tape runs off both edges of the page.
  stroke(
    e,
    [
      [0, y - T / 2],
      [w, y - T / 2],
    ],
    1,
    1,
    a,
  );
  stroke(
    e,
    [
      [0, y + T / 2],
      [w, y + T / 2],
    ],
    1,
    1,
    a,
  );
  ctx.font = `400 ${T * 0.5}px ${e.fonts.body}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const first = Math.floor(scroll / T) - 1;
  for (let i = first; i < first + Math.ceil(w / T) + 3; i++) {
    const x = x0 + i * T;
    stroke(
      e,
      [
        [x, y - T / 2],
        [x, y + T / 2],
      ],
      1,
      0.7,
      a * 0.8 * out,
    );
    if (i >= 0 && i < headCell && i % 2 === 0) {
      ctx.fillStyle = ink(out);
      ctx.fillText(i % 4 === 0 ? "0" : "1", x + T / 2, y + 1);
    }
  }
  // The head, with its state.
  if (t > 89.2) {
    const hx = x0 + headCell * T + T / 2;
    const hy = y - T * 0.95;
    stroke(
      e,
      [
        [hx - T * 0.3, hy - T * 0.3],
        [hx + T * 0.3, hy - T * 0.3],
        [hx, hy + T * 0.12],
        [hx - T * 0.3, hy - T * 0.3],
      ],
      1,
      1.2,
      out,
    );
    handwrite(
      e,
      TURING_STATES[steps % 4],
      1,
      out,
      hx,
      hy - T * 0.7,
      Math.max(14, T * 0.42),
      "center",
    );
  }
  ctx.restore();
  // The table of behaviour, in the margin.
  const tab = fade(t, 90, 91, 95.5, 96.5);
  const tx = L.align === "center" ? w / 2 : L.dx - L.R * 0.2;
  const ty = y + T * 1.4;
  const rows = ["b  →  P0, R  →  c", "c  →  R  →  e", "e  →  P1, R  →  f", "f  →  R  →  b"];
  rows.forEach((r, i) =>
    mathText(
      e,
      r,
      tab * 0.85,
      tx,
      ty + i * T * 0.45,
      Math.max(12, T * 0.3),
      L.align === "center" ? "center" : "left",
    ),
  );
}

/** 10. Keats: the tape becomes a ruled page; the earlier diagrams show through, like memory. */
export function sceneKeats(e: Env, L: Layout) {
  const { t, w, h } = e;
  const { y } = tape(L, w);
  const open = easeOut(seg(t, 100, 101.6));
  const out = 1 - seg(t, 109.2, 110.4);
  const rules = 9;
  const top = h * 0.2,
    gap = (h * 0.62) / rules;
  for (let i = 0; i < rules; i++) {
    const yy = lerp(y, top + i * gap, open);
    stroke(
      e,
      [
        [w * 0.12, yy],
        [w * 0.88, yy],
      ],
      1,
      0.5,
      0.18 * out * seg(t, 100, 100.6),
    );
  }
  // Memory soaking through the paper.
  memories(e, L, 0.07 * fade(t, 101, 103, 108.6, 110) + 0.1 * seg(t, 108.6, 110.6));
  const s = Math.min(w * (e.portrait ? 0.065 : 0.036), 40);
  handwrite(
    e,
    "“…uncertainties, Mysteries, doubts…”",
    seg(t, 101.4, 104.6),
    out,
    w / 2,
    h * 0.42,
    s,
    "center",
  );
}

/** Every earlier drawing, faint; used where the story remembers itself. */
export function memories(e: Env, L: Layout, a: number) {
  if (a <= 0.004) return;
  const { A, B, C, r } = euclid(L);
  stroke(e, circlePts(A[0], A[1], r, 100, 0.7, 1), 1, 0.8, a);
  stroke(e, [A, B, C, A], 1, 0.8, a);
  fieldLines(L).forEach((p) => stroke(e, p, 1, 0.6, a * 0.8));
  const g = table(L);
  for (let i = 0; i <= g.cols; i += 2)
    stroke(
      e,
      [
        [g.x0 + i * g.cell, g.y0],
        [g.x0 + i * g.cell, g.y0 + g.rows * g.cell],
      ],
      1,
      0.5,
      a * 0.6,
    );
}

/** 11. The roads meet: the diagrams coexist for a moment while the cloud flows through them. */
export function sceneConvergence(e: Env, L: Layout) {
  const { t } = e;
  memories(e, L, 0.12 * fade(t, 109.6, 110.6, 117.5, 119.2));
}

/** 12. The prism: one beam in, a spectrum out, and then one beam again. Then the page rests. */
export function scenePrism(e: Env, L: Layout, colophon: string) {
  const { t, w, h, ctx } = e;
  const lay = illustrationLayout(w, h * 0.9, e.portrait ? w * 0.9 : w * 0.8);
  const shiftY = h * 0.03;
  const P = (p: readonly [number, number]): Pt => [p[0], p[1] + shiftY];
  const [start, entry] = [P(lay.start), P(lay.entry)];
  // The white beam arrives from the convergence point.
  const beamIn = easeInOut(seg(t, 120, 121.6));
  const bx = lerp(start[0], entry[0], beamIn),
    byy = lerp(start[1], entry[1], beamIn);
  ctx.save();
  ctx.lineCap = "round";
  const white = (x1: number, y1: number, x2: number, y2: number, wid: number, alpha: number) => {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, `rgba(255,255,255,0)`);
    g.addColorStop(0.3, `rgba(255,255,250,${alpha})`);
    g.addColorStop(1, `rgba(255,255,250,${alpha})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = wid;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(200,180,150,${(alpha * 0.35).toFixed(3)})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  };
  white(start[0], start[1], bx, byy, 3, 0.95);
  glow(e, bx, byy, 40, 0.5 * seg(t, 120.2, 121));
  // The glass: the site's prism, drawn in the illustration's geometry.
  const tri = lay.triangle.map(P);
  const glass = seg(t, 120.4, 121.8);
  if (glass > 0) {
    ctx.beginPath();
    tri.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    const gg = ctx.createLinearGradient(tri[1][0], tri[0][1], tri[2][0], tri[1][1]);
    gg.addColorStop(0, `rgba(255,255,255,${(0.55 * glass).toFixed(3)})`);
    gg.addColorStop(1, `rgba(232,211,172,${(0.35 * glass).toFixed(3)})`);
    ctx.fillStyle = gg;
    ctx.fill();
    ctx.strokeStyle = ink(0.55 * glass);
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  // Dispersion, then recombination: the bands' far ends drift back together and whiten.
  const bands = seg(t, 121.8, 124);
  const rejoin = easeInOut(seg(t, 128.6, 131.2));
  const colors = Object.values(spectrum);
  const mid = P(lay.ends[3]);
  const midIn = P(lay.internal[3]);
  if (bands > 0) {
    lay.ends.forEach((end0, i) => {
      const inner = P(lay.internal[i]);
      const endP = P(end0);
      const ex = lerp(endP[0], mid[0], rejoin),
        ey = lerp(endP[1], mid[1], rejoin);
      const ix = lerp(inner[0], midIn[0], rejoin),
        iy = lerp(inner[1], midIn[1], rejoin);
      const p = easeOut(clampSeg(bands, i));
      const x2 = lerp(ix, ex, p),
        y2 = lerp(iy, ey, p);
      // Inside the glass: faint.
      ctx.strokeStyle = `rgba(255,255,255,${(0.5 * bands).toFixed(3)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(entry[0], entry[1]);
      ctx.lineTo(ix, iy);
      ctx.stroke();
      const c = colors[i];
      const g = ctx.createLinearGradient(ix, iy, ex, ey);
      g.addColorStop(0, mix(c, "#ffffff", rejoin));
      g.addColorStop(1, hexA(mix(c, "#ffffff", rejoin), 0.15));
      ctx.strokeStyle = g;
      ctx.lineWidth = 5.5 * (1 - rejoin * 0.5);
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }
  ctx.restore();
  // The colophon: the page ends here.
  caption(e, colophon, seg(t, 133, 135) * 0.8, w / 2, h - 40, "center");
  stroke(
    e,
    [
      [w / 2 - 20, h - 52],
      [w / 2 + 20, h - 52],
    ],
    1,
    0.6,
    seg(t, 133, 135) * 0.4,
  );
}

const clampSeg = (x: number, i: number) => Math.min(1, Math.max(0, x * 1.4 - i * 0.06));
function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16),
    pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, t));
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}
const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
