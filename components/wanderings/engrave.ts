// Turns a photograph into an engraving: the image is never shown, only sampled. Darkness sets how
// many hatching layers cross each spot (like a burin cutting deeper tones with more lines), and
// strong brightness edges become short contour strokes. Returns strokes in drawing order.
export type Stroke = { x1: number; y1: number; x2: number; y2: number; w: number };

export async function engrave(
  src: string,
  width: number,
): Promise<{ strokes: Stroke[]; w: number; h: number } | null> {
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = src;
  });
  if (!img) return null;
  // Sample at a modest resolution; strokes are later scaled to the display width.
  const S = 220;
  const w = S,
    h = Math.round((img.naturalHeight / img.naturalWidth) * S);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  let lo = 1,
    hi = 0;
  for (let i = 0; i < w * h; i++) {
    const v = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
    lum[i] = v;
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  // Normalise contrast so any reference photo engraves with a full tonal range.
  for (let i = 0; i < lum.length; i++) lum[i] = (lum[i] - lo) / Math.max(0.01, hi - lo);
  const dark = (x: number, y: number) => {
    const xi = Math.min(w - 1, Math.max(0, Math.round(x))),
      yi = Math.min(h - 1, Math.max(0, Math.round(y)));
    return 1 - lum[yi * w + xi];
  };

  const k = width / w;
  const strokes: Stroke[] = [];
  // Hatching layers: angle, spacing (px in sample space) and the darkness each layer needs.
  const layers = [
    { a: -0.42, gap: 3.2, t: 0.22 },
    { a: 0.42, gap: 3.2, t: 0.45 },
    { a: 1.45, gap: 2.8, t: 0.65 },
    { a: -0.05, gap: 2.2, t: 0.82 },
  ];
  const diag = Math.hypot(w, h);
  for (const L of layers) {
    const dx = Math.cos(L.a),
      dy = Math.sin(L.a);
    const nx = -dy,
      ny = dx;
    for (let off = -diag; off < diag; off += L.gap) {
      let run: [number, number] | null = null;
      for (let s = -diag; s <= diag; s += 1) {
        const x = w / 2 + nx * off + dx * s,
          y = h / 2 + ny * off + dy * s;
        const inside = x >= 0 && y >= 0 && x < w && y < h;
        const on = inside && dark(x, y) > L.t;
        if (on && !run) run = [x, y];
        if ((!on || s >= diag) && run) {
          if (Math.hypot(x - run[0], y - run[1]) > 1.5)
            strokes.push({
              x1: run[0] * k,
              y1: run[1] * k,
              x2: x * k,
              y2: y * k,
              w: 0.55 + L.t * 0.5,
            });
          run = null;
        }
      }
    }
  }
  // Contours: short strokes along strong edges (Sobel), drawn last, like the engraver's outline.
  for (let y = 1; y < h - 1; y += 2)
    for (let x = 1; x < w - 1; x += 2) {
      const gx = dark(x + 1, y) - dark(x - 1, y),
        gy = dark(x, y + 1) - dark(x, y - 1);
      const m = Math.hypot(gx, gy);
      if (m < 0.35) continue;
      const tx = -gy / m,
        ty = gx / m; // along the edge
      strokes.push({
        x1: (x - tx * 1.6) * k,
        y1: (y - ty * 1.6) * k,
        x2: (x + tx * 1.6) * k,
        y2: (y + ty * 1.6) * k,
        w: 0.9,
      });
    }
  // Draw roughly top to bottom within each pass, so the face appears as if being cut.
  return { strokes, w: width, h: h * k };
}
