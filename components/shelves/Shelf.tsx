"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useId, useRef } from "react";
import { TONES } from "@/lib/book-variation";
import { body, shadowFor, step, type BookBody } from "@/lib/shelf-physics";
import type { BookData } from "./Library";
import s from "./shelves.module.css";

// What the shelf's simulation drives for each book.
type BookParts = {
  el: HTMLButtonElement;
  cast: HTMLElement;
  contact: HTMLElement;
  lean: number;
  body: BookBody;
};

const tone = (name: string) =>
  `var(--color-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/(\d)/, "-$1")})`;

export function BookSymbols() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <pattern id="cloth" width="4" height="4" patternUnits="userSpaceOnUse">
          <path
            d="M0 4L4 0M-1 1L1 -1M3 5L5 3"
            stroke="currentColor"
            strokeWidth="0.35"
            opacity="0.18"
          />
        </pattern>
        <linearGradient id="spine-round" x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.22" />
          <stop offset="0.28" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
        <symbol id="spine-art" viewBox="0 0 10 100" preserveAspectRatio="none">
          <rect width="10" height="100" fill="url(#cloth)" />
          <rect width="10" height="100" fill="url(#spine-round)" />
        </symbol>
      </defs>
    </svg>
  );
}

function Book({
  book,
  isOpen,
  reduced,
  onOpen,
  register,
  registerButton,
  hold,
}: {
  book: BookData;
  isOpen: boolean;
  reduced: boolean;
  onOpen: (slug: string) => void;
  register: (slug: string, parts: BookParts | null) => void;
  registerButton: (slug: string, el: HTMLButtonElement | null) => void;
  hold: (slug: string, how: "focus" | "touch" | null) => void;
}) {
  const v = book.variation;
  const button = useRef<HTMLButtonElement>(null);
  const cast = useRef<HTMLSpanElement>(null);
  const contact = useRef<HTMLSpanElement>(null);
  const flat = v.orientation === "flat";
  const [cover, ink, band] = TONES[v.tone];
  const w = flat ? v.height : v.thickness;
  const h = flat ? v.thickness : v.height;

  useEffect(() => {
    if (!button.current || !cast.current || !contact.current) return;
    register(book.slug, {
      el: button.current,
      cast: cast.current,
      contact: contact.current,
      lean: v.lean,
      body: body(w, h, flat),
    });
    return () => register(book.slug, null);
  }, [book.slug, register, v.lean, w, h, flat]);

  const title = (
    <>
      <span
        className={s.spineTitle}
        style={{ fontSize: `calc(${v.titleScale} * var(--spine-type))` }}
      >
        {book.title}
      </span>
      <span className="visually-hidden">
        {`, ${book.kindLabel}${book.author ? ` by ${book.author}` : ""}`}
      </span>
    </>
  );

  return (
    <li
      className={s.slot}
      data-orientation={v.orientation}
      style={
        {
          "--w": w,
          "--h": h,
          marginLeft: v.lean
            ? `calc(${h} * var(--s) * ${Math.sin((Math.abs(v.lean) * Math.PI) / 180).toFixed(4)} * 1px - 1px)`
            : undefined,
        } as React.CSSProperties
      }
    >
      {/* Shadow cast on the back of the case, and the contact shadow on the plank. */}
      <span ref={cast} className={s.cast} aria-hidden="true" data-hidden={isOpen || undefined} />
      <span
        ref={contact}
        className={s.shadow}
        aria-hidden="true"
        data-hidden={isOpen || undefined}
      />
      <button
        ref={(el) => {
          button.current = el;
          registerButton(book.slug, el);
        }}
        type="button"
        className={s.book}
        aria-haspopup="dialog"
        // Named explicitly: while the book is open its slot shows only an empty gap.
        aria-label={`${book.title}, ${book.kindLabel}${book.author ? ` by ${book.author}` : ""}`}
        onClick={() => onOpen(book.slug)}
        onFocus={() => hold(book.slug, "focus")}
        onBlur={() => hold(book.slug, null)}
        onPointerDown={(e) => e.pointerType === "touch" && hold(book.slug, "touch")}
        onPointerUp={(e) => e.pointerType === "touch" && hold(book.slug, null)}
        onPointerCancel={() => hold(book.slug, null)}
        style={{
          transform: v.lean ? `rotateZ(${v.lean}deg)` : undefined,
          transformOrigin: v.lean ? "0% 100%" : undefined,
        }}
      >
        {isOpen ? (
          <span className={s.gap} aria-hidden="true" />
        ) : (
          <motion.span
            layoutId={reduced ? undefined : `book-${book.slug}`}
            className={s.spine}
            data-flat={flat || undefined}
            style={{ background: tone(cover), color: tone(ink), borderRadius: 2 }}
          >
            <svg className={s.spineArt} aria-hidden="true" style={{ color: tone(ink) }}>
              <use href="#spine-art" />
            </svg>
            {Array.from({ length: v.bands }, (_, i) => (
              <span
                key={i}
                className={s.band}
                aria-hidden="true"
                style={{
                  background: tone(band),
                  [flat ? "left" : "top"]: `${(v.bandOffset + i * 0.035) * 100}%`,
                  ...(i >= 2 ? { [flat ? "left" : "top"]: `${(1 - v.bandOffset) * 100}%` } : null),
                }}
              />
            ))}
            {v.label === "patch" ? (
              <span className={s.patch}>{title}</span>
            ) : (
              <span className={s.plainTitle} data-foil={v.label === "foil" || undefined}>
                {title}
              </span>
            )}
          </motion.span>
        )}
      </button>
    </li>
  );
}

export function Shelf({
  category,
  books,
  openSlug,
  interactive,
  reduced,
  onOpen,
  registerButton,
}: {
  category: string;
  books: BookData[];
  openSlug: string | null;
  interactive: boolean;
  reduced: boolean;
  onOpen: (slug: string) => void;
  registerButton: (slug: string, el: HTMLButtonElement | null) => void;
}) {
  const headingId = useId();
  const parts = useRef(new Map<string, BookParts>());
  const centres = useRef<({ x: number; y: number } | null)[] | null>(null);
  const pointer = useRef<{ x: number; y: number; vx: number; t: number } | null>(null);
  const frame = useRef(0);
  const last = useRef(0);
  const order = useRef(books.map((b) => b.slug));
  useEffect(() => {
    order.current = books.map((b) => b.slug);
    centres.current = null;
  }, [books]);

  const write = useCallback(() => {
    for (const p of parts.current.values()) {
      const { lift, pull, turn, tip } = p.body.x;
      p.el.style.transform = `translate3d(0, ${-lift}px, ${pull}px) rotateY(${turn}deg) rotateZ(${p.lean + tip}deg)`;
      // Each book is flattened into its own layer, so depth alone can't bring it in front of a neighbour.
      p.el.parentElement!.style.zIndex = pull > 1 ? String(1 + Math.round(pull)) : "";
      const sh = shadowFor(p.body.x);
      p.cast.style.transform = `translate(${sh.x}px, ${sh.y}px) rotate(${p.lean + tip}deg) scale(${sh.scale})`;
      p.cast.style.opacity = String(sh.opacity);
      p.contact.style.opacity = String(sh.contact);
    }
  }, []);

  // The frame loop lives in a ref so it can reschedule itself; it sleeps once the shelf is still.
  const loop = useRef<FrameRequestCallback>(() => {});
  useEffect(() => {
    loop.current = (now) => {
      const dt = last.current ? (now - last.current) / 1000 : 1 / 60;
      last.current = now;
      const list = order.current
        .map((slug) => parts.current.get(slug))
        .filter((p): p is BookParts => !!p);
      if (!centres.current) {
        centres.current = list.map((p) => {
          const r = p.el.parentElement!.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
      }
      const ptr = pointer.current;
      const moving = step(
        list.map((p) => p.body),
        { dt, pointer: ptr, centres: centres.current, reduced },
      );
      if (ptr) ptr.vx *= 0.6;
      write();
      if (moving || ptr) frame.current = requestAnimationFrame((t) => loop.current(t));
      else {
        frame.current = 0;
        last.current = 0;
      }
    };
  }, [reduced, write]);

  const wake = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame((t) => loop.current(t));
  }, []);

  const register = useCallback((slug: string, p: BookParts | null) => {
    if (p) parts.current.set(slug, p);
    else parts.current.delete(slug);
    centres.current = null;
  }, []);

  const hold = useCallback(
    (slug: string, how: "focus" | "touch" | null) => {
      const p = parts.current.get(slug);
      if (!p) return;
      p.body.hold = how;
      wake();
    },
    [wake],
  );

  useEffect(() => {
    const invalidate = () => (centres.current = null);
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);
    return () => {
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  // While a book is open the hand is taken away from every shelf.
  useEffect(() => {
    if (interactive) return;
    pointer.current = null;
    wake();
  }, [interactive, wake]);

  // An opened book leaves its slot: put its body at rest so it returns cleanly.
  useEffect(() => {
    const p = openSlug ? parts.current.get(openSlug) : undefined;
    if (!p) return;
    p.body.x = { lift: 0, pull: 0, turn: 0, tip: 0 };
    p.body.v = { lift: 0, pull: 0, turn: 0, tip: 0 };
    p.body.hold = null;
    write();
  }, [openSlug, write]);

  const onPointerMove = (e: React.PointerEvent) => {
    if (!interactive || e.pointerType === "touch") return;
    const prev = pointer.current;
    const t = e.timeStamp;
    const vx = prev && t > prev.t ? ((e.clientX - prev.x) / (t - prev.t)) * 1000 : 0;
    pointer.current = { x: e.clientX, y: e.clientY, vx: prev ? prev.vx * 0.5 + vx * 0.5 : 0, t };
    wake();
  };

  const onPointerLeave = () => {
    pointer.current = null;
    wake();
  };

  return (
    <section className={s.shelf} aria-labelledby={headingId}>
      <h2 id={headingId} className={s.category}>
        {category}
        <span className={s.count}>{books.length ? ` · ${books.length}` : ""}</span>
      </h2>
      {books.length === 0 ? (
        <div className={s.row} data-empty>
          <p className={s.empty}>Nothing shelved here yet.</p>
        </div>
      ) : (
        <ul className={s.row} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          {books.map((book) => (
            <Book
              key={book.slug}
              book={book}
              isOpen={book.slug === openSlug}
              reduced={reduced}
              onOpen={onOpen}
              register={register}
              registerButton={registerButton}
              hold={hold}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
