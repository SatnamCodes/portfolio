import { getWanderings, opening, staticParams } from "@/lib/content";
import { artFor, CARD_SIZE, shareCard } from "@/lib/share-card";

// Every wandering's share card, made at build time: its title and a still of its animation.
export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt =
  "A wandering by Satnam: its title beside a still of its animation, cream on brown.";

export async function generateStaticParams() {
  return staticParams((await getWanderings()).map((x) => x.slug));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = (await getWanderings()).find((w) => w.slug === slug);
  const title = entry ? (entry.meta.title ?? opening(entry.source, 8)) : "Wanderings";
  return shareCard({
    title,
    section: "Wanderings",
    art: artFor(entry?.source ?? "", entry?.meta.ending),
    seed: slug,
  });
}
