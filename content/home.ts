// The homepage's single editable source. The words live in content/home.json (edited through the
// local admin, `npm run admin`); this file only gives them types. The manifesto's spelling and
// punctuation are intentional: never correct them.
import data from "./home.json";

// top: upper right margin · prism: beside the light · corner: lower left of the first screen · body: beside the manifesto
export type Slot = "top" | "prism" | "corner" | "body";
export type ManifestoItem = string | { heading: string };

type Home = {
  heading: string;
  manifesto: ManifestoItem[];
  manifestoIsPlaceholder: boolean;
  annotations: { id: string; near: Slot; text: string }[];
  // Ordered red → violet: the first item sits at the red band, the last at violet.
  interests: string[];
  path: string[];
  prismDescription: string;
};

export const home = data as Home;
