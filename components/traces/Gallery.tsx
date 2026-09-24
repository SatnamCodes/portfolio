"use client";

import { useReducedMotion } from "@/lib/use-reduced-motion";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import type { Slot } from "./layout";
import s from "./gallery.module.css";
import { asset } from "@/lib/base-path";

export type GalleryPhoto = {
  id: string;
  src: string;
  video?: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
  place?: string;
  kit?: string;
};

const PAGE = 24;
const EASE = [0.22, 1, 0.36, 1] as const;

function Details({ photo, className }: { photo: GalleryPhoto; className?: string }) {
  if (!photo.caption && !photo.place && !photo.kit) return null;
  return (
    <div className={className}>
      {photo.caption && <p className={s.caption}>{photo.caption}</p>}
      {photo.place && <p className={s.meta}>{photo.place}</p>}
      {photo.kit && <p className={s.meta}>{photo.kit}</p>}
    </div>
  );
}

function fit(photo: GalleryPhoto) {
  const pad = window.innerWidth < 768 ? 16 : 64;
  const maxW = window.innerWidth - pad * 2;
  const maxH = window.innerHeight - (window.innerWidth < 768 ? 220 : 180);
  const k = Math.min(maxW / photo.width, maxH / photo.height);
  return { width: Math.round(photo.width * k), height: Math.round(photo.height * k) };
}

export function Viewer({
  photos,
  index,
  morphId,
  reduced,
  onIndex,
  onClose,
}: {
  photos: GalleryPhoto[];
  index: number;
  morphId: string | null;
  reduced: boolean;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState(() => fit(photo));
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useDialogFocus(dialog, { onEscape: onClose, initial: closeButton });

  useEffect(() => {
    const onResize = () => setBox(fit(photo));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [photo]);

  const step = useCallback(
    (d: number) => onIndex((index + d + photos.length) % photos.length),
    [index, onIndex, photos.length],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  };

  const morph = !reduced && photo.id === morphId;

  return (
    <motion.div
      ref={dialog}
      className={s.viewer}
      role="dialog"
      aria-modal="true"
      aria-label="Photograph"
      onKeyDown={onKeyDown}
    >
      <motion.div
        className={s.backdrop}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0.15 : 0.45 }}
      />
      <div
        className={s.stage}
        onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const start = swipe.current;
          swipe.current = null;
          if (!start) return;
          const dx = e.clientX - start.x;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - start.y))
            step(dx < 0 ? 1 : -1);
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={photo.id}
            layoutId={morph ? `trace-${photo.id}` : undefined}
            className={s.frame}
            style={{ width: box.width, height: box.height }}
            initial={morph ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              layout: { duration: 0.6, ease: EASE },
              opacity: { duration: reduced ? 0.15 : 0.35 },
            }}
          >
            {photo.video ? (
              <video
                src={asset(photo.video)}
                poster={asset(photo.src)}
                aria-label={photo.alt}
                className={s.video}
                autoPlay={!reduced}
                controls
                muted
                loop
                playsInline
              />
            ) : (
              <Image src={photo.src} alt={photo.alt} fill sizes="100vw" draggable={false} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <motion.div
        className={s.bar}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, delay: reduced ? 0 : 0.3 }}
      >
        <Details photo={photo} className={s.viewerDetails} />
        <div className={s.controls}>
          <button type="button" className={s.control} onClick={() => step(-1)}>
            <span aria-hidden="true">← </span>Previous
          </button>
          <p className={s.counter} aria-live="polite">
            {index + 1} / {photos.length}
          </p>
          <button type="button" className={s.control} onClick={() => step(1)}>
            Next<span aria-hidden="true"> →</span>
          </button>
          <button ref={closeButton} type="button" className={s.control} onClick={onClose}>
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Gallery({ photos, slots }: { photos: GalleryPhoto[]; slots: Slot[] }) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState<number | null>(null);
  const [morphId, setMorphId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const thumbs = useRef(new Map<string, HTMLButtonElement>());
  const returnTo = useRef<string | null>(null);

  useEffect(() => {
    if (open === null) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  const close = useCallback(() => {
    if (open !== null) returnTo.current = photos[open].id;
    setOpen(null);
  }, [open, photos]);

  const restoreFocus = useCallback(() => {
    const el = returnTo.current ? thumbs.current.get(returnTo.current) : null;
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: "nearest" });
    setMorphId(null);
  }, []);

  const showMore = () => {
    const firstNew = shown;
    setShown((n) => n + PAGE);
    requestAnimationFrame(() => thumbs.current.get(photos[firstNew]?.id)?.focus());
  };

  const openId = open !== null ? photos[open].id : null;

  return (
    <MotionConfig reducedMotion="user">
      <ol className={s.gallery}>
        {photos.slice(0, shown).map((photo, i) => {
          const slot = slots[i];
          const hidden = openId === photo.id && morphId === photo.id && !reduced;
          return (
            <li
              key={photo.id}
              className={s.item}
              data-caption-side={slot.captionSide || undefined}
              style={{ "--col": slot.col, "--drop": `${slot.drop}rem` } as React.CSSProperties}
            >
              <figure className={s.figure}>
                <button
                  ref={(el) => {
                    if (el) thumbs.current.set(photo.id, el);
                    else thumbs.current.delete(photo.id);
                  }}
                  type="button"
                  className={s.thumb}
                  aria-haspopup="dialog"
                  style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                  onClick={() => {
                    setMorphId(photo.id);
                    setOpen(i);
                  }}
                >
                  {!hidden && (
                    <motion.div
                      layoutId={reduced ? undefined : `trace-${photo.id}`}
                      className={s.thumbImage}
                    >
                      <Image
                        src={photo.src}
                        alt={photo.alt}
                        width={photo.width}
                        height={photo.height}
                        sizes="(min-width: 64rem) 60vw, 100vw"
                        priority={i === 0}
                      />
                    </motion.div>
                  )}
                </button>
                <figcaption>
                  <Details photo={photo} className={s.details} />
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ol>
      {shown < photos.length && (
        <p className={s.more}>
          <button type="button" className={s.control} onClick={showMore}>
            Show more traces
          </button>
        </p>
      )}
      <AnimatePresence onExitComplete={restoreFocus}>
        {open !== null && (
          <Viewer
            photos={photos}
            index={open}
            morphId={morphId}
            reduced={reduced}
            onIndex={(i) => {
              // Moving on inside the viewer: cross-fade only; nothing flies back to the grid.
              setMorphId(null);
              setOpen(i);
            }}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
