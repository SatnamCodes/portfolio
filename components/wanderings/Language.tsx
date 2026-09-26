"use client";

import { useSyncExternalStore } from "react";

// English or Punjabi for a wandering that has a translation. Both versions are in the page's HTML
// (so readers without JavaScript, and crawlers, get both); this only chooses which one shows.
// The choice lives in the URL hash, so "#punjabi" links straight to the translation.

export type Lang = "en" | "pa";

const HASH = "#punjabi";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("hashchange", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("hashchange", cb);
  };
}

const current = (): Lang => (window.location.hash === HASH ? "pa" : "en");

export function useLang() {
  return useSyncExternalStore(subscribe, current, () => "en" as Lang);
}

function setLang(lang: Lang, articleId: string) {
  const url = new URL(window.location.href);
  url.hash = lang === "pa" ? HASH : "";
  window.history.replaceState(window.history.state, "", url);
  listeners.forEach((cb) => cb());
  // The two versions differ in length: start the reader at the top of the one they chose.
  const top = document.getElementById(articleId)?.getBoundingClientRect().top ?? 0;
  if (top < 0) window.scrollBy({ top: top - 24 });
}

export function LanguageToggle({
  className,
  articleId,
}: {
  className?: string;
  articleId: string;
}) {
  const lang = useLang();
  return (
    <button
      type="button"
      className={className}
      aria-pressed={lang === "pa"}
      onClick={() => setLang(lang === "pa" ? "en" : "pa", articleId)}
    >
      {lang === "pa" ? (
        <span lang="en">Read in English</span>
      ) : (
        <span lang="pa">ਪੰਜਾਬੀ ਵਿੱਚ ਪੜ੍ਹੋ</span>
      )}
    </button>
  );
}

/** One language's version of the essay; hidden while the other is chosen. */
export function LanguagePane({
  lang,
  className,
  children,
}: {
  lang: Lang;
  className?: string;
  children: React.ReactNode;
}) {
  const active = useLang();
  return (
    <div lang={lang} className={className} hidden={active !== lang}>
      {children}
    </div>
  );
}

/** Renders its children only while `lang` is showing (for pieces tied to one language's text). */
export function OnlyIn({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return useLang() === lang ? children : null;
}
