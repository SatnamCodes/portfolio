import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbs, webPage } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { Page } from "@/components/Page";
import { EmptyState, SectionIntro } from "@/components/SectionIntro";
import { FrostQuote } from "@/components/sketch/RoadNotTaken";
import { formatDate, getRoads } from "@/lib/content";
import { RoadsIndex } from "./RoadsIndex";
import s from "./roads.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Roads",
  description: "Blogs by Satnam, newest first.",
  path: "/roads",
  type: "website",
});

export default async function RoadsPage() {
  const roads = await getRoads();

  return (
    <Page>
      <JsonLd
        nodes={[
          webPage("/roads", "Roads", metadata.description!, "CollectionPage"),
          breadcrumbs([{ name: "Roads", path: "/roads" }]),
        ]}
      />
      <div className={s.page}>
        <SectionIntro
          title="Roads"
          meta={
            roads.length
              ? `Blogs · ${roads.length} ${roads.length === 1 ? "entry" : "entries"}`
              : "Blogs"
          }
        />
        <FrostQuote />
        {roads.length === 0 ? (
          <EmptyState>No roads yet. The first one is still being walked.</EmptyState>
        ) : (
          <RoadsIndex
            roads={roads.map((r) => ({
              slug: r.slug,
              title: r.meta.title,
              description: r.meta.description,
              category: r.meta.category,
              date: r.meta.date,
              displayDate: formatDate(r.meta.date),
              minutes: r.minutes,
            }))}
          />
        )}
      </div>
    </Page>
  );
}
