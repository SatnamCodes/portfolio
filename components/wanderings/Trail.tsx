"use client";

import { useEffect, useRef, useState } from "react";
import { mulberry32 } from "@/lib/session-seed";
import s from "./Trail.module.css";

// A dotted footpath that wanders from each leaf to the next, drawn behind the paper. The leaves are
// laid out by the grid, so the path is measured from them and redrawn whenever the desk resizes.
export function Trail() {
  const svg = useRef<SVGSVGElement>(null);
  const [d, setD] = useState("");
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = svg.current;
    const desk = el?.parentElement;
    if (!el || !desk) return;
    const measure = () => {
      const box = desk.getBoundingClientRect();
      const leaves = [...desk.querySelectorAll<HTMLElement>("[data-leaf]")].map((leaf) => {
        const r = leaf.getBoundingClientRect();
        return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
      });
      // Seeded, so the path keeps its shape between visits and resizes.
      const rand = mulberry32(leaves.length * 7919);
      let path = "";
      for (let i = 0; i + 1 < leaves.length; i++) {
        const a = leaves[i];
        const b = leaves[i + 1];
        // Leave from under the leaf, somewhere off-centre; arrive at the top of the next.
        const x1 = a.x + a.w * (0.3 + rand() * 0.4);
        const y1 = a.y + a.h;
        const x2 = b.x + b.w * (0.3 + rand() * 0.4);
        const y2 = b.y;
        const dy = Math.max(24, y2 - y1);
        const sway = (rand() - 0.5) * Math.min(160, Math.abs(x2 - x1) * 0.5 + 60);
        path +=
          `M${x1.toFixed(1)} ${y1.toFixed(1)} ` +
          `C${(x1 + sway).toFixed(1)} ${(y1 + dy * 0.75).toFixed(1)} ` +
          `${(x2 - sway).toFixed(1)} ${(y2 - dy * 0.75).toFixed(1)} ` +
          `${x2.toFixed(1)} ${y2.toFixed(1)} `;
      }
      setSize({ w: box.width, h: box.height });
      setD(path.trim());
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(desk);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, []);

  return (
    <svg
      ref={svg}
      className={s.trail}
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}
      aria-hidden="true"
    >
      <defs>
        <mask id="trail-reveal" maskUnits="userSpaceOnUse">
          <path d={d} className={s.reveal} pathLength={1} />
        </mask>
      </defs>
      <path d={d} className={s.path} mask="url(#trail-reveal)" />
    </svg>
  );
}
