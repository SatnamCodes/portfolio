"use client";

import { useEffect, useRef } from "react";

export type Sketch = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

/** A small line-art canvas: sized for the device, animated only while on screen, and drawn as a
 *  single still frame (`stillAt`) when the visitor prefers reduced motion. */
export function useSketch(draw: Sketch, stillAt: number) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0,
      h = 0,
      dpr = 1,
      frame = 0,
      visible = false,
      t = 0,
      last = 0;
    const paint = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h, reduced ? stillAt : t);
    };
    const size = () => {
      const r = cv.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      paint();
    };
    const tick = (ms: number) => {
      t += last ? Math.min(0.1, (ms - last) / 1000) : 0;
      last = ms;
      paint();
      frame = visible && document.visibilityState === "visible" ? requestAnimationFrame(tick) : 0;
      if (!frame) last = 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !frame && !reduced) frame = requestAnimationFrame(tick);
    });
    const ro = new ResizeObserver(size);
    const onVis = () => visible && !frame && !reduced && (frame = requestAnimationFrame(tick));
    io.observe(cv);
    ro.observe(cv);
    document.addEventListener("visibilitychange", onVis);
    document.fonts?.ready.then(paint);
    return () => {
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      cancelAnimationFrame(frame);
    };
  }, [draw, stillAt]);
  return ref;
}

export const ink = (a: number) => `rgba(62,39,35,${a.toFixed(3)})`;
export const clamp = (x: number) => Math.min(1, Math.max(0, x));
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
