"use client";

import { useEffect, useState } from "react";
import s from "./ScrollCue.module.css";

export function ScrollCue() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const update = () => setHidden(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <p className={s.cue} data-hidden={hidden || undefined}>
      <span>Scroll to begin</span>
      <svg className={s.arrow} viewBox="0 0 12 34" width="12" height="34" aria-hidden="true">
        <path d="M6 1c.4 9-.3 20 .2 31M1.5 26.5c1.8 1.6 3.2 3.4 4.7 5.6 1.2-2.3 2.7-4 4.3-5.4" />
      </svg>
    </p>
  );
}
