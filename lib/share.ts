import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * A writing's own share card, if one has been made (scripts/share-cards.mjs writes them to
 * public/share/<section>-<slug>.jpg). Without one the page falls back to the site banner.
 */
export function shareCard(section: string, slug: string, title: string) {
  const file = `/share/${section}-${slug}.jpg`;
  if (!fs.existsSync(path.join(process.cwd(), "public", file))) return undefined;
  return { url: file, alt: `${title}: a still from the piece's animation, with its title.` };
}
