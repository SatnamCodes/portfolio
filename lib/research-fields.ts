// Research sections, in the only order they may appear.
export const RESEARCH_FIELDS = [
  ["question", "Question"],
  ["motivation", "Motivation"],
  ["background", "Background"],
  ["method", "Method"],
  ["experiment", "Experiment"],
  ["results", "Results"],
  ["visualizations", "Visualizations"],
  ["discussion", "Discussion"],
  ["limitations", "Limitations"],
  ["reflection", "Reflection"],
  ["references", "References"],
] as const;

export type ResearchField = (typeof RESEARCH_FIELDS)[number][0];

export const fieldLabel = (key: string) => RESEARCH_FIELDS.find(([k]) => k === key)?.[1] ?? key;
