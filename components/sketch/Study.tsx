import { ink, lerp, seg, type Sketch } from "./useSketch";

const LOOP = 12;

// A small room: window, shelf, desk and lamp. A boy with messy hair writes; every few seconds he
// stops, looks up, thinks (dots rise), and goes back to the page, where new lines appear.
export const studyScene: Sketch = (ctx, w, h, time) => {
  const t = time % LOOP;
  // Sits in the bottom-right corner; the room's floor is the footer's line.
  const k = Math.min(h / 170, w / 420);
  const ox = w - 345 * k - Math.min(48, w * 0.04),
    oy = h - 168 * k;
  const X = (x: number) => ox + x * k,
    Y = (y: number) => oy + y * k;
  const line = (pts: number[][], a = 0.8, wd = 1.2) => {
    ctx.strokeStyle = ink(a);
    ctx.lineWidth = wd;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
    ctx.stroke();
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // The room.
  line(
    [
      [40, 30],
      [110, 30],
      [110, 95],
      [40, 95],
      [40, 30],
    ],
    0.45,
  ); // window
  line(
    [
      [75, 30],
      [75, 95],
    ],
    0.3,
  );
  line(
    [
      [40, 62],
      [110, 62],
    ],
    0.3,
  );
  // A moon in the window, because it's late.
  ctx.beginPath();
  ctx.arc(X(96), Y(44), 5 * k, 0, Math.PI * 2);
  ctx.strokeStyle = ink(0.4);
  ctx.stroke();
  line(
    [
      [250, 48],
      [330, 48],
    ],
    0.45,
  ); // shelf
  for (let i = 0; i < 6; i++)
    line(
      [
        [256 + i * 9, 48],
        [256 + i * 9 + (i === 4 ? 4 : 0), 30 + (i % 3) * 3],
      ],
      0.45,
      3.2,
    );
  // Desk.
  line(
    [
      [150, 118],
      [320, 118],
    ],
    0.85,
    1.6,
  );
  line(
    [
      [160, 118],
      [160, 168],
    ],
    0.7,
  );
  line(
    [
      [310, 118],
      [310, 168],
    ],
    0.7,
  );
  // Lamp, with its warm pool of light.
  const glow = ctx.createRadialGradient(X(292), Y(112), 0, X(292), Y(112), 70 * k);
  glow.addColorStop(0, `rgba(255,214,150,${0.45 + 0.04 * Math.sin(time * 3)})`);
  glow.addColorStop(1, "rgba(255,214,150,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(X(220), Y(40), 150 * k, 90 * k);
  line(
    [
      [300, 118],
      [300, 84],
      [284, 70],
    ],
    0.8,
  );
  line(
    [
      [276, 62],
      [296, 74],
      [284, 82],
      [272, 70],
      [276, 62],
    ],
    0.8,
  );
  // Paper, with lines appearing as he writes.
  line(
    [
      [205, 117],
      [262, 117],
    ],
    0.5,
  );
  const writing = t < 4 || (t > 7 && t < 11);
  const lines = Math.min(4, Math.floor(seg(t, 0, 4) * 2.5 + seg(t, 7, 11) * 2));
  for (let i = 0; i < lines; i++) {
    const len = i === lines - 1 && writing ? ((t * 12) % 30) + 8 : 36 - (i % 2) * 8;
    line(
      [
        [212, 110 - i * 4],
        [212 + len, 110 - i * 4],
      ],
      0.5,
      0.8,
    );
  }
  // The boy: chair, body, head, messy hair. Thinking tilts his head up.
  const think = seg(t, 4, 4.6) * (1 - seg(t, 6.4, 7));
  line(
    [
      [150, 168],
      [150, 120],
      [128, 120],
      [128, 168],
    ],
    0.55,
  ); // chair
  line(
    [
      [170, 120],
      [174, 92],
    ],
    0.9,
    2.2,
  ); // back
  line(
    [
      [170, 120],
      [196, 120],
      [198, 168],
    ],
    0.8,
    1.6,
  ); // legs under the desk
  const hx = 176 + 2 * (1 - think),
    hy = 84 - 3 * think;
  ctx.beginPath();
  ctx.arc(X(hx), Y(hy), 9 * k, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,244,228,1)";
  ctx.fill();
  ctx.strokeStyle = ink(0.9);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (let i = -4; i <= 4; i++)
    line(
      [
        [hx + i * 1.8, hy - 7],
        [hx + i * 2.6 + (i % 2) * 2, hy - 13 - Math.abs(i % 3) * 1.5],
      ],
      0.85,
      1.2,
    );
  // Writing arm: the pen moves along the line; when thinking, it rests at his chin.
  const penX = writing ? 212 + (((t * 12) % 30) + 6) : lerp(214, 186, think);
  const penY = writing
    ? 108 - Math.min(3, lines - 1) * 4 + Math.sin(t * 22) * 0.8
    : lerp(108, hy + 6, think);
  line(
    [
      [176, 96],
      [194, 108],
      [penX, penY],
    ],
    0.85,
    1.6,
  );
  line(
    [
      [penX, penY],
      [penX + 4, penY - 7],
    ],
    0.9,
    1,
  );
  // Thought dots.
  if (think > 0)
    for (let i = 0; i < 3; i++) {
      const a = seg(t, 4.5 + i * 0.35, 4.9 + i * 0.35) * (1 - seg(t, 6.3, 6.9));
      ctx.beginPath();
      ctx.arc(X(hx + 12 + i * 7), Y(hy - 14 - i * 8), (1.5 + i) * k, 0, Math.PI * 2);
      ctx.strokeStyle = ink(0.6 * a);
      ctx.stroke();
    }
};
