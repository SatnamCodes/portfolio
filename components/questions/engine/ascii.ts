// ASCII hands after Michelangelo's "Creation of Adam": each hand is drawn as a silhouette on a
// hidden canvas, then read back cell by cell into characters by ink coverage.
const RAMP = " .,:;-=+*#%@";

export type AsciiArt = { rows: string[]; cw: number; ch: number; tipX: number; tipY: number };

const cache = new Map<string, AsciiArt>();

/** A hand reaching right, index finger extended (Adam's is relaxed; God's is taut). */
function drawHand(ctx: CanvasRenderingContext2D, taut: boolean) {
  const line = (x1: number, y1: number, x2: number, y2: number, wid: number) => {
    ctx.lineWidth = wid;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#000";
  line(0, 78, 120, taut ? 64 : 70, 30); // forearm (shorter, so the hand leads)
  line(110, taut ? 64 : 70, 150, taut ? 60 : 66, 34); // wrist
  ctx.beginPath();
  ctx.ellipse(178, taut ? 58 : 64, 38, 28, taut ? -0.08 : 0.12, 0, Math.PI * 2);
  ctx.fill(); // palm
  line(160, 42, 204, taut ? 28 : 36, 13); // thumb
  const droop = taut ? 0 : 12;
  line(206, 54, 252, 52 + droop * 0.5, 12); // index, first joints
  line(252, 52 + droop * 0.5, 294, 50 + droop, 10); // index, to the tip
  line(208, 66, 246, 78, 12); // middle finger, bent
  line(246, 78, 236, 94, 11);
  line(204, 76, 238, 90, 11); // ring
  line(238, 90, 226, 104, 10);
  line(196, 86, 222, 100, 10); // little finger
  return { tipX: 299, tipY: 50 + droop };
}

export function hand(taut: boolean, width: number, cell: number): AsciiArt {
  const key = `${taut}-${Math.round(width)}-${cell}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 300,
    H = 120;
  const scale = width / W;
  const cw = cell,
    ch = cell * 1.7;
  const c = document.createElement("canvas");
  c.width = Math.ceil(W * scale);
  c.height = Math.ceil(H * scale);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.scale(scale, scale);
  const tip = drawHand(ctx, taut);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const cols = Math.floor(c.width / cw),
    rowsN = Math.floor(c.height / ch);
  const rows: string[] = [];
  for (let r = 0; r < rowsN; r++) {
    let line = "";
    for (let q = 0; q < cols; q++) {
      let sum = 0,
        n = 0;
      for (let y = Math.floor(r * ch); y < Math.floor((r + 1) * ch); y += 2)
        for (let x = Math.floor(q * cw); x < Math.floor((q + 1) * cw); x += 2) {
          sum += data[(y * c.width + x) * 4 + 3];
          n++;
        }
      const cov = sum / (n * 255);
      line += RAMP[Math.min(RAMP.length - 1, Math.round(cov * (RAMP.length - 1)))];
    }
    rows.push(line);
  }
  const art = { rows, cw, ch, tipX: tip.tipX * scale, tipY: tip.tipY * scale };
  cache.set(key, art);
  return art;
}
