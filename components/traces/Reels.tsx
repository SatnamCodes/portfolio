"use client";

import { AnimatePresence, MotionConfig } from "motion/react";
import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IDLE_AFTER,
  layFilm,
  nearestSlot,
  offsetTo,
  placeOnCurve,
  stepFollower,
  stepLead,
  type Film,
  type Reel,
} from "@/lib/reel-physics";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Viewer, type GalleryPhoto } from "./Gallery";
import s from "./Reels.module.css";
import { asset } from "@/lib/base-path";

// The lower reel counter-runs at this fraction of the upper one.
const FOLLOW_RATIO = 0.82;
// A frame crossing the centre under momentum gives the film a small notch: it slows a touch as each
// picture passes the middle, like a detent, without ever stopping or jumping back.
const NOTCH = 0.9;
const NOTCH_ABOVE = 140; // px/s: slower than this, the ordinary snap takes over
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·—";
const pad = (n: number) => String(n).padStart(2, "0");
// Share of a cell's height the picture takes (the rest is sprocket holes), and its side margins.
const PICTURE_H = 0.74;
const PICTURE_MARGIN = 10;

// Each frame is cut to its picture: its own crop if it has one, else the photo's shape, kept sane.
function aspectOf(p: GalleryPhoto) {
  return p.frame?.aspect ?? Math.min(1.8, Math.max(0.56, p.width / p.height));
}

function detailLines(p: GalleryPhoto, i: number, n: number) {
  return [
    `Frame ${pad(i + 1)} / ${pad(n)}`,
    p.caption ?? "Untitled trace",
    p.place ?? "",
    p.kit ?? "",
  ];
}

// A reel on the film: muted and looping. Only the centred one plays (the film loop starts and stops
// them); a dozen videos decoding at once is what made the film stutter.
function ReelVideo({ src, poster, focus }: { src: string; poster: string; focus?: string }) {
  return (
    <video
      data-reel=""
      src={asset(src)}
      poster={asset(poster)}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      className={s.reelVideo}
      style={{ objectPosition: focus }}
    />
  );
}

// One cell of film. Memoised: the centred frame changes many times a second in a flick, and
// re-rendering every cell each time was a large part of the stutter.
const FilmFrame = memo(function FilmFrame({
  photo,
  index,
  width,
  real,
  priority,
  onOpen,
  onCentre,
  onKey,
  register,
}: {
  photo: GalleryPhoto;
  index: number;
  width: number;
  real: boolean;
  priority: boolean;
  onOpen: (photo: number) => void;
  onCentre: (photo: number) => void;
  onKey: (photo: number, e: React.KeyboardEvent) => void;
  register: (photo: number, el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={real ? (el) => register(index, el) : undefined}
      type="button"
      className={s.frame}
      style={{ width }}
      data-photo={index}
      tabIndex={real ? 0 : -1}
      aria-hidden={real ? undefined : true}
      aria-label={real ? `${photo.alt} Open photograph.` : undefined}
      onFocus={real ? () => onCentre(index) : undefined}
      onKeyDown={real ? (e) => onKey(index, e) : undefined}
      onClick={() => onOpen(index)}
    >
      <span className={s.holes} data-edge="top" aria-hidden="true" />
      <span className={s.picture}>
        {photo.video ? (
          <ReelVideo src={photo.video} poster={photo.src} focus={photo.frame?.focus} />
        ) : (
          <Image
            src={photo.src}
            alt=""
            fill
            sizes="360px"
            style={{ objectPosition: photo.frame?.focus }}
            draggable={false}
            priority={priority}
          />
        )}
      </span>
      <span className={s.holes} data-edge="bottom" aria-hidden="true">
        <span className={s.edgeMark}>{pad(index + 1)}A</span>
      </span>
    </button>
  );
});

export function Reels({ photos, lead }: { photos: GalleryPhoto[]; lead?: React.ReactNode }) {
  const reduced = useReducedMotion();
  const n = photos.length;
  const stage = useRef<HTMLDivElement>(null);
  const strips = useRef<(HTMLDivElement | null)[]>([]);
  const lineEls = useRef<(HTMLSpanElement | null)[]>([]);
  const realButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [announce, setAnnounce] = useState("");
  const returnTo = useRef<number | null>(null);

  // Enough frames per strip to wrap past both edges of a wide screen.
  const [count, setCount] = useState(Math.max(n, 12));
  const [frameH, setFrameH] = useState(240);
  const widths = useMemo(
    () => photos.map((p) => Math.round(frameH * PICTURE_H * aspectOf(p) + PICTURE_MARGIN)),
    [photos, frameH],
  );
  const frames = useMemo(
    () => [
      Array.from({ length: count }, (_, i) => i % n),
      Array.from({ length: count }, (_, i) => (n - 1 - ((i + 3) % n) + n) % n),
    ],
    [count, n],
  );

  // Physics state lives outside React: the loop writes transforms directly.
  const sim = useRef({
    lead: { x: 0, v: 0 } as Reel,
    follow: { x: 0, v: 0 } as Reel,
    goal: null as number | null,
    lastInput: -Infinity,
    dir: 1,
    drag: null as null | { strip: number; x: number; t: number; v: number; moved: number },
    film: layFilm([300]) as Film,
    active: -1,
  });
  const film = useMemo(() => layFilm(frames[0].map((pi) => widths[pi])), [frames, widths]);
  useEffect(() => {
    sim.current.film = film;
  }, [film]);

  const nudge = useCallback(() => {
    sim.current.lastInput = performance.now() / 1000;
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const section = el.parentElement!;
      section.style.setProperty("--details-top", `${el.offsetTop + el.offsetHeight / 2}px`);
      const h = Math.round(Math.min(330, window.innerHeight * 0.33, Math.max(160, w * 0.175)));
      el.style.setProperty("--frame-h", `${h}px`);
      // A fixed perspective pulls the bent ends in from the edges on wide screens; scale it so the
      // film always runs off both sides.
      el.style.perspective = `${Math.round(Math.max(1400, w * 1.2))}px`;
      setFrameH(h);
      const cycle = photos.reduce((a, p) => a + h * PICTURE_H * aspectOf(p) + PICTURE_MARGIN, 0);
      setCount(n * Math.max(1, Math.ceil((w * 1.9) / cycle)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [n, photos]);

  // Scramble the details into the active frame's words.
  useEffect(() => {
    const lines = detailLines(photos[active], active, n);
    const timer = setTimeout(() => setAnnounce(lines.filter(Boolean).join(". ")), 600);
    if (reduced) {
      lines.forEach((text, i) => {
        const el = lineEls.current[i];
        if (el) el.textContent = text;
      });
      return () => clearTimeout(timer);
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = now - start;
      let done = true;
      lines.forEach((text, li) => {
        const el = lineEls.current[li];
        if (!el) return;
        let out = "";
        for (let i = 0; i < text.length; i++) {
          const at = 90 + li * 70 + i * 16;
          if (text[i] === " " || t >= at) out += text[i];
          else {
            out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            done = false;
          }
        }
        el.textContent = out;
      });
      if (!done) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [active, photos, n, reduced]);

  // The film: physics, curve, speed effects. Runs while the reels are on screen.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const st = sim.current;
    let frame = 0;
    let last = 0;
    let visible = false;

    const render = () => {
      const f = st.film;
      const half = el.clientWidth / 2;
      const radius = Math.max(700, el.clientWidth * 0.95);
      [st.lead, st.follow].forEach((reel, si) => {
        const strip = strips.current[si];
        if (!strip) return;
        const kids = strip.children as HTMLCollectionOf<HTMLElement>;
        const skew = reduced ? 0 : Math.max(-9, Math.min(9, -reel.v / 240));
        for (let i = 0; i < kids.length; i++) {
          const kid = kids[i];
          const W = f.widths[i] ?? 0;
          const pos = offsetTo(f, reel.x, i);
          // The bend pulls frames in towards the centre, so cull by where a frame lands on screen, not
          // by its distance along the film; past the bend's limit frames would pile up on the edge.
          const c = placeOnCurve(pos, radius, si === 0 ? -34 : 34, half);
          if (Math.abs(pos) / radius > 1.35 || Math.abs(c.x) - W > half) {
            kid.style.visibility = "hidden";
            continue;
          }
          kid.style.visibility = "";
          kid.style.transform = `translate3d(${c.x - W / 2}px, ${c.y}px, ${c.z}px) rotateY(${c.rotateY}deg) skewX(${skew}deg)`;
        }
      });
      const slot = nearestSlot(f, st.lead.x);
      const idx = slot % n;
      if (idx !== st.active) {
        st.active = idx;
        setActive(idx);
        const kids = strips.current[0]?.children;
        if (kids)
          for (let i = 0; i < kids.length; i++) {
            const v = kids[i].querySelector<HTMLVideoElement>("video[data-reel]");
            if (!v) continue;
            if (i === slot && !reduced) v.play().catch(() => {});
            else if (!v.paused) v.pause();
          }
      }
    };

    const tick = (now: number) => {
      const dt = last ? (now - last) / 1000 : 1 / 60;
      last = now;
      const idle = now / 1000 - st.lastInput;
      const f = st.film;
      if (!st.drag) {
        if (st.goal !== null) {
          const k = 90;
          const a = k * (st.goal - st.lead.x) - 2 * Math.sqrt(k) * st.lead.v;
          st.lead.v += a * Math.min(dt, 1 / 30);
          st.lead.x += st.lead.v * Math.min(dt, 1 / 30);
          if (Math.abs(st.goal - st.lead.x) < 0.5 && Math.abs(st.lead.v) < 5) st.goal = null;
          if (reduced) {
            st.lead.x = st.goal ?? st.lead.x;
            st.goal = null;
          }
        } else {
          const snap = (x: number) => x + offsetTo(f, x, nearestSlot(f, x));
          const from = st.lead.x;
          stepLead(st.lead, dt, snap, reduced ? 0 : idle, reduced, st.dir);
          // A picture passing the middle during a flick: a small notch in the film's speed.
          if (!reduced && idle < IDLE_AFTER && Math.abs(st.lead.v) > NOTCH_ABOVE) {
            const slot = nearestSlot(f, st.lead.x);
            const before = offsetTo(f, from, slot);
            const after = offsetTo(f, st.lead.x, slot);
            if (before * after < 0) st.lead.v *= NOTCH;
          }
        }
      }
      stepFollower(st.follow, st.lead, dt, FOLLOW_RATIO, reduced);
      render();
      frame = visible ? requestAnimationFrame(tick) : 0;
      if (!frame) last = 0;
    };

    let onScreen = false;
    const wake = () => {
      visible = onScreen && document.visibilityState === "visible";
      if (visible && !frame) frame = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      wake();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", wake);

    // Wheel and trackpad: either axis pushes the film; the page doesn't scroll while over the reels.
    const onWheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      e.preventDefault();
      st.goal = null;
      const push = d * (e.deltaMode === 1 ? 40 : 2.4);
      st.lead.v = Math.max(-2400, Math.min(2400, st.lead.v + push));
      st.dir = Math.sign(push) || st.dir;
      nudge();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    render();
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", wake);
      cancelAnimationFrame(frame);
      el.removeEventListener("wheel", onWheel);
    };
  }, [count, n, film, reduced, nudge]);

  // Dragging: the lower reel runs the other way, so dragging it moves the upper one inversely.
  const onPointerDown = (strip: number) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    sim.current.drag = { strip, x: e.clientX, t: e.timeStamp, v: 0, moved: 0 };
    sim.current.goal = null;
    // No pointer capture yet: capturing now would send the click to the strip instead of the
    // photo under the mouse. It's taken once the pointer actually starts to drag (below).
    nudge();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = sim.current.drag;
    if (!d) return;
    const dx = e.clientX - d.x;
    const factor = d.strip === 0 ? -1 : 1 / FOLLOW_RATIO;
    sim.current.lead.x += dx * factor;
    const dt = Math.max(1, e.timeStamp - d.t);
    d.v = d.v * 0.5 + ((dx * factor) / dt) * 1000 * 0.5;
    d.moved += Math.abs(dx);
    const el = e.currentTarget as HTMLElement;
    if (d.moved > 4 && !el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
    d.x = e.clientX;
    d.t = e.timeStamp;
    nudge();
  };
  const onPointerUp = () => {
    const d = sim.current.drag;
    if (!d) return;
    sim.current.lead.v = d.v;
    if (Math.abs(d.v) > 20) sim.current.dir = Math.sign(d.v);
    sim.current.drag = null;
    nudge();
    // A real drag shouldn't also count as a click on the frame under the pointer.
    if (d.moved > 6) {
      const swallow = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
    }
  };

  // Keyboard: focusing a frame brings it to the centre; arrows step between frames.
  const centreOn = useCallback(
    (photo: number) => {
      const st = sim.current;
      st.goal = st.lead.x + offsetTo(st.film, st.lead.x, photo);
      nudge();
    },
    [nudge],
  );
  const onFrameKey = useCallback(
    (photo: number, e: React.KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const next = (photo + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
      realButtons.current[next]?.focus();
    },
    [n],
  );
  const openFrame = useCallback((photo: number) => {
    returnTo.current = photo;
    setOpen(photo);
  }, []);
  const register = useCallback((photo: number, el: HTMLButtonElement | null) => {
    realButtons.current[photo] = el;
  }, []);

  const restoreFocus = () => {
    if (returnTo.current !== null)
      realButtons.current[returnTo.current]?.focus({ preventScroll: true });
  };

  return (
    <MotionConfig reducedMotion="user">
      <section className={s.reels} aria-label="Traces, as two reels of film">
        {lead}
        <div ref={stage} className={s.stage}>
          {frames.slice(0, 1).map((list, si) => (
            <div
              key={si}
              ref={(el) => {
                strips.current[si] = el;
              }}
              className={s.strip}
              data-strip={si}
              onPointerDown={onPointerDown(si)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {list.map((pi, fi) => (
                <FilmFrame
                  key={fi}
                  photo={photos[pi]}
                  index={pi}
                  width={widths[pi]}
                  real={fi < n}
                  priority={fi < 6}
                  onOpen={openFrame}
                  onCentre={centreOn}
                  onKey={onFrameKey}
                  register={register}
                />
              ))}
            </div>
          ))}
        </div>

        <p className={s.hint} aria-hidden="true">
          Scroll or drag the film
        </p>
        <div className={s.details} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              ref={(el) => {
                lineEls.current[i] = el;
              }}
              className={s.line}
              data-line={i}
            />
          ))}
        </div>
        <p className="visually-hidden" aria-live="polite">
          {announce}
        </p>
      </section>

      <AnimatePresence onExitComplete={restoreFocus}>
        {open !== null && (
          <Viewer
            photos={photos}
            index={open}
            morphId={null}
            reduced={reduced}
            onIndex={(i) => {
              returnTo.current = i;
              setOpen(i);
            }}
            onClose={() => setOpen(null)}
          />
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
