import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbs, webPage } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { Page } from "@/components/Page";
import { PageLink } from "@/components/PageLink";
import { EmptyState, SectionIntro } from "@/components/SectionIntro";
import { Mark, MARK_NAMES } from "@/components/wanderings/Marks";
import { Trail } from "@/components/wanderings/Trail";
import { formatDate, getWanderings, opening } from "@/lib/content";
import { mulberry32 } from "@/lib/session-seed";
import s from "./wanderings.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Wanderings",
  description: "Short thoughts, fragments and questions by Satnam.",
  path: "/wanderings",
  type: "website",
});

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Where a leaf lands on the desk: seeded by its slug so the arrangement is stable between visits.
function placement(slug: string, words: number) {
  const r = mulberry32(hash(slug));
  const span = words < 25 ? 4 + Math.floor(r() * 2) : 5 + Math.floor(r() * 3);
  const start = 1 + Math.floor(r() * (13 - span));
  return {
    "--col": `${start} / span ${span}`,
    "--drop": `${(r() * 4).toFixed(2)}rem`,
    "--tilt": `${(r() * 2.4 - 1.2).toFixed(2)}deg`,
    mark: MARK_NAMES[Math.floor(r() * MARK_NAMES.length)],
  };
}

export default async function WanderingsPage() {
  const entries = await getWanderings();

  return (
    <Page>
      <JsonLd
        nodes={[
          webPage("/wanderings", "Wanderings", metadata.description!, "CollectionPage"),
          breadcrumbs([{ name: "Wanderings", path: "/wanderings" }]),
        ]}
      />
      <div className={s.page}>
        <SectionIntro title="Wanderings" meta="Thoughts, fragments, questions" />
        {entries.length === 0 ? (
          <EmptyState>Nothing written here yet. The pages are waiting.</EmptyState>
        ) : (
          <div className={s.deskWrap}>
            <ol className={`${s.desk} stagger`}>
              {entries.map((e, i) => {
                const { mark, ...place } = placement(e.slug, e.words);
                const label = e.meta.title ?? opening(e.source, 14);
                return (
                  <li
                    key={e.slug}
                    className={s.leaf}
                    data-leaf=""
                    style={{ ...place, "--i": i } as React.CSSProperties}
                  >
                    <time className={s.date} dateTime={e.meta.date}>
                      {formatDate(e.meta.date)}
                    </time>
                    <PageLink
                      href={`/wanderings/${e.slug}`}
                      className={s.link}
                      data-untitled={!e.meta.title || undefined}
                    >
                      {label}
                    </PageLink>
                    {e.meta.title && (
                      <p className={s.preview} aria-hidden="true">
                        {opening(e.source, 26)}
                      </p>
                    )}
                    <Mark name={mark} className={s.mark} />
                  </li>
                );
              })}
            </ol>
            <Trail />
          </div>
        )}
      </div>
    </Page>
  );
}
