// The conductor: draws whichever scenes are live at time t, the questions, the archival captions,
// the point clouds that carry one scene's drawing into the next, and quiet narration captions.
import { illustrationLayout } from "@/components/home/PrismIllustration";
import { type Env, fade, layout, seg } from "../engine/core";
import { caption, question } from "../engine/ink";
import { cached, type Cloud, morph, pathCloud, pointCloud, textCloud } from "../engine/points";
import { CAPTIONS, NARRATION, SCENES } from "../timeline";
import {
  Q1,
  q1Size,
  sceneEinstein,
  sceneEuclid,
  sceneFaraday,
  sceneMaxwell,
  sceneNewton,
  sceneQuestion,
} from "./early";
import { axisLine, cannonballs, equations, euclid, fieldLines, MAXWELL, tape } from "./geometry";
import {
  sceneCantor,
  sceneConvergence,
  sceneGodel,
  sceneKeats,
  scenePrism,
  sceneTuring,
} from "./late";

type Where = "side" | "center" | "low" | "top";
// The questions as they appear on the page (paraphrases carry no quotation marks; only the
// verified Turing line does).
const QUESTIONS: {
  text: string;
  a: number;
  b: number;
  where: Where;
  font?: "display" | "fountain";
}[] = [
  { text: "What can be known from what we already know?", a: 13.4, b: 20.4, where: "side" },
  {
    text: "Can the motion of the heavens and the motion of the earth be described by the same laws?",
    a: 26,
    b: 32.6,
    where: "side",
  },
  { text: "What connects electricity and magnetism?", a: 38.4, b: 44, where: "side" },
  {
    text: "What if mathematics can reveal something that experiment has not yet shown us?",
    a: 50,
    b: 55,
    where: "side",
  },
  {
    text: "What happens to time when the speed of light does not change?",
    a: 60.8,
    b: 67,
    where: "side",
  },
  { text: "How large is infinity?", a: 72.8, b: 78, where: "side" },
  {
    text: "Can a formal system prove everything that is true about itself?",
    a: 82,
    b: 86.6,
    where: "side",
  },
  { text: "What does it mean for something to be computable?", a: 92, b: 96.2, where: "side" },
  { text: "“Can machines think?”", a: 96.8, b: 99.6, where: "low" },
  { text: "What if not knowing is not failure?", a: 104.8, b: 109, where: "low" },
  { text: "What exists?", a: 112.5, b: 113.6, where: "low" },
  { text: "What can be known?", a: 113.7, b: 114.8, where: "low" },
  { text: "What can be proved?", a: 114.9, b: 116, where: "low" },
  { text: "What can be measured?", a: 116.1, b: 117.2, where: "low" },
  { text: "What can be computed?", a: 117.3, b: 118.4, where: "low" },
  { text: "And what does it mean to experience all of it?", a: 118.5, b: 120.2, where: "low" },
  {
    text: "What lies between what we know and what remains unknown?",
    a: 131.6,
    b: 9999,
    where: "top",
  },
];

const SCENE_DRAW: Record<
  string,
  [number, number, (e: Env, L: ReturnType<typeof layout>, colophon: string) => void]
> = {
  question: [0, 11.6, sceneQuestion],
  euclid: [10.5, 22.2, sceneEuclid],
  newton: [22, 35.4, sceneNewton],
  faraday: [34.5, 45.6, sceneFaraday],
  maxwell: [47.9, 58.4, sceneMaxwell],
  einstein: [56.8, 70, sceneEinstein],
  cantor: [70, 87.6, sceneCantor],
  godel: [80.2, 87.2, sceneGodel],
  turing: [88, 100.6, sceneTuring],
  keats: [99.8, 110.6, sceneKeats],
  convergence: [109.5, 120, sceneConvergence],
  prism: [119.8, Infinity, scenePrism],
};

function clouds(
  e: Env,
  L: ReturnType<typeof layout>,
): { a: Cloud; b: Cloud; t0: number; t1: number; alpha: number }[] {
  const { t, w, h } = e;
  const k = `${w}x${h}`;
  const eqs = equations(L);
  const eqBlock = () =>
    textCloud(
      MAXWELL.join("\n"),
      `italic ${e.fonts.body}`,
      eqs[0].size,
      eqs[0].x,
      eqs[0].y + eqs[0].size * 2.1,
      "left",
    );
  const { A, r } = euclid(L);
  const circleA = () =>
    pathCloud([
      [...Array(121)].map((_, i) => [
        A[0] + Math.cos((i / 120) * Math.PI * 2) * r,
        A[1] + Math.sin((i / 120) * Math.PI * 2) * r,
      ]),
    ]);
  const line = () => pathCloud([axisLine(L)]);
  const field = () => pathCloud(fieldLines(L));
  const wave = () =>
    pathCloud([
      [...Array(201)].map((_, i) => [
        (i / 200) * w,
        L.dy + Math.sin((i / 200) * w * ((Math.PI * 2) / (L.R * 0.9))) * L.R * 0.35,
      ]),
    ]);
  const { T, y } = tape(L, w);
  const tapeRow = () =>
    pathCloud([
      [
        [0, y - T / 2],
        [w, y - T / 2],
      ],
      [
        [0, y + T / 2],
        [w, y + T / 2],
      ],
      ...[...Array(Math.ceil(w / T) + 1)].map((_, i) => [
        [i * T, y - T / 2],
        [i * T, y + T / 2],
      ]),
    ]);
  const lay = illustrationLayout(w, h * 0.9, e.portrait ? w * 0.9 : w * 0.8);
  const sy = h * 0.03;
  const segs: { a: Cloud; b: Cloud; t0: number; t1: number; alpha: number }[] = [];
  const add = (
    key: string,
    a: () => Cloud,
    keyB: string,
    b: () => Cloud,
    t0: number,
    t1: number,
    alpha: number,
  ) => {
    if (alpha > 0.002)
      segs.push({ a: cached(`${key}${k}`, a), b: cached(`${keyB}${k}`, b), t0, t1, alpha });
  };
  add(
    "q1",
    () => textCloud(Q1, e.fonts.fountain, q1Size(e), w / 2, h * 0.42, "center"),
    "circleA",
    circleA,
    7.6,
    10.8,
    fade(t, 7.5, 7.9, 10.7, 11.4),
  );
  add(
    "orbit",
    () => pathCloud([cannonballs(L)[4]]),
    "line",
    line,
    32.8,
    35,
    fade(t, 32.6, 33, 34.8, 35.4),
  );
  add("field", field, "eqs", eqBlock, 44, 48.4, fade(t, 43.9, 44.4, 48.2, 48.9));
  add("eqs", eqBlock, "wave", wave, 53, 55, fade(t, 52.9, 53.3, 54.8, 55.3));
  add(
    "godel",
    () =>
      textCloud(
        "G  ⟺  ¬ Prov ( ⌜G⌝ )",
        `italic ${e.fonts.body}`,
        Math.max(18, L.R * 0.2),
        L.dx,
        L.dy - L.R * 1.05,
        "center",
      ),
    "tape",
    tapeRow,
    86,
    88.6,
    fade(t, 85.9, 86.4, 88.4, 89),
  );
  // The roads meet: language → line → field → light → geometry → computation → a question → a point.
  const chain: [string, () => Cloud][] = [
    [
      "keats",
      () =>
        textCloud(
          "…uncertainties, Mysteries, doubts…",
          e.fonts.fountain,
          Math.min(w * (e.portrait ? 0.065 : 0.036), 40),
          w / 2,
          h * 0.42,
          "center",
        ),
    ],
    ["line", line],
    ["field", field],
    ["wave", wave],
    ["circleA", circleA],
    ["tape", tapeRow],
    [
      "qmark",
      () => textCloud("?", e.fonts.display, Math.min(w, h) * 0.3, w / 2, h * 0.42, "center"),
    ],
    ["point", () => pointCloud(lay.start[0] + w * 0.04, lay.start[1] + sy, 3)],
  ];
  const ca = fade(t, 109.8, 110.4, 119.6, 120.4);
  for (let i = 0; i < chain.length - 1; i++) {
    const t0 = 110 + i * 1.4;
    if (t >= t0 && t < t0 + 1.4)
      add(chain[i][0], chain[i][1], chain[i + 1][0], chain[i + 1][1], t0, t0 + 1.4, ca);
  }
  if (t >= 119.8) add("point", chain[7][1], "point", chain[7][1], 0, 1, ca);
  return segs;
}

/** `bare` draws the pictures only (no questions, captions or colophon): the reduced-motion still. */
export function render(e: Env, colophon: string, bare = false) {
  const { t, w, h } = e;
  const L = layout(e);
  for (const [, [a, b, draw]] of Object.entries(SCENE_DRAW))
    if (t >= a && t < b) draw(e, L, bare ? "" : colophon);
  for (const c of clouds(e, L)) morph(e, c.a, c.b, seg(t, c.t0, c.t1), c.alpha);
  if (bare) return;

  for (const q of QUESTIONS) {
    const alpha = fade(t, q.a, q.a + 1.2, q.b - 0.8, q.b);
    if (alpha <= 0) continue;
    if (q.where === "side") question(e, q.text, alpha, L.qx, L.qy, L.qw, L.qSize, L.align);
    else if (q.where === "low")
      question(
        e,
        q.text,
        alpha,
        w / 2,
        h * (e.portrait ? 0.7 : 0.68),
        Math.min(w * 0.8, 760),
        L.qSize * 1.05,
        "center",
      );
    else
      question(
        e,
        q.text,
        alpha,
        w / 2,
        h * (e.portrait ? 0.08 : 0.1),
        Math.min(w * 0.84, 820),
        L.qSize * 1.1,
        "center",
      );
  }
  // Archival attribution, in the margin.
  for (const s of SCENES) {
    const text = CAPTIONS[s.id];
    if (!text) continue;
    const alpha = fade(t, s.start + 2.2, s.start + 3.2, s.end - 1.4, s.end - 0.4) * 0.85;
    if (e.portrait) caption(e, text, alpha, w / 2, h * 0.8, "center");
    else caption(e, text, alpha, L.qx, h * 0.8);
  }
  if (t >= 96.8 && t < 99.6)
    caption(
      e,
      "Turing, Computing Machinery and Intelligence · 1950",
      fade(t, 97.4, 98, 99, 99.6) * 0.85,
      w / 2,
      h * (e.portrait ? 0.77 : 0.75),
      "center",
    );
  // Narration that isn't a question, as quiet captions: the piece works without sound.
  const spoken = NARRATION.filter((n) => n.caption);
  spoken.forEach((n, i) => {
    const end = Math.min(spoken[i + 1]?.at ?? n.at + 3, n.at + 3);
    const a = fade(t, n.at, n.at + 0.6, end - 0.4, end) * 0.8;
    if (a <= 0) return;
    e.ctx.save();
    e.ctx.font = `italic 400 ${e.portrait ? 15 : 17}px ${e.fonts.body}`;
    e.ctx.textAlign = "center";
    e.ctx.fillStyle = `rgba(93,64,55,${a.toFixed(3)})`;
    e.ctx.fillText(n.text, w / 2, h * 0.86);
    e.ctx.restore();
  });
}
