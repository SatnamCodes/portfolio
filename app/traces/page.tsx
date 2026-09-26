import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbs, webPage, imageGallery } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { Page } from "@/components/Page";
import { EmptyState, SectionIntro } from "@/components/SectionIntro";
import { Leader } from "@/components/traces/Leader";
import { Reels } from "@/components/traces/Reels";
import { formatDate } from "@/lib/content";
import { getPhotos } from "@/lib/traces";
import s from "./traces.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Traces",
  description:
    "Astrophotography by Satnam: the moon, the sun and its sunspots, Saturn, Jupiter and its moons and the Orion Nebula, shown on a reel of film.",
  path: "/traces",
  type: "website",
});

export default function TracesPage() {
  const photos = getPhotos().map((p) => ({
    id: p.id,
    src: p.src,
    video: p.video,
    frame: p.frame,
    width: p.width,
    height: p.height,
    alt: p.alt,
    caption: p.caption,
    place: [p.location, p.date && formatDate(p.date)].filter(Boolean).join(" · ") || undefined,
    kit: [p.camera, p.lens, p.exposure].filter(Boolean).join(" · ") || undefined,
  }));

  return (
    <Page>
      <JsonLd
        nodes={[
          webPage("/traces", "Traces", metadata.description!, "CollectionPage"),
          breadcrumbs([{ name: "Traces", path: "/traces" }]),
          imageGallery("/traces", photos),
        ]}
      />
      <div className={s.page}>
        <SectionIntro title="Traces" meta="Things witnessed" />
        {photos.length === 0 ? (
          <EmptyState>No traces yet.</EmptyState>
        ) : (
          <Reels photos={photos} lead={<Leader />} />
        )}
      </div>
    </Page>
  );
}
