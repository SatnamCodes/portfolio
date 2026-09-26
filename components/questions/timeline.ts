// "The Questions": the whole sequence as data. Scene windows, on-screen questions, captions and
// narration cues live here, so timing is edited in one place (and audio is synced to these marks).

// The narration file (optional). The animation never waits for it.
export const AUDIO_SRC = "/audio/the-questions.mp3";

export const DURATION = 137;
// Where playback starts: the moment the first question begins writing (its lone dot is skipped).
export const LEAD_IN = 4.6; // seconds

export type SceneId =
  | "question"
  | "euclid"
  | "newton"
  | "faraday"
  | "maxwell"
  | "einstein"
  | "cantor"
  | "godel"
  | "turing"
  | "keats"
  | "convergence"
  | "prism";

export const SCENES: { id: SceneId; name: string; start: number; end: number; source?: string }[] =
  [
    { id: "question", name: "The First Question", start: 0, end: 11, source: "socrates" },
    { id: "euclid", name: "Certainty", start: 11, end: 22, source: "euclid" },
    { id: "newton", name: "The World Moves", start: 22, end: 35, source: "newton" },
    { id: "faraday", name: "The Invisible", start: 35, end: 46, source: "faraday" },
    { id: "maxwell", name: "Translation", start: 46, end: 57, source: "maxwell" },
    { id: "einstein", name: "Light", start: 57, end: 70, source: "einstein" },
    { id: "cantor", name: "The Limit", start: 70, end: 80, source: "cantor" },
    { id: "godel", name: "Self Reference", start: 80, end: 88, source: "godel" },
    { id: "turing", name: "The Machine", start: 88, end: 100, source: "turing" },
    { id: "keats", name: "The Human Question", start: 100, end: 110, source: "keats" },
    { id: "convergence", name: "The Roads Meet", start: 110, end: 120 },
    { id: "prism", name: "The Prism", start: 120, end: DURATION },
  ];

// Margin captions: archival attribution, never "this is X".
export const CAPTIONS: Record<string, string> = {
  question: "Plato, Theaetetus · c. 369 BCE",
  euclid: "Euclid, Elements, Book I · c. 300 BCE",
  newton: "Newton, Principia · 1687",
  faraday: "Faraday, Experimental Researches in Electricity · 1831",
  maxwell: "Maxwell, A Dynamical Theory of the Electromagnetic Field · 1865",
  einstein: "Einstein, On the Electrodynamics of Moving Bodies · 1905",
  cantor: "Cantor · 1891",
  godel: "Gödel · 1931",
  turing: "Turing, On Computable Numbers · 1936",
  keats: "Keats, letter of December 1817",
};

// Narration cues (what the voice says, and when). Also shown as quiet captions, so the piece
// works silently. Questions are spoken as they appear on screen.
export const NARRATION: { at: number; text: string; caption?: boolean }[] = [
  { at: 4.7, text: "What is knowledge?" },
  { at: 13.5, text: "What can be known from what we already know?" },
  {
    at: 26,
    text: "Can the motion of the heavens and the motion of the earth be described by the same laws?",
  },
  { at: 38.5, text: "What connects electricity and magnetism?" },
  {
    at: 50,
    text: "What if mathematics can reveal something that experiment has not yet shown us?",
  },
  { at: 61, text: "What happens to time when the speed of light does not change?" },
  { at: 73, text: "How large is infinity?" },
  { at: 82, text: "Can a formal system prove everything that is true about itself?" },
  { at: 92, text: "What does it mean for something to be computable?" },
  { at: 97, text: "Can machines think?" },
  { at: 104, text: "What if not knowing is not failure?" },
  { at: 110.5, text: "Perhaps these were never separate questions.", caption: true },
  { at: 112.5, text: "What exists?" },
  { at: 113.7, text: "What can be known?" },
  { at: 114.9, text: "What can be proved?" },
  { at: 116.1, text: "What can be measured?" },
  { at: 117.3, text: "What can be computed?" },
  { at: 118.5, text: "And what does it mean to experience all of it?" },
  { at: 123, text: "Perhaps knowledge is like this.", caption: true },
  { at: 125.5, text: "We divide the world so that we can understand it.", caption: true },
  {
    at: 128.5,
    text: "And then, somewhere deep enough, the divisions begin to disappear.",
    caption: true,
  },
  { at: 131.5, text: "What lies between what we know and what remains unknown?" },
];

export const sceneAt = (t: number) =>
  SCENES.find((s) => t >= s.start && t < s.end) ?? SCENES[SCENES.length - 1];
