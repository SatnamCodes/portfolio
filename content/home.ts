// The homepage's single editable source. Layout code reads everything from here.

// top: upper right margin · prism: beside the light · corner: lower left of the first screen · body: beside the manifesto
export type Slot = "top" | "prism" | "corner" | "body";

export const home = {
  heading: "Why I'm here",

  // PLACEHOLDER — replace with your own words. Each string is one paragraph.
  manifesto: [
    "[Placeholder — the first paragraph of your manifesto goes here.]",
    "[Placeholder — a second paragraph.]",
    "[Placeholder — a closing line.]",
  ],
  manifestoIsPlaceholder: true,

  // Handwritten marginalia. `near` picks the slot; keep these sparse.
  annotations: [
    { id: "wanders", near: "top", text: "A mind that wanders builds anyways." },
    { id: "paths", near: "prism", text: "different paths, same light." },
    // From the alignment reference; remove or rewrite freely. Line breaks are kept.
    {
      id: "reasons",
      near: "corner",
      text: "to understand\nto build\nto explore\nto leave something behind.",
    },
  ] satisfies { id: string; near: Slot; text: string }[],

  // Ordered red → violet: the first item sits at the red band, the last at violet.
  interests: ["Mathematics", "Physics", "Philosophy", "Curiosity", "Ideas", "People", "Thoughts"],

  path: ["Bathinda", "Bengaluru", "World"],

  prismDescription:
    "A glass prism. A beam of white light enters from the left and leaves as seven coloured bands, red through violet, fanning out toward a list of interests.",
} as const;
