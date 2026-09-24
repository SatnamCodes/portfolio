"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { prismVariation, sessionSeed, type PrismVariation } from "@/lib/session-seed";
import { MarginNotes } from "./MarginNotes";
import { illustrationLayout, PrismIllustration } from "./PrismIllustration";
import s from "./PrismStage.module.css";

const PrismScene = dynamic(() => import("@/components/three/PrismScene"), { ssr: false });

type Status = "pending" | "webgl" | "fallback";

// Fraction of the stage width where the bands meet the interests list. Phones give the words a wider
// share so the list still fits beside the prism.
const LABEL_FRACTION = { wide: 0.74, narrow: 0.66 };
// Labels never crowd closer than this, even where the bands are tighter; they stay centred on the fan.
const MIN_LABEL_GAP = { wide: 26, narrow: 19 };

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}

function labelTop(ys: number[], i: number, n: number, gap: number) {
  const first = ys[0];
  const last = ys.at(-1)!;
  const span = Math.max(last - first, gap * (n - 1));
  const start = (first + last) / 2 - span / 2;
  return start + (span * i) / Math.max(1, n - 1);
}

// The light's arrival plays once per browser session; later visits start with the light already on.
const INTRO_KEY = "prism-intro-played";

function introPlayed() {
  try {
    return sessionStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

function webglAvailable() {
  try {
    const gl =
      document.createElement("canvas").getContext("webgl2") ??
      document.createElement("canvas").getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

function capabilityTier(): "high" | "low" {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowCores = (nav.hardwareConcurrency ?? 8) <= 4;
  const lowMemory = (nav.deviceMemory ?? 8) <= 4;
  return lowCores || lowMemory ? "low" : "high";
}

export function PrismStage({
  interests,
  description,
}: {
  interests: readonly string[];
  description: string;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [variation, setVariation] = useState<PrismVariation | null>(null);
  const [tier, setTier] = useState<"high" | "low">("high");
  const [inView, setInView] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [sceneYs, setSceneYs] = useState<number[] | null>(null);
  const [intro, setIntro] = useState(false);
  // static: labels simply shown · waiting: hidden until the light arrives · playing: fading in band by band
  const [labels, setLabels] = useState<"static" | "waiting" | "playing">("static");
  const wide = useMedia("(min-width: 48rem)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    // Load a little early, but only render while actually on screen.
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        if (!webglAvailable()) {
          setStatus("fallback");
          return;
        }
        const playIntro = !matchMedia("(prefers-reduced-motion: reduce)").matches && !introPlayed();
        setIntro(playIntro);
        setLabels(playIntro ? "waiting" : "static");
        setVariation(prismVariation(sessionSeed()));
        setTier(capabilityTier());
        setStatus("webgl");
      },
      { rootMargin: "300px 0px" },
    );
    const visible = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    near.observe(el);
    visible.observe(el);
    ro.observe(el);
    return () => {
      near.disconnect();
      visible.disconnect();
      ro.disconnect();
    };
  }, []);

  const onBandsLaid = useCallback((ys: number[]) => setSceneYs(ys), []);
  const onIntroStart = useCallback(() => {
    setLabels("playing");
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {}
  }, []);
  const onContextLost = useCallback(() => {
    setLabels("static");
    setSceneYs(null);
    setStatus("fallback");
  }, []);

  const fraction = LABEL_FRACTION[wide ? "wide" : "narrow"];
  const labelX = size ? size.w * fraction : null;
  const layout = useMemo(
    () => (size ? illustrationLayout(size.w, size.h, labelX) : null),
    [size, labelX],
  );
  const ys = status === "webgl" ? sceneYs : (layout?.ends.map(([, y]) => y) ?? null);

  return (
    <figure className={s.figure}>
      <div ref={stage} className={s.frame} data-status={status}>
        {size && layout && (
          <div className={s.illustration} aria-hidden="true">
            <PrismIllustration
              width={size.w}
              height={size.h}
              layout={layout}
              outlineOnly={status !== "fallback"}
            />
          </div>
        )}
        {status === "webgl" && variation && (
          <div className={s.canvas} aria-hidden="true">
            <PrismScene
              variation={variation}
              tier={tier}
              animate={!reduced}
              interactive={!reduced}
              intro={intro}
              onIntroStart={onIntroStart}
              frameloop={reduced ? "demand" : inView ? "always" : "never"}
              labelX={labelX}
              onBandsLaid={onBandsLaid}
              onContextLost={onContextLost}
            />
          </div>
        )}
      </div>
      <MarginNotes near="prism" className={s.note} />
      <ol
        className={s.interests}
        data-positioned={ys ? "" : undefined}
        data-labels={labels}
        aria-label="Interests"
      >
        {interests.map((item, i) => {
          const top = ys
            ? labelTop(ys, i, interests.length, MIN_LABEL_GAP[wide ? "wide" : "narrow"])
            : undefined;
          return (
            <li
              key={item}
              style={
                top === undefined
                  ? undefined
                  : ({
                      top: `${top}px`,
                      left: `${fraction * 100}%`,
                      "--i": i,
                    } as React.CSSProperties)
              }
            >
              {item}
            </li>
          );
        })}
      </ol>
      <figcaption className="visually-hidden">{description}</figcaption>
    </figure>
  );
}
