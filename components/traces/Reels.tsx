"use client";

import { AnimatePresence, MotionConfig } from "motion/react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { placeOnCurve, stepFollower, stepLead, wrap, type Reel } from "@/lib/reel-physics";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Viewer, type GalleryPhoto } from "./Gallery";
import s from "./Reels.module.css";

// The lower reel counter-runs at this fraction of the upper one.
const FOLLOW_RATIO = 0.82;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·—";
const pad = (n: number) => String(n).padStart(2, "0");

function detailLines(p: GalleryPhoto, i: number, n: number) {
  return [
    `Frame ${pad(i + 1)} / ${pad(n)}`,
    p.caption ?? "Untitled trace",
    p.place ?? "",
    p.kit ?? "",
  ];
}

// A reel on the film: muted, looping, and only playing while that frame is on screen.
function ReelVideo({ src, poster, reduced }: { src: string; poster: string; reduced: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || reduced) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, [reduced]);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      className={s.reelVideo}
    />
  );
}

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
    drag: null as null | { strip: number; x: number; t: number; v: number; moved: number },
    frameW: 300,
    active: -1,
  });

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
      sim.current.frameW = Math.round(Math.min(320, Math.max(180, w * 0.19)));
      el.style.setProperty("--frame-w", `${sim.current.frameW}px`);
      setCount(Math.max(n, Math.ceil((w * 1.9) / sim.current.frameW / n) * n));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [n]);

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
      const W = st.frameW;
      const half = el.clientWidth / 2;
      const radius = Math.max(700, el.clientWidth * 0.95);
      [st.lead, st.follow].forEach((reel, si) => {
        const strip = strips.current[si];
        if (!strip) return;
        const span = count * W;
        const kids = strip.children as HTMLCollectionOf<HTMLElement>;
        const skew = reduced ? 0 : Math.max(-9, Math.min(9, -reel.v / 240));
        for (let i = 0; i < kids.length; i++) {
          const pos = wrap(i * W - reel.x + span / 2, span) - span / 2;
          const kid = kids[i];
          // Past the bend's limit frames would pile up on the clamped edge; they're out of sight anyway.
          if (Math.abs(pos) > half + W * 1.5 || Math.abs(pos) / radius > 1.3) {
            kid.style.visibility = "hidden";
            continue;
          }
          const c = placeOnCurve(pos, radius, si === 0 ? -34 : 34, half);
          kid.style.visibility = "";
          kid.style.transform = `translate3d(${c.x - W / 2}px, ${c.y}px, ${c.z}px) rotateY(${c.rotateY}deg) skewX(${skew}deg)`;
        }
        const b = reduced ? 0 : Math.min(6, Math.abs(reel.v) / 420);
        strip.style.filter = b > 0.35 ? `url(#reel-blur-${si})` : "";
        document
          .getElementById(`reel-blur-${si}`)
          ?.querySelector("feGaussianBlur")
          ?.setAttribute("stdDeviation", `${b.toFixed(2)} 0`);
      });
      const idx = wrap(Math.round(st.lead.x / W), count) % n;
      if (idx !== st.active) {
        st.active = idx;
        setActive(idx);
      }
    };

    const tick = (now: number) => {
      const dt = last ? (now - last) / 1000 : 1 / 60;
      last = now;
      const idle = now / 1000 - st.lastInput;
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
          stepLead(st.lead, dt, st.frameW, reduced ? 0 : idle, reduced);
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
      st.lead.v = Math.max(-4200, Math.min(4200, st.lead.v + d * (e.deltaMode === 1 ? 90 : 5.5)));
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
  }, [count, n, reduced, nudge]);

  // Dragging: the lower reel runs the other way, so dragging it moves the upper one inversely.
  const onPointerDown = (strip: number) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    sim.current.drag = { strip, x: e.clientX, t: e.timeStamp, v: 0, moved: 0 };
    sim.current.goal = null;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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
    d.x = e.clientX;
    d.t = e.timeStamp;
    nudge();
  };
  const onPointerUp = () => {
    const d = sim.current.drag;
    if (!d) return;
    sim.current.lead.v = d.v;
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
  const centreOn = (photo: number) => {
    const st = sim.current;
    const W = st.frameW;
    const span = count * W;
    const base = Math.round(st.lead.x / span) * span;
    const options = [-span, 0, span].map((k) => base + k + photo * W);
    st.goal = options.reduce((a, b) => (Math.abs(b - st.lead.x) < Math.abs(a - st.lead.x) ? b : a));
    nudge();
  };
  const onFrameKey = (photo: number) => (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (photo + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
    realButtons.current[next]?.focus();
  };

  const restoreFocus = () => {
    if (returnTo.current !== null)
      realButtons.current[returnTo.current]?.focus({ preventScroll: true });
  };

  return (
    <MotionConfig reducedMotion="user">
      <section className={s.reels} aria-label="Traces, as two reels of film">
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          {[0, 1].map((i) => (
            <filter key={i} id={`reel-blur-${i}`} x="-10%" y="0" width="120%" height="100%">
              <feGaussianBlur stdDeviation="0 0" />
            </filter>
          ))}
        </svg>
        {lead}
        <div ref={stage} className={s.stage}>
          {frames.map((list, si) => (
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
              {list.map((pi, fi) => {
                const photo = photos[pi];
                const real = si === 0 && fi < n;
                return (
                  <button
                    key={fi}
                    ref={(el) => {
                      if (real) realButtons.current[pi] = el;
                    }}
                    type="button"
                    className={s.frame}
                    tabIndex={real ? 0 : -1}
                    aria-hidden={real ? undefined : true}
                    aria-label={real ? `${photo.alt} Open photograph.` : undefined}
                    onFocus={real ? () => centreOn(pi) : undefined}
                    onKeyDown={real ? onFrameKey(pi) : undefined}
                    onClick={() => {
                      returnTo.current = pi;
                      setOpen(pi);
                    }}
                  >
                    <span className={s.holes} data-edge="top" aria-hidden="true" />
                    <span className={s.picture}>
                      {photo.video ? (
                        <ReelVideo src={photo.video} poster={photo.src} reduced={reduced} />
                      ) : (
                        <Image
                          src={photo.src}
                          alt=""
                          fill
                          sizes="320px"
                          draggable={false}
                          priority={si === 0 && fi < 6}
                        />
                      )}
                    </span>
                    <span className={s.holes} data-edge="bottom" aria-hidden="true">
                      <span className={s.edgeMark}>
                        {pad(pi + 1)}
                        {si === 0 ? "A" : "B"}
                      </span>
                    </span>
                  </button>
                );
              })}
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
