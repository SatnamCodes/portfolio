"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import s from "./Elsewhere.module.css";
import { asset } from "@/lib/base-path";

const LINKEDIN = "https://www.linkedin.com/in/satnamcodes/";
const X = "https://x.com/gitblamesatnam";
const ANNOUNCEMENT = "I aM ThriLLed To AnnOunce that You are GoiNg to My LinkEdIN";

// How long each send-off plays before the browser follows the link.
const HOLD = { linkedin: 3400, x: 4200 } as const;
type Where = keyof typeof HOLD;

// Plain links underneath: middle-click, cmd-click and no-JS all go straight there. A plain click
// plays a short send-off first, then follows the link in this tab.
export function Elsewhere() {
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState<Where | null>(null);
  const goNow = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!leaving) return;
    goNow.current?.focus();
    const href = leaving === "linkedin" ? LINKEDIN : X;
    const timer = setTimeout(() => window.location.assign(href), reduced ? 1400 : HOLD[leaving]);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLeaving(null);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [leaving, reduced]);

  const sendOff = (where: Where) => (e: React.MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setLeaving(where);
  };

  return (
    <section className={s.elsewhere} aria-labelledby="elsewhere-title">
      <h2 id="elsewhere-title" className={s.title}>
        Or find me elsewhere
      </h2>
      <div className={s.buttons}>
        <a href={LINKEDIN} className={s.button} onClick={sendOff("linkedin")}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className={s.icon}>
            <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.06c.53-1 1.83-1.8 3.64-1.8 3.9 0 4.6 2.4 4.6 5.6v5.7h-4v-5c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8v5.1h-4v-11Z" />
          </svg>
          LinkedIn
        </a>
        <a href={X} className={s.button} onClick={sendOff("x")}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className={s.icon}>
            <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2Z" />
          </svg>
          X
        </a>
      </div>

      {leaving && (
        <div
          className={s.overlay}
          data-where={leaving}
          data-reduced={reduced || undefined}
          role="dialog"
          aria-modal="true"
          aria-label={leaving === "linkedin" ? "Going to LinkedIn" : "Going to X"}
        >
          {leaving === "linkedin" ? <Announcement /> : <Smoke />}
          <div className={s.actions}>
            <a ref={goNow} href={leaving === "linkedin" ? LINKEDIN : X} className={s.go}>
              Go now
            </a>
            <button type="button" className={s.stay} onClick={() => setLeaving(null)}>
              Stay here
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// Each letter bounces in with its own tilt, with the announcement's ThriLLing capitalisation intact.
function Announcement() {
  let n = 0;
  return (
    <div className={s.announce}>
      <span className={s.badge} aria-hidden="true">
        in
      </span>
      <p className={s.headline} aria-label={ANNOUNCEMENT}>
        {ANNOUNCEMENT.split(" ").map((word, wi) => (
          <span key={wi} className={s.word} aria-hidden="true">
            {[...word].map((ch, ci) => {
              const i = n++;
              return (
                <span
                  key={ci}
                  className={s.letter}
                  style={
                    { "--i": i, "--tilt": `${((i * 37) % 23) - 11}deg` } as React.CSSProperties
                  }
                >
                  {ch}
                </span>
              );
            })}
          </span>
        ))}
      </p>
      <p className={s.reactions} aria-hidden="true">
        <span>Celebrate</span>
        <span>Insightful</span>
        <span>Love</span>
      </p>
    </div>
  );
}

// The smoking clip, recoloured into the site's palette (espresso shadows, Sea Sand highlights), with
// then the browser follows the link to X.
function Smoke() {
  return (
    <div className={s.studio}>
      {/* eslint-disable-next-line @next/next/no-img-element -- animated WebP; next/image would freeze it */}
      <img src={asset("/post/x-smoke.webp")} width={480} height={272} alt="" className={s.clip} />
      <p className={s.handle}>@gitblamesatnam</p>
    </div>
  );
}
