// Hand-drawn ink: strokes that draw on, circles and lines with a slight tremor, handwriting that
// is written left to right, and serif questions with a faint chromatic ghost.
import { clamp, easeInOut, type Env, ink, wobble } from "./core";

export type Pt = [number, number];

export function circlePts(
  cx: number,
  cy: number,
  r: number,
  n = 120,
  tremor = 0.8,
  seed = 0,
  from = 0,
): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = from + (i / n) * Math.PI * 2;
    const rr = r + wobble(a * 2, seed) * tremor;
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
}

export function linePts(a: Pt, b: Pt, n = 24, tremor = 0.6, seed = 0): Pt[] {
  const out: Pt[] = [];
  const nx = -(b[1] - a[1]);
  const ny = b[0] - a[0];
  const len = Math.hypot(nx, ny) || 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const o = wobble(t * 6, seed) * tremor * Math.sin(Math.PI * t);
    out.push([
      a[0] + (b[0] - a[0]) * t + (nx / len) * o,
      a[1] + (b[1] - a[1]) * t + (ny / len) * o,
    ]);
  }
  return out;
}

/** Draws the first `progress` (0..1) of a polyline, with a faint second pass for ink bleed. */
export function stroke(e: Env, pts: Pt[], progress: number, width: number, alpha: number) {
  if (alpha <= 0.002 || progress <= 0 || pts.length < 2) return;
  const { ctx } = e;
  const upto = clamp(progress) * (pts.length - 1);
  const whole = Math.floor(upto);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [wmul, amul, off] of [
    [1, 1, 0],
    [2.2, 0.12, 0.35],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0] + off, pts[0][1] + off);
    for (let i = 1; i <= whole; i++) ctx.lineTo(pts[i][0] + off, pts[i][1] + off);
    if (whole < pts.length - 1) {
      const f = upto - whole;
      const a = pts[whole];
      const b = pts[whole + 1];
      ctx.lineTo(a[0] + (b[0] - a[0]) * f + off, a[1] + (b[1] - a[1]) * f + off);
    }
    ctx.strokeStyle = ink(alpha * amul);
    ctx.lineWidth = width * wmul;
    ctx.stroke();
  }
}

export function dot(e: Env, x: number, y: number, r: number, alpha: number, color = ink) {
  if (alpha <= 0.002 || r <= 0) return;
  e.ctx.beginPath();
  e.ctx.arc(x, y, r, 0, Math.PI * 2);
  e.ctx.fillStyle = color(alpha);
  e.ctx.fill();
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** A question: serif, dominant, arriving slowly out of soft focus. Faint red/blue ghosts give the
 *  analog mis-registration. Returns the height used. */
export function question(
  e: Env,
  text: string,
  alpha: number,
  x: number,
  y: number,
  maxW: number,
  size: number,
  align: CanvasTextAlign = "left",
  font = e.fonts.display,
) {
  if (alpha <= 0.002) return 0;
  const { ctx } = e;
  ctx.save();
  ctx.font = `400 ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  const lines = wrap(ctx, text, maxW);
  const lh = size * 1.12;
  lines.forEach((l, i) => {
    const yy = y + i * lh;
    ctx.fillStyle = `rgba(160,60,50,${(alpha * 0.1).toFixed(3)})`;
    ctx.fillText(l, x - 0.8, yy);
    ctx.fillStyle = `rgba(40,70,120,${(alpha * 0.08).toFixed(3)})`;
    ctx.fillText(l, x + 0.8, yy);
    ctx.fillStyle = ink(alpha);
    ctx.fillText(l, x, yy);
  });
  ctx.restore();
  return lines.length * lh;
}

/** The largest size ≤ `size` at which `text` fits in `maxW`. */
export function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  size: number,
  maxW: number,
) {
  ctx.save();
  ctx.font = `400 ${size}px ${font}`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w > maxW ? Math.floor((size * maxW) / w) : size;
}

/** Handwriting, written left to right: the reveal edge is soft, like wet ink catching up. */
export function handwrite(
  e: Env,
  text: string,
  progress: number,
  alpha: number,
  x: number,
  y: number,
  size: number,
  align: CanvasTextAlign = "left",
  font = e.fonts.fountain,
) {
  if (alpha <= 0.002 || progress <= 0) return;
  const { ctx } = e;
  size = fit(ctx, text, font, size, e.w * 0.9);
  ctx.save();
  ctx.font = `400 ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width;
  const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  const p = easeInOut(clamp(progress));
  const edge = left + (w + size) * p;
  const g = ctx.createLinearGradient(edge - size * 0.8, 0, edge, 0);
  g.addColorStop(0, ink(alpha));
  g.addColorStop(1, ink(0));
  ctx.beginPath();
  ctx.rect(left - size, y - size * 1.2, edge - left + size, size * 2.4);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function caption(
  e: Env,
  text: string,
  alpha: number,
  x: number,
  y: number,
  align: CanvasTextAlign = "left",
) {
  if (alpha <= 0.002) return;
  const { ctx } = e;
  ctx.save();
  ctx.font = `400 ${e.portrait ? 10 : 11}px ${e.fonts.meta}`;
  ctx.letterSpacing = "1.5px";
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = `rgba(125,96,85,${alpha.toFixed(3)})`;
  const upper = text.toUpperCase();
  if (ctx.measureText(upper).width <= e.w * 0.9) ctx.fillText(upper, x, y);
  else {
    // Too long for the width: break at " · ", then at the first comma if still too wide.
    const lines = upper
      .split(" · ")
      .flatMap((part) =>
        ctx.measureText(part).width > e.w * 0.9 && part.includes(", ")
          ? [part.slice(0, part.indexOf(", ") + 1), part.slice(part.indexOf(", ") + 2)]
          : [part],
      );
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * 15));
  }
  ctx.restore();
}

export function mathText(
  e: Env,
  text: string,
  alpha: number,
  x: number,
  y: number,
  size: number,
  align: CanvasTextAlign = "left",
) {
  if (alpha <= 0.002) return;
  const { ctx } = e;
  ctx.save();
  ctx.font = `italic 400 ${size}px ${e.fonts.body}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = ink(alpha);
  ctx.fillText(text, x, y);
  ctx.restore();
}
