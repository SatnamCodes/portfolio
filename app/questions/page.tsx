import type { Metadata } from "next";
import { Page } from "@/components/Page";
import { PageLink } from "@/components/PageLink";
import { SOURCES } from "@/components/questions/sources";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbs, webPage } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { Emblem } from "./Emblems";
import s from "./questions.module.css";

export const metadata: Metadata = pageMetadata({
  title: "The Questions",
  description:
    "A plate of ten questions that carried knowledge forward, from Socrates and Euclid to Newton, Faraday, Maxwell, Einstein, Cantor, Gödel, Turing and Keats, with their works and sources.",
  path: "/questions",
});

// The painting that keeps the sequence: every thinker in a niche, with the emblem of their work,
// their name and dates, and the question. Paraphrases are set plainly; only verified words are
// in quotation marks.
export default function QuestionsPlate() {
  return (
    <Page>
      <JsonLd
        nodes={[
          webPage("/questions", "The Questions", metadata.description!),
          breadcrumbs([{ name: "The Questions", path: "/questions" }]),
        ]}
      />
      <article className={s.page}>
        <header className={s.header}>
          <p className={s.kicker}>
            <PageLink href="/">Home</PageLink> · A plate
          </p>
          <h1 className={s.title}>The Questions</h1>
          <p className={s.lead}>
            Ten questions, each asked because the one before it had been answered, or had not.
          </p>
        </header>

        <figure className={s.plate}>
          <ol className={s.niches}>
            {SOURCES.map((src, i) => (
              <li key={src.id} className={s.niche} style={{ "--i": i } as React.CSSProperties}>
                <div className={s.arch}>
                  <Emblem id={src.id} />
                </div>
                <h2 className={s.name}>{src.person}</h2>
                <p className={s.meta}>
                  {src.work} · {src.year}
                </p>
                <p className={s.question}>{src.question}</p>
                {src.quotation && <p className={s.quote}>“{src.quotation}”</p>}
              </li>
            ))}
          </ol>
          <figcaption className={s.caption}>
            The emblems draw each person’s work rather than their face. Questions without quotation
            marks are paraphrases of what the work pursued; words in quotation marks are the
            person’s own, checked against the sources below.
          </figcaption>
        </figure>

        <section className={s.sources} aria-labelledby="sources-title">
          <h2 id="sources-title" className={s.sourcesTitle}>
            Sources, and how each question led to the next
          </h2>
          <ol>
            {SOURCES.map((src) => (
              <li key={src.id}>
                <p>
                  <strong>{src.person}</strong>: {src.source}
                </p>
                <p className={s.next}>→ {src.nextConnection}</p>
              </li>
            ))}
          </ol>
        </section>
      </article>
    </Page>
  );
}
