// The archive: paper with fibres and a warm vignette, film grain, a faint horizontal texture,
// exposure breathing and dust. Restrained on purpose; it should be felt more than seen.
import { type Env, rng } from "./core";

export function paper(w: number, h: number, dpr: number) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * dpr);
  c.height = Math.ceil(h * dpr);
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#FFF4E4";
  ctx.fillRect(0, 0, w, h);
  const r = rng(11);
  // Fibres.
  for (let i = 0; i < (w * h) / 900; i++) {
    const x = r() * w,
      y = r() * h,
      l = 4 + r() * 18,
      a = r() * Math.PI;
    ctx.strokeStyle = `rgba(125,96,85,${(0.015 + r() * 0.03).toFixed(3)})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  // Foxing: a few soft age spots.
  for (let i = 0; i < 7; i++) {
    const x = r() * w,
      y = r() * h * 0.8,
      rad = 30 + r() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, "rgba(200,160,110,0.05)");
    g.addColorStop(1, "rgba(200,160,110,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // Faint horizontal texture (the analog screen memory, never a visible scanline pattern).
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = "rgba(62,39,35,0.012)";
    ctx.fillRect(0, y, w, 1);
  }
  // Warm vignette; it fades out toward the bottom so the page's end stays calm.
  const v = ctx.createRadialGradient(
    w / 2,
    h * 0.45,
    Math.min(w, h) * 0.35,
    w / 2,
    h * 0.45,
    Math.max(w, h) * 0.8,
  );
  v.addColorStop(0, "rgba(120,80,50,0)");
  v.addColorStop(1, "rgba(120,80,50,0.07)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  return c;
}

export function grain(size = 192) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const r = rng(21);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + r() * 110;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function finish(e: Env, grainTile: HTMLCanvasElement) {
  const { ctx, w, h, now } = e;
  ctx.save();
  // Grain, shifted every frame.
  ctx.globalAlpha = 0.045;
  ctx.globalCompositeOperation = "multiply";
  const pat = ctx.createPattern(grainTile, "repeat")!;
  const ox = Math.floor((Math.sin(now * 91) * 0.5 + 0.5) * 190);
  const oy = Math.floor((Math.cos(now * 57) * 0.5 + 0.5) * 190);
  ctx.translate(-ox, -oy);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w + 200, h + 200);
  ctx.restore();
  // Exposure breathing: a very slight flicker.
  const flick = 0.006 + 0.004 * Math.sin(now * 23) * Math.sin(now * 7.3);
  ctx.fillStyle = `rgba(255,244,228,${Math.max(0, flick).toFixed(3)})`;
  ctx.fillRect(0, 0, w, h);
  // Dust: a few specks that live for a moment.
  const r = rng(Math.floor(now * 6));
  for (let i = 0; i < 3; i++) {
    if (r() > 0.55) continue;
    ctx.fillStyle = `rgba(62,39,35,${(0.08 + r() * 0.12).toFixed(3)})`;
    ctx.fillRect(r() * w, r() * h * 0.85, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  // Bottom fade into the page: this is where the page ends.
  const g = ctx.createLinearGradient(0, h * 0.88, 0, h);
  g.addColorStop(0, "rgba(255,244,228,0)");
  g.addColorStop(1, "rgba(255,244,228,0.9)");
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.88, w, h * 0.12);
}

/** Soft phosphor-like bloom around a light source. */
export function glow(e: Env, x: number, y: number, r: number, alpha: number, rgb = "255,250,238") {
  if (alpha <= 0.002) return;
  const g = e.ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha.toFixed(3)})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  e.ctx.fillStyle = g;
  e.ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
