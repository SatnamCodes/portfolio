import type { Metadata } from "next";
import { PageLink as Link } from "@/components/PageLink";
import { Page } from "@/components/Page";
import { EmptyState, SectionIntro } from "@/components/SectionIntro";
import { formatDate, getRoads } from "@/lib/content";
import s from "./roads.module.css";

export const metadata: Metadata = { title: "Roads" };

export default async function RoadsPage() {
  const roads = await getRoads();
  const years = [...new Set(roads.map((r) => r.meta.date.slice(0, 4)))];

  return (
    <Page>
      <div className={s.page}>
        <SectionIntro
          title="Roads"
          meta={
            roads.length
              ? `Essays · ${roads.length} ${roads.length === 1 ? "entry" : "entries"}`
              : "Essays"
          }
        />
        {roads.length === 0 ? (
          <EmptyState>No roads yet. The first one is still being walked.</EmptyState>
        ) : (
          years.map((year) => (
            <section key={year} className={s.year} aria-labelledby={`year-${year}`}>
              <h2 id={`year-${year}`} className={s.yearLabel}>
                {year}
              </h2>
              <ol className={`${s.contents} stagger`}>
                {roads
                  .filter((r) => r.meta.date.startsWith(year))
                  .map((road, i) => (
                    <li
                      key={road.slug}
                      className={s.entry}
                      style={{ "--i": i } as React.CSSProperties}
                    >
                      <time className={s.date} dateTime={road.meta.date}>
                        {formatDate(road.meta.date)}
                      </time>
                      <div className={s.main}>
                        <h3 className={s.title}>
                          <Link href={`/roads/${road.slug}`} className={s.link}>
                            {road.meta.title}
                          </Link>
                        </h3>
                        <p className={s.description}>{road.meta.description}</p>
                      </div>
                      <p className={s.aside}>
                        <span>{road.meta.category}</span>
                        <span>{road.minutes} min read</span>
                      </p>
                    </li>
                  ))}
              </ol>
            </section>
          ))
        )}
      </div>
    </Page>
  );
}
