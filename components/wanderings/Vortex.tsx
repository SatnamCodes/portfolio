"use client";

import { useEffect, useRef } from "react";
import s from "./Vortex.module.css";

// A Burgers vortex: an exact solution of the incompressible Navier–Stokes equations. An axial
// strain α stretches a line vortex while viscosity ν diffuses its core, and the two balance:
//
//   u_r = −α r / 2        (inflow toward the axis)
//   u_z =  α z            (stretching along the axis)
//   u_θ = Γ / (2π r) · (1 − exp(−r² / r_c²)),   r_c² = 4ν / α   (swirl, solid-body inside the core)
//
// Ink tracers are carried by exactly this field (RK2 steps), so they spiral inward, speed up as
// they near the axis (circulation is conserved outside the core), and are drawn out along it into
// a thin strand. Drawn in the page's ink colour on a transparent canvas: no background.
const ALPHA = 0.9; // strain rate, 1/s (scene units)
const RC = 0.12; // viscous core radius, in units of the tube's outer radius
const GAMMA = 2.6; // circulation
const R0 = 1; // radius at which tracers enter

type Tracer = { r: number; th: number; z: number; trail: number[]; age: number };

function velocity(r: number, z: number) {
  const ur = (-ALPHA * r) / 2;
  const uz = ALPHA * z;
  const swirl = (GAMMA / (2 * Math.PI * Math.max(r, 1e-4))) * (1 - Math.exp(-(r * r) / (RC * RC)));
  return { ur, uz, omega: swirl / Math.max(r, 1e-4) }; // omega = dθ/dt
}

function spawn(rand: () => number, fresh = false): Tracer {
  // Enter at the outer radius near the middle of the tube, at any angle.
  return {
    r: R0 * (0.85 + rand() * 0.15),
    th: rand() * Math.PI * 2,
    z: (rand() - 0.5) * (fresh ? 2.4 : 0.35),
    trail: [],
    age: 0,
  };
}

export function Vortex({ label }: { label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let w = 0,
      h = 0,
      dpr = 1,
      frame = 0,
      visible = false,
      last = 0;
    let tracers: Tracer[] = [];
    const TRAIL = 26;
    const ZMAX = 2.4;

    const size = () => {
      const b = cv.getBoundingClientRect();
      w = b.width;
      h = b.height;
      dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const n = w < 500 ? 420 : 700;
      tracers = Array.from({ length: n }, () => spawn(rand, true));
      // Warm up so the first frame already shows the developed flow.
      for (let i = 0; i < 240; i++) step(1 / 60);
      draw();
    };

    const step = (dt: number) => {
      for (const p of tracers) {
        // Midpoint (RK2) integration of the exact velocity field.
        const a = velocity(p.r, p.z);
        const rm = p.r + (a.ur * dt) / 2,
          zm = p.z + (a.uz * dt) / 2;
        const b = velocity(rm, zm);
        p.r += b.ur * dt;
        p.z += b.uz * dt;
        p.th += b.omega * dt;
        p.age += dt;
        // Project: the axis runs across the canvas; we look at the tube slightly from above.
        const x = p.z,
          y = p.r * Math.cos(p.th),
          depth = p.r * Math.sin(p.th);
        p.trail.push(x, y, depth);
        if (p.trail.length > TRAIL * 3) p.trail.splice(0, 3);
        if (Math.abs(p.z) > ZMAX || p.r < 0.004) Object.assign(p, spawn(rand));
      }
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const ink = getComputedStyle(cv).color;
      const sx = (w * 0.47) / ZMAX,
        sy = h * 0.34;
      const cx = w / 2,
        cy = h / 2;
      ctx.strokeStyle = ink;
      ctx.lineCap = "round";
      for (const p of tracers) {
        const t = p.trail;
        if (t.length < 6) continue;
        // Near side darker, far side fainter: an engraving's sense of depth.
        const depth = t[t.length - 1];
        // New tracers arrive faintly (the radial inflow is a whisper); ink darkens toward the
        // core, where the vorticity is concentrated.
        const fadeIn = Math.min(1, p.age / 1.6) ** 2;
        const core = Math.exp(-p.r / 0.35);
        ctx.globalAlpha = (0.1 + 0.3 * (0.5 + depth / (2 * R0)) + 0.35 * core) * fadeIn;
        ctx.lineWidth = 0.55 + 0.5 * (0.5 + depth / (2 * R0));
        ctx.beginPath();
        for (let i = 0; i < t.length; i += 3) {
          // A slightly oblique view: depth leans each circle into an ellipse, so the swirl reads
          // as a spiral rather than a flat up-and-down stroke.
          const X = cx + t[i] * sx + t[i + 2] * sy * 0.42,
            Y = cy + t[i + 1] * sy;
          if (i) ctx.lineTo(X, Y);
          else ctx.moveTo(X, Y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const tick = (ms: number) => {
      const dt = last ? Math.min(0.05, (ms - last) / 1000) : 1 / 60;
      last = ms;
      step(dt);
      draw();
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
    return () => {
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <figure className={s.vortex}>
      <canvas ref={ref} role="img" aria-label={label} />
    </figure>
  );
}

export function VortexPlate() {
  return (
    <Vortex label="An animated vortex: ink tracers spiral inward toward an axis and are stretched out along it into a thin strand, following the Burgers vortex, an exact solution of the Navier–Stokes equations." />
  );
}
