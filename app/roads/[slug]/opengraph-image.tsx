import { getRoads, staticParams } from "@/lib/content";
import { artFor, CARD_SIZE, shareCard } from "@/lib/share-card";

// Every road's share card, made at build time: its title and a still of its animation.
export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "A piece by Satnam: its title beside a still of its animation, cream on brown.";

export async function generateStaticParams() {
  return staticParams((await getRoads()).map((x) => x.slug));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const road = (await getRoads()).find((r) => r.slug === slug);
  return shareCard({
    title: road?.meta.title ?? "Roads",
    section: road?.meta.category ? `Roads · ${road.meta.category}` : "Roads",
    art: artFor(road?.source ?? ""),
    seed: slug,
  });
}
