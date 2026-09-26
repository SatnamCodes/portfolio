"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FeynmanLines } from "./FeynmanLines";
import s from "./Unravel.module.css";

// The end of "What Survives the Answer". Only once the reader has reached the very end (past the
// sources) and paused there, the essay turns to dust except seven words, which travel into
// Feynman's line; "create" (not in the essay) is built from six drifting letters. Then the
// attribution, then an abstract line portrait draws itself. Scrolling back up restores the essay;
// the quote stays below it.
//
// The essay is ordinary, fully readable HTML until this plays. The effect is drawn on one canvas
// overlay (thousands of DOM letters would be too heavy for a phone); only words near the screen
// become letters.

type Ending = {
  // The quote, word by word as it is laid out.
  quote: string[];
  attribution: string;
  // Each quote word taken from the essay, and the exact place in the essay it comes from.
  sources: { word: string; phrase: string }[];
  // Quote slots the source words fill (index into quote).
  slot: number[];
  // The one word not taken from the essay: built from drifting letters, then its trailing mark.
  build: { slot: number; parts: string[]; trailing: string };
  // Where the quote breaks onto a second line on a narrow screen.
  split: number;
  // The typeface the settled quote is set in.
  fontVar: string;
};

const ENDINGS: Record<"en" | "pa", Ending> = {
  en: {
    quote: ["What", "I", "cannot", "create,", "I", "do", "not", "understand."],
    attribution: "Richard Feynman, on his blackboard at Caltech, 1988",
    sources: [
      { word: "What", phrase: "What had actually happened was closer to the opposite of closure" },
      { word: "I", phrase: "I reacted to that headline in the same way most people did" },
      { word: "cannot", phrase: "The feeling of the institutions cannot be described as fear" },
      { word: "I", phrase: "I still remember what studying used to feel like" },
      { word: "do", phrase: "Some students have started to do assignments" },
      { word: "not", phrase: "He did not hand me a conclusion" },
      { word: "understand", phrase: "until they actually understand it" },
    ],
    slot: [0, 1, 2, 4, 5, 6, 7],
    build: { slot: 3, parts: ["c", "r", "e", "a", "t", "e"], trailing: "," },
    split: 4,
    fontVar: "--font-display",
  },
  // The Punjabi translation: "ਜੋ ਮੈਂ ਬਣਾ ਨਹੀਂ ਸਕਦਾ, ਉਹ ਮੈਨੂੰ ਸਮਝ ਨਹੀਂ ਆਉਂਦਾ।" Its words come from
  // the matching places in content/wanderings/pa/what-survives-the-answer.mdx; "ਬਣਾ" is built.
  pa: {
    quote: ["ਜੋ", "ਮੈਂ", "ਬਣਾ", "ਨਹੀਂ", "ਸਕਦਾ,", "ਉਹ", "ਮੈਨੂੰ", "ਸਮਝ", "ਨਹੀਂ", "ਆਉਂਦਾ।"],
    attribution: "ਰਿਚਰਡ ਫਾਈਨਮੈਨ, ਕੈਲਟੈਕ ਵਿੱਚ ਆਪਣੇ ਬਲੈਕਬੋਰਡ 'ਤੇ, 1988",
    sources: [
      { word: "ਜੋ", phrase: "ਜੋ ਅਸਲ ਵਿੱਚ ਹੋਇਆ ਸੀ" },
      { word: "ਮੈਂ", phrase: "ਮੈਂ ਵੀ ਉਸ ਸੁਰਖ਼ੀ" },
      { word: "ਨਹੀਂ", phrase: "ਨਤੀਜਾ ਨਹੀਂ ਫੜਾਇਆ" },
      { word: "ਸਕਦਾ", phrase: "ਨਾ ਡਰ ਕਿਹਾ ਜਾ ਸਕਦਾ" },
      { word: "ਉਹ", phrase: "ਉਹ ਵਾਕ ਅਤੇ ਸਾਡੀ" },
      { word: "ਮੈਨੂੰ", phrase: "ਮੈਨੂੰ ਅੱਜ ਵੀ ਯਾਦ" },
      { word: "ਸਮਝ", phrase: "ਸੱਚਮੁੱਚ ਸਮਝ ਨਾ" },
      { word: "ਨਹੀਂ", phrase: "ਸੀ ਹੀ ਨਹੀਂ" },
      { word: "ਆਉਂਦਾ", phrase: "ਥਾਂ ਤੋਂ ਆਉਂਦਾ" },
    ],
    slot: [0, 1, 3, 4, 5, 6, 7, 8, 9],
    build: { slot: 2, parts: ["ਬ", "ਣਾ"], trailing: "" },
    split: 5,
    fontVar: "--font-gurmukhi",
  },
};

// Letters as a reader sees them: Gurmukhi vowel signs stay with their consonant.
const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;
const graphemes = (text: string) =>
  segmenter ? [...segmenter.segment(text)].map((g) => g.segment) : [...text];

// The portrait's box (viewBox 375 × 305).
const PORTRAIT_RATIO = 305 / 375;

type Letter = {
  ch: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  delay: number;
  font: string;
  create?: number;
};
type Word = { text: string; x: number; y: number; font: string; size: number };

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

function wordsOf(el: Element) {
  return [...el.querySelectorAll<HTMLElement>("span")].filter(
    (sp) => !sp.children.length && sp.textContent?.trim(),
  );
}

/** Finds the word span for `word` at the start of `phrase` inside the article. */
function locate(article: HTMLElement, word: string, phrase: string): HTMLElement | null {
  const want = phrase.split(/\s+/);
  for (const block of article.querySelectorAll("p, li, h2, h3")) {
    const spans = wordsOf(block);
    const texts = spans.map((sp) => sp.textContent!.trim());
    for (let i = 0; i + want.length <= texts.length; i++) {
      if (
        want.every(
          (wd, j) =>
            texts[i + j].replace(/[.,:;?!”“"’।]+$/g, "") === wd.replace(/[.,:;?!”“"’।]+$/g, ""),
        )
      ) {
        const k = want.findIndex((wd) => wd === word);
        return spans[i + Math.max(0, k)];
      }
    }
  }
  return null;
}

export function Unravel({ articleId, lang = "en" }: { articleId: string; lang?: "en" | "pa" }) {
  const E = ENDINGS[lang];
  const overlay = useRef<HTMLCanvasElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const coda = useRef<HTMLElement>(null);
  const codaPortrait = useRef<HTMLDivElement>(null);
  // Where the finished portrait sat on screen, so the coda can glide out from there.
  const from = useRef<{ left: number; top: number; w: number } | null>(null);
  const [portraitBox, setPortraitBox] = useState<{ left: number; top: number; w: number } | null>(
    null,
  );
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [reduced] = useState(
    () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  function play(article: HTMLElement) {
    const cv = overlay.current!;
    const ctx = cv.getContext("2d")!;
    const vw = window.innerWidth,
      vh = window.innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(vw * dpr);
    cv.height = Math.round(vh * dpr);
    const ink = getComputedStyle(article).color;
    const serif =
      getComputedStyle(document.documentElement).getPropertyValue(E.fontVar).trim() ||
      "Georgia, serif";
    const rand = (() => {
      let x = 42;
      return () => (x = (x * 16807) % 2147483647) / 2147483647;
    })();

    // 1. Letters: every word near the screen becomes letters at its exact place.
    const chosen = E.sources.map((src) => locate(article, src.word, src.phrase));
    const letters: Letter[] = [];
    for (const sp of wordsOf(article)) {
      if (chosen.includes(sp)) continue;
      const r = sp.getBoundingClientRect();
      if (r.bottom < -vh * 0.6 || r.top > vh * 1.2 || !r.width) continue;
      const cs = getComputedStyle(sp);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      ctx.font = font;
      const text = sp.textContent!;
      let x = r.left;
      const y = r.top + r.height * 0.78;
      const total = ctx.measureText(text).width || 1;
      const scale = r.width / total;
      // Ripple upward: lower lines go first.
      const delay = 0.15 + clamp((vh - r.top) / (vh * 1.8)) * 1.6 + rand() * 0.15;
      for (const ch of graphemes(text)) {
        const cw = ctx.measureText(ch).width * scale;
        if (ch.trim())
          letters.push({
            ch,
            x,
            y,
            vx: (rand() - 0.5) * 60,
            vy: -30 - rand() * 90,
            rot: 0,
            vr: (rand() - 0.5) * 3,
            delay,
            font,
          });
        x += cw;
      }
    }
    // The built word's letters, chosen near the middle of the screen.
    const taken = new Set<number>();
    E.build.parts.forEach((ch, i) => {
      let best = -1,
        bd = Infinity;
      letters.forEach((l, j) => {
        if (taken.has(j) || l.ch !== ch) return;
        const dd = Math.hypot(l.x - vw / 2, l.y - vh / 2);
        if (dd < bd) {
          bd = dd;
          best = j;
        }
      });
      if (best >= 0) {
        taken.add(best);
        letters[best].create = i;
      } else {
        // Not on screen as dust: it rises from below instead.
        letters.push({
          ch,
          x: vw * (0.3 + rand() * 0.4),
          y: vh + 30,
          vx: 0,
          vy: 0,
          rot: 0,
          vr: (rand() - 0.5) * 2,
          delay: 0,
          font: `${Math.min(46, vw * 0.075)}px ${serif}`,
          create: i,
        });
      }
    });

    // 2. The chosen words, from wherever they are (usually above the screen).
    const words: Word[] = chosen.map((sp, i) => {
      if (!sp)
        return { text: E.sources[i].word, x: vw / 2, y: -40, font: `24px ${serif}`, size: 24 };
      const r = sp.getBoundingClientRect();
      const cs = getComputedStyle(sp);
      return {
        text: E.sources[i].word,
        x: r.left,
        y: r.top + r.height * 0.78,
        font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
        size: parseFloat(cs.fontSize),
      };
    });

    // 3. The quote's layout, centred; two lines on a narrow screen.
    const size = Math.min(46, vw * 0.075);
    ctx.font = `${size}px ${serif}`;
    const space = ctx.measureText(" ").width;
    const full = E.quote.join(" ");
    const lines =
      ctx.measureText(full).width > vw * 0.88
        ? [E.quote.slice(0, E.split), E.quote.slice(E.split)]
        : [E.quote];
    // The portrait sits above the quote; the whole group is centred on screen.
    const pw = Math.min(440, vw * 0.88, (vh * 0.42) / PORTRAIT_RATIO);
    const ph = pw * PORTRAIT_RATIO;
    const blockH = ph + 28 + lines.length * size * 1.25 + 40;
    const top = (vh - blockH) / 2;
    const quoteTop = top + ph + 28 + size;
    // It starts drawing as the quote finishes forming, as if the dust became the ink.
    const portraitTimer = setTimeout(() => {
      from.current = { left: (vw - pw) / 2, top, w: pw };
      setPortraitBox(from.current);
    }, 5100);
    const slots: { x: number; y: number }[] = [];
    lines.forEach((line, li) => {
      const lw =
        line.reduce((a, wd) => a + ctx.measureText(wd).width, 0) + space * (line.length - 1);
      let x = (vw - lw) / 2;
      for (const wd of line) {
        slots.push({ x, y: quoteTop + li * size * 1.25 });
        x += ctx.measureText(wd).width + space;
      }
    });
    const createSlot = slots[E.build.slot];
    const createXs: number[] = [];
    let commaX = createSlot.x;
    for (const part of E.build.parts) {
      createXs.push(commaX);
      commaX += ctx.measureText(part).width;
    }

    article.style.transition = "none";
    article.style.opacity = "0";
    setPhase("playing");
    const startY = window.scrollY;
    const t0 = performance.now();
    let frame = 0;

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      ctx.fillStyle = ink;
      ctx.textBaseline = "alphabetic";
      // Dust.
      for (const l of letters) {
        const k = t - l.delay;
        if (l.create !== undefined) {
          // Drifts like the rest, then slows, turns and clicks into its place in "create".
          const drift = Math.max(0, Math.min(k, 1.6));
          const dx = l.x + l.vx * drift * 0.4,
            dy = l.y + l.vy * drift * 0.4 + 12 * drift;
          const q = ease(seg(t, 3.6 + l.create * 0.12, 4.6 + l.create * 0.12));
          const x = dx + (createXs[l.create] - dx) * q,
            y = dy + (createSlot.y - dy) * q;
          const rot = (1 - q) * (drift * l.vr);
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          ctx.globalAlpha = 0.55 + 0.45 * q;
          ctx.font = q > 0.5 ? `${size}px ${serif}` : l.font;
          ctx.fillText(l.ch, 0, 0);
          ctx.restore();
          continue;
        }
        if (k < 0) {
          ctx.globalAlpha = 1;
          ctx.font = l.font;
          ctx.fillText(l.ch, l.x, l.y);
          continue;
        }
        const a = 1 - clamp(k / 1.5);
        if (a <= 0) continue;
        ctx.save();
        ctx.translate(l.x + l.vx * k, l.y + l.vy * k + 20 * k * k);
        ctx.rotate(l.vr * k);
        ctx.globalAlpha = a * a;
        ctx.font = l.font;
        ctx.fillText(l.ch, 0, 0);
        ctx.restore();
      }
      // The seven words: glow, then travel into the quote.
      words.forEach((wd, i) => {
        const slot = slots[E.slot[i]];
        const q = ease(seg(t, 1.5 + i * 0.18, 3.3 + i * 0.18));
        const x = wd.x + (slot.x - wd.x) * q,
          y = wd.y + (slot.y - wd.y) * q;
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.shadowColor = "rgba(214,150,70,0.55)";
        ctx.shadowBlur = 10 * (1 - seg(t, 4.6, 6));
        ctx.font = q < 0.5 ? wd.font : `${size}px ${serif}`;
        const text = E.quote[E.slot[i]];
        // The quote's closing mark (the final "." or "।") arrives with the settled line.
        const shown = /[.।]$/.test(text) && t < 4.8 ? text.slice(0, -1) : text;
        ctx.fillText(q < 0.5 ? wd.text : shown, x, y);
        ctx.restore();
      });
      // The comma after "create", and the attribution.
      const punct = seg(t, 4.8, 5.3);
      if (punct > 0 && E.build.trailing) {
        ctx.globalAlpha = punct;
        ctx.font = `${size}px ${serif}`;
        ctx.fillText(E.build.trailing, commaX, createSlot.y);
      }
      const att = seg(t, 5.3, 6.2);
      if (att > 0) {
        ctx.globalAlpha = att * 0.85;
        ctx.font = `${lang === "pa" ? "" : "italic "}${Math.max(13, size * 0.36)}px ${serif}`;
        ctx.textAlign = "center";
        ctx.fillText(
          E.attribution,
          vw / 2,
          quoteTop + (lines.length - 1) * size * 1.25 + size * 0.95,
        );
        ctx.textAlign = "left";
      }
      ctx.globalAlpha = 1;
      if (t < 6.4) frame = requestAnimationFrame(draw);
      // Finished: the quote holds on screen until the reader scrolls back up.
    };
    frame = requestAnimationFrame(draw);

    // Scrolling back up brings the essay back; the quote then stays below it.
    const onScroll = () => {
      if (window.scrollY < startY - 120) {
        cancelAnimationFrame(frame);
        clearTimeout(portraitTimer);
        window.removeEventListener("scroll", onScroll);
        setPortraitBox(null);
        article.style.transition = "opacity 700ms ease";
        article.style.opacity = "1";
        cv.style.transition = "none";
        cv.style.opacity = "0";
        setPhase("done");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  useEffect(() => {
    if (reduced) return;
    const article = document.getElementById(articleId);
    if (!article) return;
    // At the true end: the moment the marker after the sources (just above the footer) comes
    // on screen, or has already been scrolled past, the ending plays. No waiting.
    const end = sentinel.current;
    if (!end) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting && e.boundingClientRect.top >= 0) return;
      io.disconnect();
      play(article);
    });
    io.observe(end);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // Switching language mid-ending unmounts this one: give the essay back its opacity.
  useEffect(
    () => () => {
      const article = document.getElementById(articleId);
      if (article) article.style.opacity = "";
    },
    [articleId],
  );

  const showStill = reduced || phase === "done";

  // Scrolling back up: the portrait and quote don't jump to their place under the essay, they
  // move there, shrinking from their size on screen to their resting size in one motion.
  useLayoutEffect(() => {
    const box = from.current;
    const el = coda.current;
    const pic = codaPortrait.current;
    if (phase !== "done" || !box || !el || !pic) return;
    from.current = null;
    const r = pic.getBoundingClientRect();
    const k = box.w / r.width;
    const origin = el.getBoundingClientRect();
    const ox = r.left - origin.left;
    const oy = r.top - origin.top;
    el.animate(
      [
        {
          transformOrigin: `${ox}px ${oy}px`,
          transform: `translate(${box.left - r.left}px, ${box.top - r.top}px) scale(${k})`,
          opacity: 1,
        },
        { transformOrigin: `${ox}px ${oy}px`, transform: "none", opacity: 1 },
      ],
      { duration: 900, easing: "cubic-bezier(0.45, 0, 0.2, 1)" },
    );
  }, [phase]);
  return (
    <>
      <div ref={sentinel} className={s.sentinel} aria-hidden="true" />
      <canvas
        ref={overlay}
        className={s.overlay}
        data-on={phase === "playing" || undefined}
        aria-hidden="true"
      />
      {phase === "playing" && portraitBox && (
        <div
          className={s.drawing}
          style={{ left: portraitBox.left, top: portraitBox.top, width: portraitBox.w }}
          aria-hidden="true"
        >
          <FeynmanLines animate />
        </div>
      )}
      {/* The same quote, kept in the page under the essay: the finished state, and what
          screen readers, search engines and reduced motion get. */}
      <section ref={coda} className={s.coda} data-shown={showStill || undefined} aria-label="Coda">
        <div ref={codaPortrait} className={s.portrait}>
          <FeynmanLines />
        </div>
        <blockquote className={s.quote} lang={lang} data-lang={lang}>
          <p>{E.quote.join(" ")}</p>
          <footer>{E.attribution}</footer>
        </blockquote>
      </section>
    </>
  );
}
