"use client";

import { useReducedMotion } from "@/lib/use-reduced-motion";
import { AnimatePresence, MotionConfig } from "motion/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { BookVariation } from "@/lib/book-variation";
import type { Spine } from "@/lib/content";
import { BookSymbols, Shelf } from "./Shelf";
import { ReadingView } from "./ReadingView";
import s from "./shelves.module.css";

export type BookData = {
  slug: string;
  title: string;
  category: string;
  kindLabel: string;
  author?: string;
  source?: { detail?: string; link?: string };
  spine?: Spine;
  variation: BookVariation;
};

const openFrom = (pathname: string) => pathname.match(/^\/shelves\/([^/]+)\/?$/)?.[1] ?? null;

export function Library({
  books,
  categories,
  notes,
}: {
  books: BookData[];
  categories: readonly string[];
  notes: Record<string, React.ReactNode>;
}) {
  const pathname = usePathname();
  const openSlug = openFrom(pathname);
  const reduced = useReducedMotion();
  // True when this page was loaded with a book already open (deep link): nothing to animate from.
  const pushed = useRef(false);
  const lastOpened = useRef<string | null>(openSlug);
  const bookButtons = useRef(new Map<string, HTMLButtonElement>());
  const open = openSlug ? books.find((b) => b.slug === openSlug) : undefined;

  const openBook = useCallback((slug: string) => {
    lastOpened.current = slug;
    pushed.current = true;
    window.history.pushState(null, "", `/shelves/${slug}`);
  }, []);

  const closeBook = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", "/shelves");
    }
  }, []);

  // Browser back while a book is open: the URL changes first and the book closes with it.
  useEffect(() => {
    const onPop = () => {
      pushed.current = false;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  const restoreFocus = useCallback(() => {
    const slug = lastOpened.current;
    if (slug) bookButtons.current.get(slug)?.focus({ preventScroll: true });
  }, []);

  const registerButton = useCallback((slug: string, el: HTMLButtonElement | null) => {
    if (el) bookButtons.current.set(slug, el);
    else bookButtons.current.delete(slug);
  }, []);

  const byCategory = useMemo(
    () => categories.map((c) => [c, books.filter((b) => b.category === c)] as const),
    [books, categories],
  );

  return (
    <MotionConfig reducedMotion="user">
      <BookSymbols />
      <div className={s.library}>
        {byCategory.map(([category, shelfBooks]) => (
          <Shelf
            key={category}
            category={category}
            books={shelfBooks}
            openSlug={openSlug}
            interactive={!open}
            reduced={reduced}
            onOpen={openBook}
            registerButton={registerButton}
          />
        ))}
      </div>
      {/* initial={false}: a deep-linked open book appears already open, with nothing to animate from. */}
      <AnimatePresence initial={false} onExitComplete={restoreFocus}>
        {open && (
          <ReadingView key={open.slug} book={open} reduced={reduced} onClose={closeBook}>
            {notes[open.slug]}
          </ReadingView>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
