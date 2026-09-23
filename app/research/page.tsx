import type { Metadata } from "next";
import { PageLink as Link } from "@/components/PageLink";
import { Page } from "@/components/Page";
import { EmptyState, SectionIntro } from "@/components/SectionIntro";
import { fieldText, formatDate, getResearch } from "@/lib/content";
import { fieldLabel } from "@/lib/research-fields";
import s from "./research.module.css";

export const metadata: Metadata = { title: "Research" };

const pad = (n: number) => String(n).padStart(3, "0");

export default async function ResearchPage() {
  const entries = await getResearch();

  return (
    <Page>
      <div className={s.page}>
        <SectionIntro title="Research" meta="Notebook" />
        {entries.length === 0 ? (
          <EmptyState>The notebook is open, but nothing has been written up yet.</EmptyState>
        ) : (
          <ol className={`${s.notebook} stagger`}>
            {entries.map((e, i) => {
              const question = e.fields.includes("question")
                ? fieldText(e.source, "question")
                : null;
              return (
                <li key={e.slug} className={s.record} style={{ "--i": i } as React.CSSProperties}>
                  <p className={s.number}>
                    <span className="visually-hidden">Entry </span>No. {pad(e.number)}
                  </p>
                  <div className={s.body}>
                    <h2 className={s.title}>
                      <Link href={`/research/${e.slug}`}>{e.meta.title}</Link>
                    </h2>
                    <p className={s.meta}>
                      <time dateTime={e.meta.date}>{formatDate(e.meta.date)}</time>
                    </p>
                    {question && (
                      <p className={s.question}>
                        <span className={s.q}>Q.</span> {question}
                      </p>
                    )}
                    {e.fields.length > 0 && (
                      <p className={s.fields}>
                        <span className="visually-hidden">Sections: </span>
                        {e.fields.map(fieldLabel).join(" · ")}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Page>
  );
}
