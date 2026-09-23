"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { setPlainType, usePlainType } from "@/lib/plain-type";
import { TONES } from "@/lib/book-variation";
import type { BookData } from "./Library";
import s from "./shelves.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;

const tone = (name: string) =>
  `var(--color-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/(\d)/, "-$1")})`;

function focusables(root: HTMLElement) {
  return [
    ...root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => el.offsetParent !== null || el === document.activeElement);
}

export function ReadingView({
  book,
  reduced,
  onClose,
  children,
}: {
  book: BookData;
  reduced: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  const plain = usePlainType();
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const dialog = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const pages = useRef<HTMLDivElement>(null);
  const [cover] = TONES[book.variation.tone];
  const titleId = `reading-${book.slug}`;

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  // The cover swings shut before the book returns to its shelf.
  const requestClose = useCallback(() => {
    if (reduced) onClose();
    else setClosing(true);
  }, [reduced, onClose]);

  const measure = useCallback(() => {
    const el = pages.current;
    if (!el) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const count = Math.max(1, Math.round((el.scrollWidth + gap) / (el.clientWidth + gap)));
    setPageCount(count);
    setPage((p) => Math.min(p, count - 1));
  }, []);

  useEffect(() => {
    const el = pages.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, plain]);

  useEffect(() => {
    const el = pages.current;
    if (!el) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollTo({ left: page * (el.clientWidth + gap), behavior: reduced ? "auto" : "smooth" });
  }, [page, reduced]);

  const turn = useCallback(
    (delta: number) => setPage((p) => Math.max(0, Math.min(pageCount - 1, p + delta))),
    [pageCount],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      requestClose();
    } else if (e.key === "ArrowRight" && pageCount > 1) {
      turn(1);
    } else if (e.key === "ArrowLeft" && pageCount > 1) {
      turn(-1);
    } else if (e.key === "Tab" && dialog.current) {
      const els = focusables(dialog.current);
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === heading.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  // A focused link on a later page scrolls the columns; keep the page counter honest.
  const onFocusCapture = () => {
    const el = pages.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
      setPage(Math.round(el.scrollLeft / (el.clientWidth + gap)));
    });
  };

  const togglePlain = () => setPlainType(!plain);

  return (
    <>
      <motion.div
        className={s.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        onClick={requestClose}
        aria-hidden="true"
      />
      <motion.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={s.reader}
        layoutId={reduced ? undefined : `book-${book.slug}`}
        initial={reduced ? { opacity: 0 } : undefined}
        animate={reduced ? { opacity: 1 } : undefined}
        exit={reduced ? { opacity: 0 } : undefined}
        transition={{ layout: { duration: 0.7, ease: EASE }, opacity: { duration: 0.2 } }}
        style={{ borderRadius: 3 }}
        onKeyDown={onKeyDown}
      >
        <motion.div
          className={s.readerInner}
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : 1 }}
          transition={{ duration: 0.3, delay: closing ? 0 : reduced ? 0 : 0.75 }}
          onFocusCapture={onFocusCapture}
        >
          <header className={s.readerHeader}>
            <div>
              <p className={s.readerKind}>
                {book.kindLabel} · {book.category}
              </p>
              <h2 id={titleId} ref={heading} tabIndex={-1} className={s.readerTitle}>
                {book.title}
              </h2>
              {book.author && <p className={s.readerAuthor}>{book.author}</p>}
            </div>
            <div className={s.readerControls}>
              <button
                type="button"
                aria-pressed={plain}
                onClick={togglePlain}
                className={s.control}
              >
                Plain type
              </button>
              <button type="button" onClick={requestClose} className={s.control}>
                Close<span className="visually-hidden"> {book.title}</span>
              </button>
            </div>
          </header>
          <div ref={pages} className={s.pages} data-hand={plain ? undefined : "gel"}>
            {children}
          </div>
          {pageCount > 1 && (
            <nav className={s.pager} aria-label="Pages">
              <button
                type="button"
                className={s.control}
                onClick={() => turn(-1)}
                disabled={page === 0}
              >
                <span aria-hidden="true">← </span>Previous
                <span className="visually-hidden"> page</span>
              </button>
              <p className={s.pageOf} aria-live="polite">
                Page {page + 1} of {pageCount}
              </p>
              <button
                type="button"
                className={s.control}
                onClick={() => turn(1)}
                disabled={page >= pageCount - 1}
              >
                Next<span className="visually-hidden"> page</span>
                <span aria-hidden="true"> →</span>
              </button>
            </nav>
          )}
        </motion.div>
        {!reduced && (
          <motion.div
            className={s.coverFlap}
            aria-hidden="true"
            style={{ background: tone(cover) }}
            initial={{ rotateY: 0 }}
            animate={{ rotateY: closing ? 0 : -172 }}
            transition={{ duration: closing ? 0.45 : 0.6, delay: closing ? 0.1 : 0.5, ease: EASE }}
            onAnimationComplete={() => closing && onClose()}
          />
        )}
      </motion.div>
    </>
  );
}
