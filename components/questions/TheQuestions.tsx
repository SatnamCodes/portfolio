"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PageLink } from "@/components/PageLink";
import { FooterLinks } from "@/components/SiteFooter";
import { asset } from "@/lib/base-path";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { Env, Fonts } from "./engine/core";
import { clearClouds } from "./engine/points";
import { finish, grain, paper } from "./engine/texture";
import { render } from "./scenes";
import { SOURCES } from "./sources";
import { AUDIO_SRC, DURATION, sceneAt } from "./timeline";
import s from "./TheQuestions.module.css";

const FINAL = "What lies between what we know and what remains unknown?";

function readFonts(): Fonts {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    display: v("--font-display", "Georgia, serif"),
    fountain: v("--font-fountain", "cursive"),
    meta: v("--font-meta", "system-ui, sans-serif"),
    body: v("--font-body", "Georgia, serif"),
  };
}

/**
 * "The Questions": a generative sequence that closes the homepage. Drawn live on a canvas (no
 * video), it plays when it scrolls into view and rests on its final frame, which is the end of
 * the page. Narration is optional: public/audio/the-questions.mp3 is used when present.
 */
export function TheQuestions({ colophon }: { colophon: string }) {
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const clock = useRef({
    t: 0,
    playing: false,
    started: false,
    visible: false,
    seek: null as number | null,
  });
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(true);
  const [hasAudio, setHasAudio] = useState(false);
  const [debug, setDebug] = useState<{ t: number; scene: string }>({ t: 0, scene: "" });
  // ?debug=true shows the timeline panel (scene, time, seek, audio status).
  const debugOn = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(location.search).get("debug") === "true",
    () => false,
  );

  // Does the narration exist? The animation never waits for the answer.
  useEffect(() => {
    fetch(asset(AUDIO_SRC), { method: "HEAD" })
      .then((r) => setHasAudio(r.ok && (r.headers.get("content-type") ?? "").includes("audio")))
      .catch(() => setHasAudio(false));
  }, []);

  useEffect(() => {
    const el = section.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const c = clock.current;
    let frame = 0;
    let last = 0;
    let fonts: Fonts = readFonts();
    let paperTile: HTMLCanvasElement | null = null;
    const grainTile = grain();
    let dpr = 1;
    let w = 0;
    let h = 0;
    const pointer = { x: 0, y: 0, active: false };

    const size = () => {
      const r = el.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 1.75);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      paperTile = paper(w, h, dpr);
      clearClouds();
      draw(performance.now() / 1000);
    };

    const draw = (now: number) => {
      if (!paperTile || !w) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(paperTile, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const env: Env = { ctx, w, h, t: c.t, now, fonts, pointer, portrait: w / h < 0.85 };
      render(env, colophon, reduced);
      finish(env, grainTile);
    };

    const tick = (ms: number) => {
      const now = ms / 1000;
      const dt = last ? Math.min(0.1, now - last) : 0;
      last = now;
      if (c.seek !== null) {
        c.t = c.seek;
        c.seek = null;
        if (audio.current) audio.current.currentTime = c.t;
      }
      if (c.playing) {
        c.t = Math.min(DURATION, c.t + dt);
        // Keep narration in step with the drawing (the drawing is the clock).
        const a = audio.current;
        if (a && !a.paused && Math.abs(a.currentTime - c.t) > 0.35) a.currentTime = c.t;
        if (c.t >= DURATION) {
          c.playing = false;
          setPlaying(false);
          setEnded(true);
          audio.current?.pause();
        }
      }
      draw(now);
      if (debugOn) setDebug((d) => ({ ...d, t: c.t, scene: sceneAt(c.t).name }));
      const keepGoing =
        c.visible && document.visibilityState === "visible" && (c.playing || pointer.active);
      frame = keepGoing ? requestAnimationFrame(tick) : 0;
      if (!frame) last = 0;
    };
    const debugOn = new URLSearchParams(location.search).get("debug") === "true";
    // Reduced motion: one still drawing of the final frame (the prism), no loop, no autoplay.
    if (reduced) {
      c.t = 125.5; // the spectrum, fully dispersed
      const ro = new ResizeObserver(() => {
        const r = cv.getBoundingClientRect();
        w = r.width;
        h = r.height;
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
        paperTile = paper(w, h, dpr);
        draw(0);
      });
      ro.observe(cv);
      document.fonts?.ready.then(() => {
        fonts = readFonts();
        draw(0);
      });
      return () => ro.disconnect();
    }
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    (el as HTMLElement & { __wake?: () => void }).__wake = wake;

    // Plays when most of it is on screen; pauses when it leaves.
    const io = new IntersectionObserver(
      ([entry]) => {
        c.visible = entry.isIntersecting;
        if (entry.intersectionRatio >= 0.5 && !c.started) {
          c.started = true;
          c.playing = true;
          setPlaying(true);
          setStarted(true);
        }
        if (!entry.isIntersecting && c.playing) audio.current?.pause();
        if (entry.isIntersecting && c.playing && audio.current && !audio.current.muted)
          audio.current.play().catch(() => {});
        wake();
      },
      { threshold: [0, 0.5] },
    );
    io.observe(el);
    const ro = new ResizeObserver(size);
    ro.observe(el);
    const onVis = () => {
      if (document.visibilityState === "visible") wake();
      else audio.current?.pause();
    };
    document.addEventListener("visibilitychange", onVis);
    const onMove = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.x = ev.clientX - r.left;
      pointer.y = ev.clientY - r.top;
      pointer.active = true;
      wake();
    };
    const onLeave = () => (pointer.active = false);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    // Canvas text needs the real web fonts, including the lazily loaded handwriting face.
    document.fonts?.ready.then(async () => {
      fonts = readFonts();
      await Promise.all([
        document.fonts.load(`40px ${fonts.fountain}`),
        document.fonts.load(`italic 20px ${fonts.body}`),
      ]).catch(() => {});
      clearClouds();
      size();
    });
    size();
    return () => {
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
      audio.current?.pause();
    };
  }, [reduced, colophon]);

  const wake = () =>
    (section.current as (HTMLElement & { __wake?: () => void }) | null)?.__wake?.();
  const ensureAudio = () => {
    if (!audio.current) {
      audio.current = new Audio(asset(AUDIO_SRC));
      audio.current.preload = "auto";
    }
    return audio.current;
  };
  const togglePlay = () => {
    const c = clock.current;
    if (c.t >= DURATION) return replay();
    c.playing = !c.playing;
    c.started = true;
    setStarted(true);
    setPlaying(c.playing);
    if (audio.current && !muted) {
      if (c.playing) {
        audio.current.currentTime = c.t;
        audio.current.play().catch(() => {});
      } else audio.current.pause();
    }
    wake();
  };
  const toggleSound = () => {
    const a = ensureAudio();
    const next = !muted;
    setMuted(next);
    a.muted = next;
    if (!next && clock.current.playing) {
      a.currentTime = clock.current.t;
      a.play().catch(() => {});
    }
  };
  const replay = () => {
    const c = clock.current;
    c.seek = 0;
    c.t = 0;
    c.playing = true;
    c.started = true;
    setPlaying(true);
    setEnded(false);
    if (audio.current && !muted) {
      audio.current.currentTime = 0;
      audio.current.play().catch(() => {});
    }
    wake();
  };
  const seek = (v: number) => {
    clock.current.seek = v;
    setEnded(v >= DURATION);
    wake();
  };

  return (
    <section
      ref={section}
      className={s.questions}
      data-reduced={reduced || undefined}
      aria-labelledby="questions-title"
    >
      <h2 id="questions-title" className="visually-hidden">
        The Questions
      </h2>
      {!reduced && <canvas ref={canvas} className={s.canvas} aria-hidden="true" />}
      {/* The sequence as text: what screen readers and crawlers get, and what reduced motion shows. */}
      <div className={s.text}>
        <ol className={s.list}>
          {SOURCES.map((src) => (
            <li key={src.id}>
              <p className={s.q}>{src.question}</p>
              <p className={s.src}>
                {src.person}, {src.work} · {src.year}
              </p>
              {src.quotation && <p className={s.quote}>“{src.quotation}”</p>}
            </li>
          ))}
        </ol>
        <p className={s.final}>{FINAL}</p>
        <p className={s.src}>
          <PageLink href="/questions">See all ten on the plate, with sources</PageLink>
        </p>
      </div>
      {reduced && <canvas ref={canvas} className={s.still} aria-hidden="true" />}
      {!reduced && (
        <div className={s.controls}>
          <PageLink href="/questions" className={s.plateLink}>
            The plate
          </PageLink>
          <button type="button" onClick={togglePlay} aria-pressed={playing}>
            {ended ? "Replay" : playing ? "Pause" : "Play"}
          </button>
          {hasAudio && (
            <button type="button" onClick={toggleSound} aria-pressed={!muted}>
              {muted ? "Sound on" : "Sound off"}
            </button>
          )}
          {!ended && started && (
            <button type="button" onClick={replay}>
              Replay
            </button>
          )}
        </div>
      )}
      {debugOn && !reduced && (
        <div className={s.debug}>
          <span>{debug.scene}</span>
          <span>{debug.t.toFixed(1)}s</span>
          <input
            type="range"
            min={0}
            max={DURATION}
            step={0.1}
            value={debug.t}
            onChange={(ev) => seek(Number(ev.target.value))}
            aria-label="Seek"
          />
          <span>audio: {hasAudio ? (muted ? "muted" : "on") : "none"}</span>
        </div>
      )}
      <p className={s.colophon}>{colophon}</p>
      <FooterLinks className={s.contact} />
    </section>
  );
}
