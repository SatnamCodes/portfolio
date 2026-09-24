"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { KERNELS, SIZE, type KernelName, type Mark, type Scene, type Tone } from "./scenes";
import s from "./KernelAnimation.module.css";

const STEP_MS = 520;
const HOLD_MS = 1600;
const FADE_MS = 200;

// Layout in cell units: B top right, A bottom left, C bottom right, shared memory top left.
const LABEL = 1.6;
const GAP = 1;
const WIDTH = SIZE * 2 + GAP;
const HEIGHT = LABEL + SIZE + LABEL + SIZE;

type Box = { x: number; y: number; cell: number };

function layout(scene: Scene) {
  const boxes: Partial<Record<Mark["at"], Box>> = {
    B: { x: SIZE + GAP, y: LABEL, cell: 1 },
    A: { x: 0, y: LABEL * 2 + SIZE, cell: 1 },
    C: { x: SIZE + GAP, y: LABEL * 2 + SIZE, cell: 1 },
  };
  if (scene.smem) {
    const [ah, aw] = scene.smem.a;
    const [bh, bw] = scene.smem.b;
    const regRows = scene.reg ? LABEL + 1 : 0;
    const cell = Math.min(
      1.5,
      (SIZE - 4.5) / bw,
      (SIZE - 1) / (aw + 1 + bw),
      (SIZE - 1 - regRows) / Math.max(ah, bh),
    );
    boxes.As = { x: 0, y: LABEL, cell };
    // Leave room for the As label even when the tile itself is narrow.
    boxes.Bs = { x: Math.max((aw + 1) * cell, 3.5), y: LABEL, cell };
    if (scene.reg) {
      boxes.reg = { x: 0, y: LABEL + Math.max(ah, bh) * cell + LABEL, cell: Math.min(cell, 1.5) };
    }
  }
  return boxes;
}

function dims(scene: Scene, at: Mark["at"]): [number, number] {
  if (at === "As") return scene.smem!.a;
  if (at === "Bs") return scene.smem!.b;
  if (at === "reg") return [1, scene.reg ?? 0];
  return [SIZE, SIZE];
}

const LABELS: Record<Mark["at"], string> = {
  A: "A",
  B: "B",
  C: "C",
  As: "As",
  Bs: "Bs",
  reg: "registers",
};

const ORDER: Tone[] = ["tile", "done", "acc", "warp", "read"];

function draw(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  step: number,
  fade: number,
  unit: number,
  font: string,
  color: (name: string) => string,
) {
  const ink = color("--color-ink");
  const muted = color("--color-ink-muted");
  const faint = color("--color-ink-faint");
  const rule = color("--color-rule");
  const deep = color("--color-paper-deep");
  const boxes = layout(scene);

  ctx.clearRect(0, 0, WIDTH * unit, HEIGHT * unit);
  ctx.font = `500 ${Math.max(10, unit * 0.8)}px ${font}`;
  ctx.textBaseline = "bottom";

  for (const [at, box] of Object.entries(boxes) as [Mark["at"], Box][]) {
    const [h, w] = dims(scene, at);
    const cell = box.cell * unit;
    const x = box.x * unit;
    const y = box.y * unit;
    ctx.fillStyle = deep;
    ctx.fillRect(x, y, w * cell, h * cell);
    ctx.strokeStyle = rule;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < w; i++) {
      ctx.moveTo(x + i * cell + 0.5, y);
      ctx.lineTo(x + i * cell + 0.5, y + h * cell);
    }
    for (let i = 1; i < h; i++) {
      ctx.moveTo(x, y + i * cell + 0.5);
      ctx.lineTo(x + w * cell, y + i * cell + 0.5);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w * cell - 1, h * cell - 1);
    ctx.fillStyle = muted;
    const label = at === "As" && scene.smem?.aLabel ? scene.smem.aLabel : LABELS[at];
    ctx.fillText(label, x, y - unit * 0.35);
  }

  const marks = scene.steps[step].marks;
  for (const tone of ORDER) {
    for (const mk of marks) {
      if (mk.tone !== tone) continue;
      const box = boxes[mk.at];
      if (!box) continue;
      const cell = box.cell * unit;
      const x = box.x * unit + mk.c * cell;
      const y = box.y * unit + mk.r * cell;
      const w = mk.w * cell;
      const h = mk.h * cell;
      if (tone === "warp") {
        ctx.strokeStyle = muted;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        continue;
      }
      ctx.globalAlpha =
        tone === "read" ? 0.85 * fade : tone === "acc" ? 0.6 : tone === "done" ? 0.75 : 0.35;
      ctx.fillStyle =
        tone === "read" ? ink : tone === "acc" ? muted : tone === "done" ? faint : rule;
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.globalAlpha = 1;
    }
  }
}

export function KernelAnimation({ kernel, caption }: { kernel: KernelName; caption?: string }) {
  const scene = useMemo(() => KERNELS[kernel](), [kernel]);
  const figure = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);
  // Plays on its own unless the reader has asked for less motion; the buttons override either way.
  const reduced = useReducedMotion();
  const [choice, setChoice] = useState<boolean | null>(null);
  const playing = choice ?? !reduced;
  const visible = useRef(false);
  // The draw loop reads and advances the step here; state mirrors it for the text around the canvas.
  const at = useRef(0);
  const stepAt = useRef(0);

  const go = (i: number) => {
    at.current = i;
    stepAt.current = performance.now();
    setStep(i);
  };

  useEffect(() => {
    const el = figure.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // One loop draws every frame and advances the step while playing and on screen.
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const style = getComputedStyle(el);
    const color = (name: string) => style.getPropertyValue(name).trim() || "#3e2723";
    const font = style.fontFamily;
    let raf = 0;

    const frame = (now: number) => {
      const unit = el.clientWidth / WIDTH;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(el.clientWidth * dpr);
      const h = Math.round(HEIGHT * unit * dpr);
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const elapsed = now - stepAt.current;
      draw(ctx, scene, at.current, Math.min(1, elapsed / FADE_MS), unit, font, color);

      const last = at.current === scene.steps.length - 1;
      if (playing && visible.current && elapsed > (last ? HOLD_MS : STEP_MS)) {
        at.current = last ? 0 : at.current + 1;
        stepAt.current = now;
        setStep(at.current);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [scene, playing]);

  const current = scene.steps[step];

  return (
    <figure ref={figure} className={s.figure}>
      <div className={s.head}>
        <span className={s.title}>{scene.title}</span>
        <span className={s.count}>
          {current.count.toLocaleString("en")} {scene.counter}
        </span>
      </div>
      <canvas
        ref={canvas}
        className={s.canvas}
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        role="img"
        aria-label={`Animation of the ${scene.title} kernel reading tiles of A and B to compute C.`}
      />
      <div className={s.controls}>
        <button type="button" onClick={() => setChoice(!playing)} aria-pressed={playing}>
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            setChoice(false);
            go((at.current + 1) % scene.steps.length);
          }}
        >
          Step
        </button>
        <button type="button" onClick={() => go(0)}>
          Restart
        </button>
        <span className={s.progress}>
          {step + 1} / {scene.steps.length}
        </span>
      </div>
      <p className={s.note}>{current.note}</p>
      {caption && <figcaption className={s.caption}>{caption}</figcaption>}
    </figure>
  );
}
