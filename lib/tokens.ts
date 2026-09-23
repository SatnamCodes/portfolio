/**
 * Single source of truth for design tokens.
 * Mirrored as CSS custom properties in styles/tokens.css — keep both in sync.
 */

export const color = {
  espresso: "#3E2723",
  espressoTint1: "#5D4037",
  espressoTint2: "#7D6055",
  espressoTint3: "#BCAAA4",
  seaSand: "#FFF4E4",
  seaSandShade1: "#F5E6CC",
  seaSandShade2: "#E8D3AC",
} as const;

// Spectrum tokens are used ONLY by the prism scene (Prompt 03+). Never used
// as UI accent colors — the site chrome stays Espresso/Sea Sand throughout.
export const spectrum = {
  red: "#FF3B30",
  orange: "#FF9500",
  yellow: "#FFCC00",
  green: "#34C759",
  blue: "#0A84FF",
  indigo: "#5E5CE6",
  violet: "#AF52DE",
} as const;

export const font = {
  display: "var(--font-display)",
  body: "var(--font-body)",
  meta: "var(--font-meta)",
  fountain: "var(--font-fountain)",
  gel: "var(--font-gel)",
} as const;

export const type = {
  displayHero: "clamp(3.5rem, 1.9rem + 6.8vw, 8rem)",
  displayXl: "clamp(2.75rem, 1.6rem + 4.9vw, 4.5rem)",
  displayLg: "clamp(2.125rem, 1.5rem + 2.7vw, 3rem)",
  displayMd: "clamp(1.75rem, 1.4rem + 1.5vw, 2.25rem)",
  bodyLg: "clamp(1.125rem, 1.05rem + 0.35vw, 1.25rem)",
  bodyMd: "1.0625rem",
  bodySm: "0.9375rem",
  meta: "0.8125rem",
  metaSm: "0.6875rem",
} as const;

export const leading = { display: 1.08, body: 1.65, meta: 1.4 } as const;

export const space = {
  xs: "0.5rem",
  sm: "1rem",
  md: "1.5rem",
  lg: "2.5rem",
  xl: "4rem",
  xxl: "6rem",
  xxxl: "9rem",
} as const;

export const breakpoint = {
  sm: "375px",
  md: "768px",
  lg: "1024px",
  xl: "1440px",
} as const;

export const tokens = { color, spectrum, font, type, leading, space, breakpoint };
