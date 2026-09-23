"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

// Modal focus handling: move focus in on open, trap Tab/Shift+Tab, close on Escape.
// Restoring focus afterwards is the caller's job, since only it knows which element opened the dialog.
export function useDialogFocus(
  ref: RefObject<HTMLElement | null>,
  { onEscape, initial }: { onEscape: () => void; initial?: RefObject<HTMLElement | null> },
) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    (initial?.current ?? root.querySelector<HTMLElement>(FOCUSABLE))?.focus({
      preventScroll: true,
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const els = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [ref, onEscape, initial]);
}
