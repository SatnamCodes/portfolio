import type { Metadata } from "next";
import { Page } from "@/components/Page";
import { EmptyState, SectionIntro } from "@/components/SectionIntro";
import { Leader } from "@/components/traces/Leader";
import { Reels } from "@/components/traces/Reels";
import { formatDate } from "@/lib/content";
import { getPhotos } from "@/lib/traces";
import s from "./traces.module.css";

export const metadata: Metadata = { title: "Traces" };

export default function TracesPage() {
  const photos = getPhotos().map((p) => ({
    id: p.id,
    src: p.src,
    video: p.video,
    width: p.width,
    height: p.height,
    alt: p.alt,
    caption: p.caption,
    place: [p.location, p.date && formatDate(p.date)].filter(Boolean).join(" · ") || undefined,
    kit: [p.camera, p.lens, p.exposure].filter(Boolean).join(" · ") || undefined,
  }));

  return (
    <Page>
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
