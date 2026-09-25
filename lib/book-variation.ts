import { mulberry32 } from "./session-seed";

export type Orientation = "upright" | "leaning" | "flat";

export type BookVariation = {
  height: number;
  thickness: number;
  orientation: Orientation;
  lean: number;
  tone: number;
  bands: number;
  bandOffset: number;
  label: "none" | "patch" | "foil";
  titleScale: number;
  wear: number;
};

// Cover tones: Espresso family and Sea Sand shades only. [cover, ink, band] as token names.
export const TONES = [
  ["espresso", "seaSand", "espressoTint2"],
  ["espressoTint1", "seaSand", "espresso"],
  ["espressoTint2", "seaSand", "espresso"],
  ["seaSandShade2", "espresso", "espressoTint1"],
  ["seaSandShade1", "espresso", "espressoTint2"],
  ["espressoTint3", "espresso", "espressoTint1"],
] as const;

const DARK_TONES = 3;

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Deterministic per book id: the same book always looks the same, and no two ids collide visually
// unless their hashes do.
export function bookVariation(
  id: string,
  override?: { orientation?: Orientation; height?: number; thickness?: number; upright?: boolean },
): BookVariation {
  const r = mulberry32(hash(id));
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const roll = r();
  const tone = Math.floor(r() * TONES.length);
  // `upright` keeps a book off its side (a lettered spine reads wrongly when laid flat).
  const orientation: Orientation =
    override?.orientation ??
    (roll < 0.08 ? (override?.upright ? "upright" : "flat") : roll < 0.2 ? "leaning" : "upright");
  // Always drawn, so a book's other features don't shift when its size is set by hand.
  const height = Math.round(150 + r() * 80);
  const thickness = Math.round(24 + r() * 30);
  return {
    height: override?.height ?? height,
    thickness: override?.thickness ?? thickness,
    orientation,
    lean: orientation === "leaning" ? -(3 + r() * 5) : 0,
    tone,
    bands: Math.floor(r() * 4),
    bandOffset: 0.08 + r() * 0.14,
    // Foil lettering only reads on the dark covers.
    label: pick(
      tone < DARK_TONES
        ? (["none", "patch", "patch", "foil"] as const)
        : (["none", "patch"] as const),
    ),
    titleScale: 0.9 + r() * 0.25,
    wear: r(),
  };
}
