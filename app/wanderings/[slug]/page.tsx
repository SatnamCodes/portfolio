import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { notFound } from "next/navigation";
import { Page } from "@/components/Page";
import { PageLink } from "@/components/PageLink";
import { PlainTypeFrame, PlainTypeToggle } from "@/components/PlainType";
import { inkComponents } from "@/components/wanderings/Ink";
import { LanguagePane, LanguageToggle, OnlyIn } from "@/components/wanderings/Language";
import { BellPlates, InversePlate } from "@/components/wanderings/Plates";
import { Unravel } from "@/components/wanderings/Unravel";
import { VortexPlate } from "@/components/wanderings/Vortex";
import ink from "@/components/wanderings/ink.module.css";
import { excerpt, formatDate, getWanderings, opening, staticParams } from "@/lib/content";
import { article, breadcrumbs, webPage } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import s from "./entry.module.css";

export const dynamicParams = false;

export async function generateStaticParams() {
  return staticParams((await getWanderings()).map((x) => x.slug));
}

async function find(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  return (await getWanderings()).find((w) => w.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const entry = await find(params);
  if (!entry) return {};
  return pageMetadata({
    title: entry.meta.title ?? opening(entry.source, 8),
    description: excerpt(entry.source),
    path: `/wanderings/${entry.slug}`,
    type: "article",
    published: entry.meta.date,
    ownCard: true,
  });
}

export default async function WanderingEntry({ params }: { params: Promise<{ slug: string }> }) {
  const entry = await find(params);
  if (!entry) notFound();
  const { meta, Body, words, punjabi } = entry;
  const path = `/wanderings/${entry.slug}`;
  const title = meta.title ?? opening(entry.source, 8);
  const description = excerpt(entry.source);
  const components = { ...inkComponents(words), VortexPlate, BellPlates, InversePlate };
  const english = (
    <>
      {meta.title ? (
        <h1 className={s.title}>{meta.title}</h1>
      ) : (
        <h1 className="visually-hidden">Untitled, {formatDate(meta.date)}</h1>
      )}
      <div className={ink.ink}>
        <Body components={components} />
      </div>
    </>
  );

  return (
    <Page>
      <JsonLd
        nodes={[
          webPage(path, title, description),
          breadcrumbs([
            { name: "Wanderings", path: "/wanderings" },
            { name: title, path },
          ]),
          article({
            path,
            title,
            description,
            date: meta.date,
            wordCount: words,
            // Professors the essay links to by name ("[Professor Name](profile)").
            mentions: [...entry.source.matchAll(/\[Professor ([^\]]+)\]\((https?:[^)]+)\)/g)]
              .map((m) => ({ name: m[1], url: m[2] }))
              .filter((m, i, all) => all.findIndex((x) => x.url === m.url) === i),
          }),
        ]}
      />
      <PlainTypeFrame className={s.entry}>
        <header className={s.header}>
          <p className={s.meta}>
            <PageLink href="/wanderings">Wanderings</PageLink>
            <span aria-hidden="true"> · </span>
            <time dateTime={meta.date}>{formatDate(meta.date)}</time>
          </p>
          <span className={s.toggles}>
            {punjabi && <LanguageToggle className={s.toggle} articleId="essay" />}
            <PlainTypeToggle className={s.toggle} />
          </span>
        </header>
        <article id="essay" className={s.article} data-length={words < 40 ? "fragment" : undefined}>
          {punjabi ? (
            <>
              <LanguagePane lang="en">{english}</LanguagePane>
              <LanguagePane lang="pa" className={s.punjabi}>
                <h1 className={s.title}>{punjabi.title ?? title}</h1>
                <div className={ink.ink}>
                  <punjabi.Body components={components} />
                </div>
              </LanguagePane>
            </>
          ) : (
            english
          )}
        </article>
        {/* The ending picks words out of the English text, so it plays only with the English. */}
        {meta.ending === "feynman" && (
          <OnlyIn lang="en">
            <Unravel articleId="essay" />
          </OnlyIn>
        )}
      </PlainTypeFrame>
    </Page>
  );
}
