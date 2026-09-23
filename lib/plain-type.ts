"use client";

import { useSyncExternalStore } from "react";

// One remembered preference for every handwritten surface (Shelves' gel pen, Wanderings' fountain pen).
// A per-viewer convenience, so browser storage is fine; if it's unavailable, handwriting stays on.
const KEY = "plain-type";
const EVENT = "plain-type-change";

function read() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function setPlainType(value: boolean) {
  try {
    localStorage.setItem(KEY, value ? "1" : "0");
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function usePlainType() {
  return useSyncExternalStore(subscribe, read, () => false);
}
