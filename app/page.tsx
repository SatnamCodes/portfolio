import type { Metadata } from "next";
import { Page } from "@/components/Page";
import { JsonLd } from "@/components/seo/JsonLd";
import { webPage } from "@/lib/schema";
import { pageMetadata, SITE_DESCRIPTION } from "@/lib/seo";
import { MarginNotes } from "@/components/home/MarginNotes";
import { PrismStage } from "@/components/home/PrismStage";
import { ScrollCue } from "@/components/home/ScrollCue";
import { ScrollMorph } from "@/components/home/ScrollMorph";
import { TheQuestions } from "@/components/questions/TheQuestions";
import { home } from "@/content/home";
import s from "./home.module.css";

export const metadata: Metadata = pageMetadata({ description: SITE_DESCRIPTION, path: "/" });

export default function Home() {
  return (
    <Page>
      <JsonLd nodes={[webPage("/", "Satnam", SITE_DESCRIPTION)]} />
      <div data-morph-root="">
        <ScrollMorph />
        {/* The first screen: the prism at the centre, the heading beneath it. On scroll the heading
            flies into the manifesto's title slot while the prism recedes (see ScrollMorph). */}
        <section className={s.hero} data-morph="hero" aria-labelledby="manifesto-heading">
          <div data-morph="fade" className={s.topNote}>
            <MarginNotes near="top" />
          </div>
          <div className={s.stage} data-morph="stage">
            <PrismStage interests={home.interests} description={home.prismDescription} />
          </div>
          <h1 id="manifesto-heading" className={s.heading} data-morph="heading">
            {home.heading}
          </h1>
          <div className={s.cue} data-morph="fade">
            <ScrollCue />
          </div>
        </section>

        <section className={s.body} aria-label="Manifesto">
          <div className={s.manifesto}>
            {/* Where the heading lands. The real heading (above) is the one read aloud. */}
            <p className={s.titleSlot} data-morph="target" aria-hidden="true">
              {home.heading}
            </p>
            <div
              className={s.paragraphs}
              data-morph="rise"
              data-placeholder={home.manifestoIsPlaceholder || undefined}
            >
              {home.manifesto.map((item, i) =>
                typeof item === "string" ? (
                  <p key={i}>{item}</p>
                ) : (
                  <h2 key={i} className={s.manifestoHeading}>
                    {item.heading}
                  </h2>
                ),
              )}
            </div>
          </div>
          <MarginNotes near="body" className={s.bodyNote} />
        </section>
      </div>

      {/* The page ends in "The Questions": a live drawing, not a footer and not a video. */}
      <TheQuestions colophon={home.path.join(" · ")} />
    </Page>
  );
}
