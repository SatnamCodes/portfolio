import {
  Instrument_Sans,
  Instrument_Serif,
  Kalam,
  La_Belle_Aurore,
  Newsreader,
  Baloo_Paaji_2,
  Tiro_Gurmukhi,
} from "next/font/google";

export const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
  // next/font's generated serif fallback is metric-matched to Times New Roman; the brief rules it out.
  adjustFontFallback: false,
  fallback: ["Iowan Old Style", "Palatino Linotype", "Georgia", "serif"],
});

export const body = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-body",
  // next/font's generated serif fallback is metric-matched to Times New Roman; the brief rules it out.
  adjustFontFallback: false,
  fallback: ["Iowan Old Style", "Palatino Linotype", "Georgia", "serif"],
});

export const meta = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-meta",
  fallback: ["system-ui", "sans-serif"],
});

export const fountain = La_Belle_Aurore({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-fountain",
  preload: false,
  fallback: ["cursive"],
});

export const gel = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
  variable: "--font-gel",
  preload: false,
  fallback: ["cursive"],
});

// Punjabi translations. Not preloaded: only a page showing Gurmukhi text downloads it.
export const gurmukhi = Tiro_Gurmukhi({
  subsets: ["gurmukhi"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-gurmukhi",
  preload: false,
  fallback: ["Noto Serif Gurmukhi", "Raavi", "serif"],
});

// The Punjabi notebook: a rounder, pen-like Gurmukhi for the handwritten view. Loaded only when shown.
export const gurmukhiHand = Baloo_Paaji_2({
  subsets: ["gurmukhi"],
  weight: "400",
  display: "swap",
  variable: "--font-gurmukhi-hand",
  preload: false,
  fallback: ["Noto Sans Gurmukhi", "Raavi", "sans-serif"],
});

export const fontVariables = [display, body, meta, fountain, gel, gurmukhi, gurmukhiHand]
  .map((f) => f.variable)
  .join(" ");
