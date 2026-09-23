"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

// Hydration-safe: the server and the first client render both see `false`, then it updates.
export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(QUERY);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(QUERY).matches,
    () => false,
  );
}
