"use client";

import { useEffect } from "react";

// Scroll-linked morph for the homepage, driven by one rAF loop that sleeps when the page is still.
// Parts are found by data attributes inside [data-morph-root]:
//   heading  flies and shrinks into the manifesto's title slot (the `target`, an aria-hidden twin)
//   stage    the prism recedes, shrinks and dissolves
//   fade     notes and the scroll cue fade out early
//   rise     the manifesto rises into place
// Scroll speed adds a vertical motion blur (an SVG Gaussian blur on the y axis only) to what moves.
export function ScrollMorph() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-morph-root]");
    if (!root || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const heading = root.querySelector<HTMLElement>('[data-morph="heading"]');
    const target = root.querySelector<HTMLElement>('[data-morph="target"]');
    const stage = root.querySelector<HTMLElement>('[data-morph="stage"]');
    const hero = root.querySelector<HTMLElement>('[data-morph="hero"]');
    const blur = document.getElementById("morph-blur")?.querySelector("feGaussianBlur");
    const fades = [...root.querySelectorAll<HTMLElement>('[data-morph="fade"]')];
    const rises = [...root.querySelectorAll<HTMLElement>('[data-morph="rise"]')];
    if (!heading || !target || !stage || !hero || !blur) return;

    let geo = { dx: 0, dy: 0, scale: 1, span: 1 };
    const measure = () => {
      heading.style.transform = "none";
      const a = heading.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      geo = {
        dx: b.left - a.left,
        dy: b.top - a.top,
        scale: b.height / a.height,
        // The morph completes as the hero scrolls away.
        span: Math.max(1, hero.offsetHeight * 0.85),
      };
    };

    let frame = 0;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let speed = 0;

    const render = (now: number) => {
      frame = 0;
      const y = window.scrollY;
      const dt = Math.max(1, now - lastT);
      speed = speed * 0.7 + ((y - lastY) / dt) * 0.3;
      lastY = y;
      lastT = now;

      const p = Math.min(1, Math.max(0, y / geo.span));
      const e = p * p * (3 - 2 * p);
      const s = 1 + (geo.scale - 1) * e;
      heading.style.transform = `translate(${geo.dx * e}px, ${geo.dy * e}px) scale(${s})`;
      stage.style.transform = `translateY(${y * 0.35}px) scale(${1 - 0.14 * e})`;
      stage.style.opacity = String(Math.max(0, 1 - p * 1.35));
      for (const f of fades) f.style.opacity = String(Math.max(0, 1 - p * 3));
      const r = Math.min(1, Math.max(0, (p - 0.45) / 0.55));
      for (const el of rises) {
        el.style.opacity = String(0.15 + 0.85 * r);
        el.style.transform = `translateY(${(1 - r) * 32}px)`;
      }

      // Vertical motion blur from scroll speed (px/ms), only while the morph is in play.
      const amount = p > 0 && p < 1 ? Math.min(8, Math.abs(speed) * 2.2) : 0;
      if (amount > 0.25) {
        blur.setAttribute("stdDeviation", `0 ${amount.toFixed(2)}`);
        heading.style.filter = stage.style.filter = "url(#morph-blur)";
      } else {
        heading.style.filter = stage.style.filter = "";
      }

      if (Math.abs(speed) > 0.01) frame = requestAnimationFrame(render);
      else speed = 0;
    };

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };
    const remeasure = () => {
      measure();
      lastY = window.scrollY;
      render(performance.now());
    };

    root.dataset.morphReady = "";
    remeasure();
    document.fonts?.ready.then(remeasure);
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", remeasure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", remeasure);
      delete root.dataset.morphReady;
      for (const el of [heading, stage, ...fades, ...rises]) {
        el.style.transform = el.style.opacity = el.style.filter = "";
      }
    };
  }, []);

  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <filter id="morph-blur" x="-5%" y="-30%" width="110%" height="160%">
        <feGaussianBlur stdDeviation="0 0" />
      </filter>
    </svg>
  );
}
