import { Page } from "@/components/Page";
import { MarginNotes } from "@/components/home/MarginNotes";
import { PrismStage } from "@/components/home/PrismStage";
import { ScrollCue } from "@/components/home/ScrollCue";
import { ScrollMorph } from "@/components/home/ScrollMorph";
import { home } from "@/content/home";
import s from "./home.module.css";

export default function Home() {
  return (
    <Page>
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
              {home.manifesto.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
          <MarginNotes near="body" className={s.bodyNote} />
        </section>
      </div>

      <footer className={s.footer}>
        <MarginNotes near="corner" className={s.footerNote} />
        <ol className={s.path} aria-label="Path">
          {home.path.map((place) => (
            <li key={place}>{place}</li>
          ))}
        </ol>
      </footer>
    </Page>
  );
}
