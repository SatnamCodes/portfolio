"use client";

import { useEffect, useRef } from "react";
import s from "./Journey.module.css";

// Geometry in a 640×110 drawing. Three stops: the first is reached by road, the second by air.
const ROAD = "M10 80 L170 80";
const RAIL = "M170 80 L246 80";
// Level at both ends: the plane touches down at the second stop and takes off again from it.
const FLIGHT = "M246 80 C 300 6, 392 78, 440 78";
const ONWARD = "M440 78 C 486 78, 560 18, 630 34";
const STOPS = [
  { x: 170, y: 80 },
  { x: 440, y: 80 },
  { x: 630, y: 34 },
];

// One loop, in seconds.
const LOOP = 12;
const T = {
  road: [0.2, 2.4],
  toTrain: 2.4,
  rail: [2.7, 3.7],
  toPlane: 3.7,
  flight: [4.0, 6.9],
  onward: [7.0, 9.3],
  fadeOut: 11.1,
} as const;

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const between = (t: number, [a, b]: readonly [number, number]) => clamp((t - a) / (b - a));
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const easeIn = (x: number) => x * x;

export function Journey({ places }: { places: readonly string[] }) {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = svg.current;
    if (!root) return;
    const q = <E extends Element>(sel: string) => root.querySelector<E>(sel)!;
    const road = q<SVGPathElement>("[data-road]");
    const rail = q<SVGPathElement>("[data-rail]");
    const flight = q<SVGPathElement>("[data-flight]");
    const onward = q<SVGPathElement>("[data-onward]");
    const reveals = (["road", "rail", "flight", "onward", "ties"] as const).map((name) =>
      q<SVGPathElement>(`[data-reveal="${name}"]`),
    );
    const vehicle = q<SVGGElement>("[data-vehicle]");
    const car = q<SVGGElement>("[data-car]");
    const train = q<SVGGElement>("[data-train]");
    const plane = q<SVGGElement>("[data-plane]");
    const pins = [...root.querySelectorAll<SVGGElement>("[data-pin]")];
    const world = q<SVGGElement>("[data-world]");
    const lengths = reveals.map((p) => p.getTotalLength());
    reveals.forEach((p, i) => {
      p.style.strokeDasharray = `${lengths[i]}`;
    });

    const at = (path: SVGPathElement, x: number) => {
      const L = path.getTotalLength();
      const a = path.getPointAtLength(L * x);
      const b = path.getPointAtLength(Math.min(L, L * x + 1));
      const c = path.getPointAtLength(Math.max(0, L * x - 1));
      return { x: a.x, y: a.y, angle: (Math.atan2(b.y - c.y, b.x - c.x) * 180) / Math.PI };
    };

    const show = (el: SVGGElement, amount: number) => {
      el.style.opacity = String(amount);
      el.style.transform = `scale(${0.55 + 0.45 * amount}, ${0.8 + 0.2 * amount})`;
    };

    const draw = (t: number) => {
      const fade = 1 - clamp((t - T.fadeOut) / (LOOP - T.fadeOut));
      root.style.setProperty("--journey-fade", String(fade));
      const progress = [
        easeInOut(between(t, T.road)),
        easeIn(between(t, T.rail)),
        easeInOut(between(t, T.flight)),
        easeInOut(between(t, T.onward)),
        easeIn(between(t, T.rail)),
      ];
      reveals.forEach((p, i) => {
        p.style.strokeDashoffset = String(lengths[i] * (1 - progress[i]));
      });

      let pos;
      if (t < T.road[1]) pos = at(road, progress[0]);
      else if (t < T.flight[0]) pos = at(rail, progress[1]);
      else if (t < T.onward[0]) pos = at(flight, progress[2]);
      else pos = at(onward, progress[3]);
      const flying = t >= T.toPlane;
      vehicle.setAttribute(
        "transform",
        `translate(${pos.x} ${pos.y}) rotate(${flying ? pos.angle : 0})`,
      );
      vehicle.style.opacity = String(
        t > T.onward[1] - 0.6 ? 1 - between(t, [T.onward[1] - 0.6, T.onward[1]]) : 1,
      );

      // Vehicles change with a quick squash: car → train at the first stop, train → plane at take-off.
      const m1 = between(t, [T.toTrain, T.toTrain + 0.3]);
      const m2 = between(t, [T.toPlane, T.toPlane + 0.3]);
      show(car, 1 - m1);
      show(train, m1 * (1 - m2));
      show(plane, m2);

      const drop = (el: SVGGElement, start: number) => {
        const x = between(t, [start, start + 0.45]);
        const bounce = x < 1 ? -14 * (1 - x) ** 2 * Math.cos(x * 7) : 0;
        el.style.opacity = String(x > 0 ? 1 : 0);
        el.setAttribute("transform", `translate(0 ${bounce.toFixed(2)})`);
      };
      drop(pins[0], T.road[1] - 0.05);
      drop(pins[1], T.flight[1] - 0.05);
      world.style.opacity = String(between(t, [T.onward[1] - 0.3, T.onward[1] + 0.2]));
    };

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw(T.onward[1] + 1);
      vehicle.style.opacity = "0";
      return;
    }

    let frame = 0;
    let start = 0;
    let visible = false;
    const tick = (now: number) => {
      if (!start) start = now;
      draw(((now - start) / 1000) % LOOP);
      frame = visible ? requestAnimationFrame(tick) : 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !frame) frame = requestAnimationFrame(tick);
    });
    io.observe(root);
    draw(0);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  if (places.length !== 3) {
    return (
      <ol className={s.fallback} aria-label="Path">
        {places.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
    );
  }

  return (
    <figure className={s.journey}>
      <ol className="visually-hidden" aria-label="Path">
        {places.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      <svg ref={svg} viewBox="0 0 640 110" className={s.drawing} aria-hidden="true">
        <defs>
          <mask id="contrail-mask" maskUnits="userSpaceOnUse">
            <path d={FLIGHT} data-reveal="flight" className={s.maskStroke} />
          </mask>
          <mask id="rail-mask" maskUnits="userSpaceOnUse">
            <path d={RAIL} data-reveal="ties" className={s.maskStroke} />
          </mask>
          <mask id="onward-mask" maskUnits="userSpaceOnUse">
            <path d={ONWARD} data-reveal="onward" className={s.maskStroke} />
          </mask>
        </defs>
        {/* Faint pencil guide of the whole route; the ink follows the vehicle. */}
        <path d={`${ROAD} ${RAIL}`} className={s.guide} />
        <path d={FLIGHT} className={s.guide} />
        <path d={ONWARD} className={s.guide} />
        <path d={ROAD} data-road="" className={s.road} />
        <path d={ROAD} data-reveal="road" className={s.roadInk} />
        <path d={RAIL} data-rail="" className={s.road} />
        <path d={RAIL} data-reveal="rail" className={s.rail} />
        <path d={RAIL} className={s.ties} mask="url(#rail-mask)" />
        <path d={FLIGHT} data-flight="" className={s.hidden} />
        <path d={FLIGHT} className={s.contrail} mask="url(#contrail-mask)" />
        <path d={ONWARD} data-onward="" className={s.hidden} />
        <path d={ONWARD} className={s.contrail} mask="url(#onward-mask)" />

        {STOPS.slice(0, 2).map((stop, i) => (
          <g key={i} transform={`translate(${stop.x} ${stop.y})`}>
            <g data-pin="" className={s.pin}>
              <path d="M0 0C-4.5-6.5-6-8.8-6-11.6a6 6 0 1 1 12 0C6-8.8 4.5-6.5 0 0Z" />
              <circle cx="0" cy="-11.8" r="2.1" className={s.pinHole} />
            </g>
            <text x="0" y="20" textAnchor="middle" className={s.label}>
              {places[i]}
            </text>
          </g>
        ))}
        <g transform={`translate(${STOPS[2].x} ${STOPS[2].y})`}>
          <g data-world="" className={s.world}>
            <circle r="7" />
            <path d="M-7 0h14M0-7c-3.2 3.8-3.2 10.2 0 14M0-7c3.2 3.8 3.2 10.2 0 14" />
          </g>
          <text x="0" y="26" textAnchor="end" dx="7" className={s.label}>
            {places[2]}
          </text>
        </g>

        <g data-vehicle="" className={s.vehicle}>
          <g data-car="" className={s.icon}>
            <path d="M-11-3h22v-3.5l-4-4.5h-11.5l-4.5 4.5Z" />
            <path d="M-4.5-11v4.5M2.5-11v4.5" />
            <circle cx="-6" cy="-2.4" r="2.4" />
            <circle cx="6" cy="-2.4" r="2.4" />
          </g>
          <g data-train="" className={s.icon}>
            <path d="M-13-3.5V-12a3 3 0 0 1 3-3h16c3 0 7 3.5 7 7.5v4.5Z" />
            <path d="M-9-12h5v4h-5ZM-1-12h5v4h-5Z" />
            <circle cx="-8" cy="-2" r="2" />
            <circle cx="5" cy="-2" r="2" />
          </g>
          <g data-plane="" className={s.icon}>
            <path d="M-12-2h17c3.5 0 6.5-1 6.5-2.5S8.5-7 5-7h-8.5l-6-6h-3l2.5 6h-2.5l-2.5-3h-2l1.5 4.5Z" />
            <path d="M-2-4.5l4 6h3l-2-6" />
          </g>
        </g>
      </svg>
    </figure>
  );
}
