// Two more footer scenes, in the same brown line: Research (a chalkboard) and Shelves (reading).
// Each stands on the footer's rule: y = h is the ground.
import { ink, lerp, seg, type Sketch } from "./useSketch";

const setup = (ctx: CanvasRenderingContext2D) => {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
};

function head(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, tilt = 0) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,244,228,1)";
  ctx.fill();
  ctx.strokeStyle = ink(0.9);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // Messy hair.
  ctx.beginPath();
  for (let i = -4; i <= 4; i++) {
    ctx.moveTo(x + i * r * 0.2, y - r * 0.8);
    ctx.lineTo(
      x + i * r * 0.29 + (i % 2) * r * 0.2 + tilt,
      y - r * 1.45 - Math.abs(i % 3) * r * 0.15,
    );
  }
  ctx.stroke();
}

const path = (ctx: CanvasRenderingContext2D, pts: number[][], a = 0.85, w = 1.4) => {
  ctx.strokeStyle = ink(a);
  ctx.lineWidth = w;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
};

/** Research: a chalkboard fills with working; he steps back, scratches his head, and has it. */
export const labScene: Sketch = (ctx, w, h, time) => {
  setup(ctx);
  const t = time % 14;
  const k = Math.min(h / 150, 1.4);
  const x0 = Math.min(48, w * 0.04);
  const X = (x: number) => x0 + x * k,
    Y = (y: number) => h - (150 - y) * k;
  // The board on its easel.
  path(
    ctx,
    [
      [X(10), Y(150)],
      [X(30), Y(20)],
      [X(50), Y(150)],
    ],
    0.55,
  );
  path(
    ctx,
    [
      [X(150), Y(150)],
      [X(170), Y(20)],
      [X(190), Y(150)],
    ],
    0.55,
  );
  ctx.fillStyle = "rgba(62,39,35,0.9)";
  ctx.fillRect(X(20), Y(18), 160 * k, 84 * k);
  ctx.strokeStyle = ink(1);
  ctx.strokeRect(X(20), Y(18), 160 * k, 84 * k);
  // Chalk: the working appears as he writes, then is wiped at the end of the loop.
  const chalk = (a: number) => `rgba(255,244,228,${(a * (1 - seg(t, 12.8, 13.6))).toFixed(3)})`;
  const write = seg(t, 0.4, 6);
  ctx.strokeStyle = chalk(0.85);
  ctx.lineWidth = 1.2;
  // A curve and its axes.
  ctx.beginPath();
  ctx.moveTo(X(32), Y(90));
  ctx.lineTo(X(32), Y(30));
  ctx.moveTo(X(32), Y(90));
  ctx.lineTo(X(90), Y(90));
  const n = Math.floor(write * 3 * 40);
  for (let i = 0; i <= Math.min(40, n); i++) {
    const u = i / 40;
    const px = X(34 + u * 54),
      py = Y(88 - 50 * Math.exp(-((u - 0.45) ** 2) / 0.04));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.font = `italic ${11 * k}px Georgia, serif`;
  ctx.fillStyle = chalk(seg(t, 2.4, 3.2) * 0.9);
  ctx.fillText("∫ f(x) dx", X(100), Y(42));
  ctx.fillStyle = chalk(seg(t, 3.8, 4.6) * 0.9);
  ctx.fillText("σ² = E[x²] − μ²", X(100), Y(62));
  ctx.fillStyle = chalk(seg(t, 5.2, 6) * 0.9);
  ctx.fillText("∴ ?", X(100), Y(82));
  // The boy: writing, then back a step, head scratched, and then the answer.
  const back = seg(t, 6.4, 7.2) * (1 - seg(t, 12.6, 13.4));
  const bx = X(lerp(172, 206, back)),
    by = h;
  const legs = 26 * k;
  path(
    ctx,
    [
      [bx - 4 * k, by],
      [bx - 2 * k, by - legs],
    ],
    0.9,
    1.8,
  );
  path(
    ctx,
    [
      [bx + 4 * k, by],
      [bx + 2 * k, by - legs],
    ],
    0.9,
    1.8,
  );
  path(
    ctx,
    [
      [bx, by - legs],
      [bx, by - legs - 24 * k],
    ],
    0.9,
    2.2,
  );
  const writing = t < 6.2;
  const armEnd = writing
    ? [X(150 + Math.sin(t * 7) * 12), Y(40 + (t % 6) * 7)]
    : t > 7.4 && t < 9.6
      ? [bx + 3 * k, by - legs - 36 * k + Math.sin(t * 16) * 1.5 * k] // scratching his head
      : [bx - 8 * k, by - legs - 6 * k];
  path(ctx, [[bx, by - legs - 20 * k], armEnd], 0.9, 1.6);
  head(ctx, bx, by - legs - 32 * k, 8 * k, t > 7.4 && t < 9.6 ? Math.sin(t * 16) * k : 0);
  const eureka = seg(t, 9.8, 10.2) * (1 - seg(t, 12, 12.6));
  if (eureka > 0) {
    ctx.font = `${18 * k}px Georgia, serif`;
    ctx.fillStyle = ink(eureka);
    ctx.fillText("!", bx + 10 * k, by - legs - 48 * k);
  }
};

/** Shelves: sitting on a stack of books, reading; a page turns every few seconds. */
export const readingScene: Sketch = (ctx, w, h, time) => {
  setup(ctx);
  const t = time % 8;
  const k = Math.min(h / 140, 1.4);
  const right = w - Math.min(48, w * 0.04);
  const X = (x: number) => right - (200 - x) * k,
    Y = (y: number) => h - (140 - y) * k;
  // The stack: five books, a little crooked.
  const books = [
    [40, 128, 120, 12],
    [46, 116, 110, 12],
    [38, 104, 118, 12],
    [50, 92, 104, 12],
    [44, 80, 112, 12],
  ];
  books.forEach(([x, y, bw, bh], i) => {
    ctx.fillStyle = i % 2 ? "rgba(232,211,172,1)" : "rgba(245,230,204,1)";
    ctx.fillRect(X(x), Y(y), bw * k, bh * k);
    ctx.strokeStyle = ink(0.75);
    ctx.lineWidth = 1.1;
    ctx.strokeRect(X(x), Y(y), bw * k, bh * k);
    path(
      ctx,
      [
        [X(x + 8), Y(y + 3)],
        [X(x + 8), Y(y + bh - 3)],
      ],
      0.4,
      0.8,
    );
  });
  // A little pile on the floor beside it.
  path(
    ctx,
    [
      [X(170), Y(140)],
      [X(198), Y(140)],
      [X(198), Y(132)],
      [X(170), Y(132)],
      [X(170), Y(140)],
    ],
    0.6,
    1,
  );
  // The boy, sitting on top; his feet swing.
  const sx = X(100),
    sy = Y(80);
  const swing = Math.sin(time * 2.2) * 4 * k;
  path(
    ctx,
    [
      [sx - 6 * k, sy],
      [sx - 12 * k, sy + 14 * k],
      [sx - 10 * k + swing, sy + 30 * k],
    ],
    0.9,
    1.8,
  );
  path(
    ctx,
    [
      [sx + 2 * k, sy],
      [sx - 4 * k, sy + 14 * k],
      [sx - 2 * k - swing, sy + 30 * k],
    ],
    0.9,
    1.8,
  );
  path(
    ctx,
    [
      [sx, sy],
      [sx + 2 * k, sy - 26 * k],
    ],
    0.9,
    2.2,
  );
  // The open book in his hands, and a page turning.
  const bkx = sx - 16 * k,
    bky = sy - 20 * k;
  path(
    ctx,
    [
      [bkx - 14 * k, bky + 2 * k],
      [bkx, bky + 6 * k],
      [bkx + 14 * k, bky + 2 * k],
    ],
    0.85,
    1.3,
  );
  path(
    ctx,
    [
      [bkx - 14 * k, bky + 2 * k],
      [bkx - 14 * k, bky - 10 * k],
      [bkx, bky - 6 * k],
      [bkx + 14 * k, bky - 10 * k],
      [bkx + 14 * k, bky + 2 * k],
    ],
    0.85,
    1.3,
  );
  path(
    ctx,
    [
      [bkx, bky - 6 * k],
      [bkx, bky + 6 * k],
    ],
    0.6,
    1,
  );
  const flip = seg(t, 6, 6.8);
  if (flip > 0 && flip < 1) {
    const ang = Math.PI * flip;
    path(
      ctx,
      [
        [bkx, bky - 6 * k],
        [bkx + Math.cos(ang) * 14 * k, bky - 10 * k - Math.sin(ang) * 6 * k],
        [bkx + Math.cos(ang) * 14 * k, bky + 2 * k - Math.sin(ang) * 6 * k],
        [bkx, bky + 6 * k],
      ],
      0.7,
      1,
    );
  }
  path(
    ctx,
    [
      [sx + 2 * k, sy - 22 * k],
      [bkx + 6 * k, bky],
    ],
    0.9,
    1.5,
  ); // arms
  path(
    ctx,
    [
      [sx + 2 * k, sy - 20 * k],
      [bkx - 6 * k, bky + 2 * k],
    ],
    0.9,
    1.5,
  );
  head(ctx, sx - 2 * k, sy - 36 * k, 8 * k);
};
