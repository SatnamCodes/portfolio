"use client";

import { ease, ink, lerp, seg, type Sketch, useSketch } from "@/components/sketch/useSketch";
import s from "./DopantGraph.module.css";

// β-Ga₂O₃ research entry: a dopant replaces gallium at one of the two inequivalent sites, its
// neighbourhood becomes a crystal graph, messages pass towards the defect, and the readout feeds
// the two predicted quantities. Schematic: a 2D sketch of the idea, not the real monoclinic cell,
// and no predicted values are shown because the work is still in progress.

type P = { x: number; y: number };
type Site = P & { kind: "I" | "II"; bonds: number[] };

// Divalent acceptors studied, with Shannon ionic radii (Å, six-fold) to size the atoms. Ga³⁺ is 0.62.
const DOPANTS = [
  { el: "Be", r: 0.45 },
  { el: "Mg", r: 0.72 },
  { el: "Zn", r: 0.74 },
  { el: "Cd", r: 0.95 },
  { el: "Sr", r: 1.18 },
];
const GA_R = 0.62;
const CYCLE = 9; // seconds per dopant-and-site pair
const LAYERS = 3;

let font = "system-ui, sans-serif";

// A hexagonal net of oxygen; octahedral Ga(II) sits on removed oxygen points (six neighbours),
// tetrahedral Ga(I) in triangle centres (three neighbours plus the nearest beyond).
function lattice(w: number, h: number, a: number) {
  const rows = Math.ceil(h / ((a * Math.sqrt(3)) / 2)) + 2;
  const cols = Math.ceil(w / a) + 2;
  const pts: (P & { ga: boolean })[] = [];
  for (let j = -1; j < rows; j++)
    for (let i = -1; i < cols; i++)
      pts.push({
        x: i * a + (j & 1 ? a / 2 : 0),
        y: (j * a * Math.sqrt(3)) / 2,
        ga: (j & 1) === 0 && ((i % 3) + 3) % 3 === 1,
      });
  const oxygen = pts.filter((p) => !p.ga).map(({ x, y }) => ({ x, y }));
  const dist = (p: P, q: P) => Math.hypot(p.x - q.x, p.y - q.y);
  const nearest = (p: P, n: number) =>
    oxygen
      .map((o, k) => [k, dist(p, o)] as const)
      .sort((u, v) => u[1] - v[1])
      .slice(0, n)
      .map(([k]) => k);
  const sites: Site[] = pts
    .filter((p) => p.ga)
    .map((p) => ({ x: p.x, y: p.y, kind: "II", bonds: nearest(p, 6) }));
  // Tetrahedral sites: triangle centres between octahedra, kept apart from each other.
  for (let j = -1; j < rows; j += 2)
    for (let i = -1; i < cols; i += 3) {
      const c = { x: i * a + a, y: (j * a * Math.sqrt(3)) / 2 + a / Math.sqrt(3) / 2 };
      if (sites.every((q) => dist(q, c) > a * 0.95))
        sites.push({ ...c, kind: "I", bonds: nearest(c, 4) });
    }
  return { oxygen, sites };
}

let cache: { key: string; a: number; oxygen: P[]; sites: Site[] } | null = null;

function layout(w: number, h: number) {
  const wide = w >= 560;
  const box = wide ? { x: 0, y: 0, w: w * 0.62, h } : { x: 0, y: 0, w, h: h * 0.62 };
  const panel = wide
    ? { x: w * 0.62 + 16, y: 12, w: w * 0.38 - 16, h: h - 24 }
    : { x: 0, y: h * 0.62 + 12, w, h: h * 0.38 - 12 };
  const key = `${Math.round(box.w)}x${Math.round(box.h)}`;
  if (cache?.key !== key) {
    const a = Math.max(26, Math.min(42, box.w / 11));
    cache = { key, a, ...lattice(box.w, box.h, a) };
  }
  return { box, panel, wide, ...cache };
}

// The site nearest a point, of one kind.
function siteNear(sites: Site[], kind: Site["kind"], p: P) {
  return sites
    .map((q, k) => [k, q] as const)
    .filter(([, q]) => q.kind === kind)
    .sort(
      (u, v) => Math.hypot(u[1].x - p.x, u[1].y - p.y) - Math.hypot(v[1].x - p.x, v[1].y - p.y),
    )[0][0];
}

const draw: Sketch = (ctx, w, h, time) => {
  if (typeof document !== "undefined") {
    const f = getComputedStyle(document.body).fontFamily;
    if (f) font = f;
  }
  const { box, panel, a, oxygen, sites } = layout(w, h);
  const pair = Math.floor(time / CYCLE) % (DOPANTS.length * 2);
  const dopant = DOPANTS[pair >> 1];
  const kind: Site["kind"] = pair & 1 ? "II" : "I";
  const t = time % CYCLE;
  const target = siteNear(sites, kind, { x: box.w * 0.5, y: box.h * 0.5 });
  const centre = sites[target];

  // Phases.
  const pick = seg(t, 0.2, 1);
  const swap = ease(seg(t, 1, 2));
  const cut = ease(seg(t, 2, 3.2));
  const passing = seg(t, 3.2, 3.2 + LAYERS * 0.9);
  const layer = Math.min(LAYERS, Math.floor(passing * LAYERS) + 1);
  const readout = ease(seg(t, 6.2, 7.2));
  const fadeOut = seg(t, CYCLE - 0.6, CYCLE);

  const cutoff = a * 2.3 * cut;
  const inside = (p: P) => Math.hypot(p.x - centre.x, p.y - centre.y) <= cutoff + 0.5;
  const dim = (p: P) => (cut > 0 && !inside(p) ? 1 - 0.65 * cut : 1);

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.translate(box.x, box.y);

  // Bonds: Ga–O. Inside the cutoff they become the graph's edges.
  for (const site of sites)
    for (const k of site.bonds) {
      const o = oxygen[k];
      const edge = cut > 0 && inside(site) && inside(o);
      ctx.strokeStyle = ink(edge ? 0.25 + 0.45 * cut : 0.16 * Math.min(dim(site), dim(o)));
      ctx.lineWidth = edge ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(site.x, site.y);
      ctx.lineTo(o.x, o.y);
      ctx.stroke();
    }

  // Messages: dots running along each edge, one hop further in with every layer.
  if (passing > 0 && passing < 1) {
    const local = (passing * LAYERS) % 1;
    for (const site of sites) {
      if (!inside(site)) continue;
      for (const k of site.bonds) {
        const o = oxygen[k];
        if (!inside(o)) continue;
        // Towards the defect: from whichever end is further out.
        const [from, to] =
          Math.hypot(o.x - centre.x, o.y - centre.y) >
          Math.hypot(site.x - centre.x, site.y - centre.y)
            ? [o, site]
            : [site, o];
        const k2 = ease(local);
        ctx.fillStyle = ink(0.75 * Math.sin(Math.PI * local));
        ctx.beginPath();
        ctx.arc(lerp(from.x, to.x, k2), lerp(from.y, to.y, k2), 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Oxygen: small open circles.
  for (const o of oxygen) {
    const node = cut > 0 && inside(o);
    ctx.strokeStyle = ink((node ? 0.8 : 0.4) * dim(o));
    ctx.fillStyle = "rgba(255,244,228,1)";
    ctx.lineWidth = node ? 1.4 : 1;
    ctx.beginPath();
    ctx.arc(o.x, o.y, a * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Gallium: tetrahedral Ga(I) lighter, octahedral Ga(II) darker.
  const gaR = a * 0.2;
  sites.forEach((site, k) => {
    if (k === target) return;
    const node = cut > 0 && inside(site);
    ctx.fillStyle = ink((site.kind === "I" ? 0.35 : 0.6) * dim(site));
    ctx.beginPath();
    ctx.arc(site.x, site.y, gaR, 0, Math.PI * 2);
    ctx.fill();
    if (node) {
      ctx.strokeStyle = ink(0.8);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  });

  // The substitution: gallium lifts out, the dopant settles in, sized by ionic radius.
  const ga = { r: gaR, y: centre.y - swap * a * 0.9, alpha: 1 - swap };
  if (ga.alpha > 0) {
    ctx.fillStyle = ink((kind === "I" ? 0.35 : 0.6) * ga.alpha);
    ctx.beginPath();
    ctx.arc(centre.x, ga.y, ga.r, 0, Math.PI * 2);
    ctx.fill();
  }
  const dR = gaR * (dopant.r / GA_R) * 1.15;
  if (swap > 0) {
    const y = centre.y - (1 - swap) * a * 0.9;
    const glow = passing > 0 ? Math.min(1, passing * 1.2) : 0;
    if (glow > 0) {
      ctx.fillStyle = ink(0.08 + 0.1 * glow);
      ctx.beginPath();
      ctx.arc(centre.x, y, dR + 6 + glow * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = ink(0.92 * swap);
    ctx.beginPath();
    ctx.arc(centre.x, y, dR, 0, Math.PI * 2);
    ctx.fill();
    // Its symbol on a small tag beside it: the smallest ions are too small to letter.
    const tag = { x: centre.x + dR + 10, y: y - dR - 12 };
    ctx.strokeStyle = ink(0.6 * swap);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centre.x + dR * 0.7, y - dR * 0.7);
    ctx.lineTo(tag.x, tag.y + 6);
    ctx.stroke();
    ctx.font = `600 12px ${font}`;
    const label = `${dopant.el} on Ga(${kind})`;
    const lw = ctx.measureText(label).width;
    ctx.fillStyle = ink(0.9 * swap);
    ctx.fillRect(tag.x, tag.y - 8, lw + 10, 16);
    ctx.fillStyle = `rgba(255,244,228,${swap})`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, tag.x + 5, tag.y + 0.5);
  }

  // Picking the site: a ring that tightens onto it.
  if (pick > 0 && swap < 1) {
    ctx.strokeStyle = ink(0.7 * (1 - swap));
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, lerp(a, gaR + 5, ease(pick)), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // The cutoff radius that decides which atoms join the graph.
  if (cut > 0) {
    ctx.strokeStyle = ink(0.45);
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, cutoff, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  // Caption inside the lattice box: what is happening now.
  const stage =
    t < 1
      ? `Choosing a Ga(${kind}) site · ${kind === "I" ? "tetrahedral" : "octahedral"}`
      : t < 2
        ? `${dopant.el} replaces Ga(${kind}) · charge states 0 and −1`
        : t < 3.2
          ? "Neighbourhood within the cutoff becomes a graph"
          : t < 6.2
            ? `Message passing · layer ${layer} of ${LAYERS}`
            : "Readout of the defect node";
  ctx.font = `500 12px ${font}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const tw = ctx.measureText(stage).width;
  ctx.fillStyle = "rgba(255,244,228,0.92)";
  ctx.fillRect(box.x + 8, box.y + box.h - 30, tw + 16, 22);
  ctx.fillStyle = ink(0.85);
  ctx.fillText(stage, box.x + 16, box.y + box.h - 15);

  // Panel: the two predicted quantities, then the five candidates.
  const px = panel.x;
  let py = panel.y + 14;
  ctx.font = `500 11px ${font}`;
  ctx.fillStyle = ink(0.6);
  ctx.fillText("PREDICTED FROM THE GRAPH", px, py);
  py += 12;
  const outputs = ["Defect formation energy", "Ionization level ε(0/−1)"];
  const boxH = 34;
  outputs.forEach((label, i) => {
    const y = py + i * (boxH + 10);
    ctx.strokeStyle = ink(0.35 + 0.4 * readout);
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, y + 0.5, panel.w - 1, boxH);
    ctx.fillStyle = ink(0.85);
    ctx.font = `12px ${font}`;
    ctx.fillText(label, px + 10, y + 15);
    // No numbers yet: a slow shimmer where the value will go.
    const bar = Math.max(0, panel.w - 20);
    ctx.fillStyle = ink(0.08);
    ctx.fillRect(px + 10, y + 22, bar, 4);
    if (readout > 0) {
      const sweep = ((time * 0.6 + i * 0.3) % 1) * bar;
      ctx.fillStyle = ink(0.35 * readout);
      ctx.fillRect(px + 10 + Math.max(0, sweep - 30), y + 22, Math.min(30, sweep), 4);
    }
  });
  py += outputs.length * (boxH + 10) + 14;

  ctx.font = `500 11px ${font}`;
  ctx.fillStyle = ink(0.6);
  ctx.fillText("CANDIDATES TO RANK", px, py);
  py += 10;
  const cell = Math.min(46, (panel.w - 2 - 4 * 6) / 5);
  DOPANTS.forEach((d, i) => {
    const x = px + i * (cell + 6);
    const current = d === dopant;
    ctx.fillStyle = current ? ink(0.9) : ink(0.08);
    ctx.fillRect(x, py, cell, cell * 0.8);
    ctx.fillStyle = current ? "rgba(255,244,228,1)" : ink(0.75);
    ctx.font = `600 13px ${font}`;
    ctx.textAlign = "center";
    ctx.fillText(d.el, x + cell / 2, py + cell * 0.4 + 2);
    ctx.font = `10px ${font}`;
    ctx.fillText(current ? `Ga(${kind})` : "I · II", x + cell / 2, py + cell * 0.4 + 15);
    ctx.textAlign = "left";
  });

  // Readout line from the defect to the outputs.
  if (readout > 0 && readout < 1 && fadeOut === 0) {
    ctx.strokeStyle = ink(0.4 * (1 - readout));
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(box.x + centre.x, box.y + centre.y);
    ctx.lineTo(lerp(box.x + centre.x, px, readout), lerp(box.y + centre.y, panel.y + 40, readout));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (fadeOut > 0) {
    ctx.fillStyle = `rgba(255,244,228,${0.85 * fadeOut})`;
    ctx.fillRect(0, 0, w, h);
  }
};

export function DopantGraph() {
  // The still frame for reduced motion: Mg on the octahedral site, mid message passing.
  const ref = useSketch(draw, CYCLE * 3 + 4.6);
  return (
    <figure className={s.figure}>
      <canvas
        ref={ref}
        className={s.canvas}
        role="img"
        aria-label="Schematic animation: a divalent dopant (Be, Mg, Zn, Cd or Sr) replaces gallium at a tetrahedral or octahedral site in β-Ga₂O₃. The atoms within a cutoff radius become a graph, messages pass along its edges towards the defect over three layers, and the defect node is read out into predicted formation energy and ionization level."
      />
      <figcaption className={s.caption}>
        Schematic, not to scale: a 2D sketch of the two gallium sites, not the real monoclinic cell.
        Atom sizes follow ionic radii. No predicted values are shown while the work is in progress.
      </figcaption>
    </figure>
  );
}
