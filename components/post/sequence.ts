import { animate, type AnimationSequence } from "motion";
import { color } from "@/lib/tokens";
import { LETTERBOX_VIEWBOX, SLOT } from "./Letterbox";
import s from "./sequence.module.css";

type Rect = { left: number; top: number; width: number; height: number };

const inset = (r: Rect, vw: number, vh: number) =>
  `inset(${r.top}px ${vw - r.left - r.width}px ${vh - r.top - r.height}px ${r.left}px)`;
const OPEN = "inset(-3000px -3000px -3000px -3000px)";

function div(className: string, parent?: HTMLElement) {
  const el = document.createElement("div");
  el.className = className;
  parent?.appendChild(el);
  return el;
}

// The written sheet: the visitor's own words, in the textarea's own type and padding, signed.
function sheetContent(
  textarea: HTMLTextAreaElement,
  values: { name: string; email: string; message: string },
) {
  const cs = getComputedStyle(textarea);
  const content = div(s.content);
  Object.assign(content.style, {
    padding: cs.padding,
    font: cs.font,
    lineHeight: cs.lineHeight,
    letterSpacing: cs.letterSpacing,
    color: cs.color,
  });
  const body = div(s.body, content);
  body.textContent = values.message;
  const sign = div(s.signature, content);
  const name = document.createElement("span");
  name.textContent = `— ${values.name}`;
  const email = document.createElement("span");
  email.className = s.email;
  email.textContent = values.email;
  sign.append(name, email);
  return content;
}

/**
 * The seven phases as one timeline (times in seconds):
 * 0.00  1 the message becomes a sheet (the textarea's text, revealed downward, drifting to centre)
 *       2 continuity: the same sheet element carries through every later phase
 * 0.85  3 the letterbox grows into a full-page Espresso scene; the sheet is held lower left
 * 1.80  4 the sheet folds in thirds (bottom up, then top down)
 * 2.95  4b the folded letter is sealed in an envelope: the pocket rises round it, the flap
 *          closes, a wax seal presses
 * 4.00  5 the envelope flies to the slot: accelerates, arcs, wobbles, settles
 * 4.90  6 it slides into the slot; the flap springs shut and the box shivers
 * 5.80  7 the scene contracts back into the small letterbox and the form returns
 */
export function play({
  textarea,
  fade,
  letterbox,
  values,
}: {
  textarea: HTMLTextAreaElement;
  fade: HTMLElement[];
  letterbox: SVGSVGElement;
  values: { name: string; email: string; message: string };
}): Promise<void> {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const narrow = vw < 768;
  const T = textarea.getBoundingClientRect();
  const L = letterbox.getBoundingClientRect();

  // Geometry. The sheet keeps the textarea's width, so its text never reflows or distorts.
  const PW = T.width;
  const PH = Math.min(PW * 1.3, vh * (narrow ? 0.56 : 0.72));
  const paper: Rect = {
    left: (vw - PW) / 2,
    top: Math.max(16, (vh - PH) / 2),
    width: PW,
    height: PH,
  };
  const rest = { x: paper.left + PW / 2, y: paper.top + PH / 2 };

  const bigH = narrow ? vh * 0.34 : vh * 0.62;
  const bigW = (bigH * LETTERBOX_VIEWBOX.width) / LETTERBOX_VIEWBOX.height;
  const big: Rect = {
    left: narrow ? (vw - bigW) / 2 : vw * 0.68 - bigW / 2,
    top: narrow ? vh * 0.07 : (vh - bigH) / 2,
    width: bigW,
    height: bigH,
  };
  const k = bigH / LETTERBOX_VIEWBOX.height;
  const slot = { x: big.left + SLOT.x * k, y: big.top + SLOT.y * k, w: SLOT.width * k };
  const toSmall = { x: L.left - big.left, y: L.top - big.top, scale: L.height / bigH };

  const holdScale = narrow ? 0.5 : 0.55;
  const hold = narrow
    ? { x: vw / 2 - rest.x, y: vh * 0.7 - rest.y }
    : { x: vw * 0.27 - rest.x, y: vh * 0.56 - rest.y };
  const flyScale = (slot.w * 0.9) / PW;
  const letterH = (PH / 3) * flyScale;
  const target = { x: slot.x + slot.w / 2 - rest.x, y: slot.y - letterH / 2 - rest.y };
  const arc = { x: (hold.x + target.x) / 2, y: Math.min(hold.y, target.y) - vh * 0.16 };

  // Build the scene layer.
  const overlay = div(s.overlay);
  overlay.setAttribute("aria-hidden", "true");
  const scene = div(s.scene, overlay);
  scene.style.clipPath = inset(L, vw, vh);
  scene.style.opacity = "0";

  const bigBox = letterbox.cloneNode(true) as SVGSVGElement;
  bigBox.removeAttribute("role");
  bigBox.removeAttribute("aria-label");
  bigBox.classList.add(s.bigBox);
  Object.assign(bigBox.style, {
    left: `${big.left}px`,
    top: `${big.top}px`,
    width: `${bigW}px`,
    height: `${bigH}px`,
  });
  bigBox.style.opacity = "0";
  overlay.appendChild(bigBox);
  const flap = bigBox.querySelector<SVGElement>('[data-part="flap"]')!;
  const body = bigBox.querySelector<SVGElement>('[data-part="body"]')!;

  const reveal = div(s.layer, overlay);
  reveal.style.clipPath = inset(T, vw, vh);
  const slotClip = div(s.layer, reveal);
  slotClip.style.clipPath = OPEN;
  const flight = div(s.flight, slotClip);
  Object.assign(flight.style, {
    left: `${paper.left}px`,
    top: `${paper.top}px`,
    width: `${PW}px`,
    height: `${PH}px`,
  });
  const shadow = div(s.shadow, flight);
  // The envelope, around the middle third (where the folded letter ends up): its inside sits
  // behind the letter, the pocket and flap in front of it.
  const envStyle = { top: `${PH / 3}px`, height: `${PH / 3}px` };
  const envBack = div(s.envBack, flight);
  Object.assign(envBack.style, envStyle);
  const sheet = div(s.sheet, flight);
  const envFront = div(s.envFront, flight);
  Object.assign(envFront.style, envStyle);
  const pocket = div(s.pocket, envFront);
  const envFlap = div(s.envFlap, envFront);
  const seal = div(s.seal, envFront);

  const content = sheetContent(textarea, values);
  const panels = [0, 1, 2].map((i) => {
    const panel = div(s.panel, sheet);
    Object.assign(panel.style, { top: `${(i * PH) / 3}px`, height: `${PH / 3}px` });
    panel.dataset.fold = ["top", "middle", "bottom"][i];
    const front = div(`${s.face} ${s.front}`, panel);
    const clone = content.cloneNode(true) as HTMLElement;
    Object.assign(clone.style, { top: `${(-i * PH) / 3}px`, height: `${PH}px` });
    front.appendChild(clone);
    div(`${s.face} ${s.back}`, panel);
    div(s.crease, front);
    return panel;
  });
  const [topPanel, , bottomPanel] = panels;
  const signatures = [...sheet.querySelectorAll<HTMLElement>(`.${s.signature}`)];
  const creases = [...sheet.querySelectorAll<HTMLElement>(`.${s.crease}`)];

  document.body.appendChild(overlay);
  textarea.style.opacity = "0";

  const smooth = [0.65, 0, 0.35, 1] as const;
  const out = [0.22, 1, 0.36, 1] as const;

  const sequence: AnimationSequence = [
    // 1–2. Message → sheet.
    [fade, { opacity: 0 }, { duration: 0.35, at: 0 }],
    [
      flight,
      { x: [T.left - paper.left, 0], y: [T.top - paper.top, 0] },
      { duration: 0.75, at: 0.05, ease: smooth },
    ],
    [
      reveal,
      { clipPath: [inset(T, vw, vh), inset(paper, vw, vh)] },
      { duration: 0.75, at: 0.05, ease: smooth },
    ],
    [signatures, { opacity: [0, 1] }, { duration: 0.4, at: 0.45 }],
    [shadow, { opacity: [0, 0.6] }, { duration: 0.5, at: 0.3 }],

    // 3. Expansion into the letterbox scene.
    [reveal, { clipPath: OPEN }, { duration: 0.01, at: 0.84 }],
    [letterbox, { opacity: 0 }, { duration: 0.01, at: 0.85 }],
    [bigBox, { opacity: [0, 1] }, { duration: 0.01, at: 0.85 }],
    [scene, { opacity: [0, 1] }, { duration: 0.01, at: 0.85 }],
    [
      scene,
      { clipPath: [inset(L, vw, vh), "inset(0px 0px 0px 0px)"] },
      { duration: 0.8, at: 0.85, ease: smooth },
    ],
    [
      bigBox,
      { x: [toSmall.x, 0], y: [toSmall.y, 0], scale: [toSmall.scale, 1] },
      { duration: 0.85, at: 0.85, ease: smooth },
    ],
    [
      bigBox,
      { "--ink": [color.espresso, color.seaSand], "--fill": [color.seaSand, color.espressoTint1] },
      { duration: 0.6, at: 0.95 },
    ],
    [flight, { x: hold.x, y: hold.y, scale: holdScale }, { duration: 0.85, at: 0.9, ease: smooth }],

    // 4. Fold in thirds.
    [
      bottomPanel,
      { rotateX: [0, 178], z: [0, 1] },
      { duration: 0.6, at: 1.8, ease: [0.45, 0, 0.2, 1] },
    ],
    [creases, { opacity: [0, 0.35, 0.12] }, { duration: 0.6, at: 1.8 }],
    [
      topPanel,
      { rotateX: [0, -178], z: [0, 2] },
      { duration: 0.6, at: 2.35, ease: [0.45, 0, 0.2, 1] },
    ],
    [creases, { opacity: [0.12, 0.3, 0.1] }, { duration: 0.6, at: 2.35 }],
    [shadow, { opacity: [0.6, 0.35], scaleY: [1, 0.36] }, { duration: 1.1, at: 1.8 }],
    // 4b. Into the envelope.
    [[envBack, envFront], { opacity: [0, 1] }, { duration: 0.2, at: 2.95 }],
    [pocket, { y: ["60%", "0%"] }, { duration: 0.45, at: 2.95, ease: out }],
    [envBack, { y: ["60%", "0%"] }, { duration: 0.45, at: 2.95, ease: out }],
    [envFlap, { rotateX: [180, 0] }, { duration: 0.5, at: 3.4, ease: [0.45, 0, 0.2, 1] }],
    [seal, { scale: [0, 1.2, 1], opacity: [0, 1, 1] }, { duration: 0.35, at: 3.85, ease: out }],
    [flight, { rotate: -5 }, { duration: 0.4, at: 3.8, ease: out }],

    // 5. Flight: accelerate away from the hand, arc, decelerate into position, wobbling.
    [
      flight,
      {
        x: [hold.x, arc.x, target.x],
        y: [hold.y, arc.y, target.y],
        scale: [holdScale, (holdScale + flyScale) / 2, flyScale],
        rotate: [-5, 9, -4, 2, 0],
      },
      { duration: 0.9, at: 4, ease: ["easeIn", "easeOut"] },
    ],
    [shadow, { opacity: [0.35, 0] }, { duration: 0.3, at: 4 }],
    [flap, { scaleY: [1, 0.15] }, { duration: 0.2, at: 4.65, ease: out }],

    // 6. Into the slot. The clip is fixed to the slot line in the world, so the letter is swallowed.
    [
      slotClip,
      { clipPath: `inset(-3000px -3000px ${vh - slot.y}px -3000px)` },
      { duration: 0.01, at: 4.9 },
    ],
    [flight, { y: target.y + letterH + 2 }, { duration: 0.35, at: 4.92, ease: "easeIn" }],
    [flap, { scaleY: [0.15, 1.12, 0.96, 1] }, { duration: 0.45, at: 5.25, ease: "easeOut" }],
    [body, { rotate: [0, 0.8, -0.5, 0] }, { duration: 0.45, at: 5.28 }],

    // 7. Back to the page.
    [
      bigBox,
      {
        x: toSmall.x,
        y: toSmall.y,
        scale: toSmall.scale,
        "--ink": color.espresso,
        "--fill": color.seaSand,
      },
      { duration: 0.8, at: 5.8, ease: smooth },
    ],
    [scene, { clipPath: inset(L, vw, vh) }, { duration: 0.8, at: 5.8, ease: smooth }],
    [scene, { opacity: 0 }, { duration: 0.35, at: 6.25 }],
    [fade, { opacity: 1 }, { duration: 0.45, at: 6.35 }],
  ];

  const controls = animate(sequence);

  // A resize or rotation invalidates every measured coordinate: finish at once rather than drift.
  const jumpToEnd = () => controls.complete();
  window.addEventListener("resize", jumpToEnd);
  window.addEventListener("orientationchange", jumpToEnd);

  return controls.finished.then(
    () => cleanup(),
    () => cleanup(),
  );

  function cleanup() {
    window.removeEventListener("resize", jumpToEnd);
    window.removeEventListener("orientationchange", jumpToEnd);
    overlay.remove();
    for (const el of [...fade, textarea]) el.style.removeProperty("opacity");
    letterbox.style.removeProperty("opacity");
  }
}
