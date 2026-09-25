"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useId, useRef } from "react";
import { asset } from "@/lib/base-path";
import { TONES } from "@/lib/book-variation";
import type { Spine } from "@/lib/content";
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

// A book's own spine, from its metadata: a photo when there is one, otherwise its colours and
// lettering laid out head to foot like the printed original.
// Rough advance of one character, as a fraction of the font size.
const ADVANCE = { serif: 0.5, sans: 0.74, meta: 0.6 };

// Splits a long title over two columns when the spine is thick enough to carry them.
function spineLines(label: string, thickness: number) {
  const words = label.split(" ");
  if (thickness < 36 || label.length < 22 || words.length < 2) return [label];
  let best = [label, ""];
  for (let i = 1; i < words.length; i++) {
    const pair = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    if (Math.max(...pair.map((l) => l.length)) < Math.max(...best.map((l) => l.length)))
      best = pair;
  }
  return best;
}

// Largest type (up to `max`) that fits `chars` along `share` of the spine's height and `lines`
// columns across its thickness. --h, --w and --s are set on the book's slot.
const fit = (max: string, chars: number, advance: number, share: number, lines = 1) =>
  `min(${max}, calc(var(--h) * var(--s) * ${(share / (chars * advance)).toFixed(4)}px), ` +
  `calc(var(--w) * var(--s) * ${(0.7 / lines).toFixed(4)}px))`;

// A book's own spine, from its metadata: a photo when there is one, otherwise its colours and
// lettering laid out head to foot like the printed original, sized to fit.
function RealSpine({
  spine,
  title,
  fallback,
  thickness,
}: {
  spine: Spine;
  title: React.ReactNode;
  fallback: string;
  thickness: number;
}) {
  if (spine.image) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- a few KB, drawn at spine size */}
        <img className={s.spinePhoto} src={asset(spine.image)} alt="" />
        <span className="visually-hidden">{title}</span>
      </>
    );
  }
  const type = spine.type ?? "serif";
  const lines = spineLines(spine.label ?? fallback, thickness);
  const longest = Math.max(...lines.map((l) => l.length));
  const titleShare = 0.72 - (spine.byline ? 0.22 : 0) - (spine.imprint ? 0.12 : 0);
  return (
    <>
      <svg className={s.spineArt} aria-hidden="true" data-real>
        <use href="#spine-art" />
      </svg>
      <span
        className={s.real}
        data-type={type}
        style={{ "--accent": spine.accent ?? spine.ink } as React.CSSProperties}
      >
        {spine.accent && <span className={s.rule} aria-hidden="true" />}
        <span className={s.realTitle}>
          <span
            aria-hidden="true"
            style={{
              fontSize: fit(
                type === "sans" ? "calc(var(--spine-type) * 0.86)" : "var(--spine-type)",
                longest,
                ADVANCE[type],
                titleShare,
                lines.length,
              ),
            }}
          >
            {lines.map((line, i) => (
              <span key={i} className={s.titleLine}>
                {line}
              </span>
            ))}
          </span>
          <span className="visually-hidden">{title}</span>
        </span>
        {spine.byline && (
          <span
            className={s.byline}
            aria-hidden="true"
            style={{
              fontSize: fit(
                "calc(var(--spine-type) * 0.7)",
                spine.byline.length,
                ADVANCE.meta,
                0.2,
              ),
            }}
          >
            {spine.byline}
          </span>
        )}
        {spine.accent && <span className={s.rule} aria-hidden="true" />}
        {spine.imprint && (
          <span
            className={s.imprint}
            aria-hidden="true"
            style={{
              fontSize: fit("calc(var(--spine-type) * 0.6)", spine.imprint.length, 0.72, 0.1),
            }}
          >
            {spine.imprint}
          </span>
        )}
      </span>
    </>
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
            style={
              book.spine
                ? { background: book.spine.color, color: book.spine.ink, borderRadius: 2 }
                : { background: tone(cover), color: tone(ink), borderRadius: 2 }
            }
          >
            {book.spine ? (
              <RealSpine
                spine={book.spine}
                title={title}
                fallback={book.title}
                thickness={v.thickness}
              />
            ) : (
              <>
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
                      ...(i >= 2
                        ? { [flat ? "left" : "top"]: `${(1 - v.bandOffset) * 100}%` }
                        : null),
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
              </>
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
