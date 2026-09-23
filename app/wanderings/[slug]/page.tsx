import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page } from "@/components/Page";
import { PageLink } from "@/components/PageLink";
import { PlainTypeFrame, PlainTypeToggle } from "@/components/PlainType";
import { inkComponents } from "@/components/wanderings/Ink";
import ink from "@/components/wanderings/ink.module.css";
import { formatDate, getWanderings, opening } from "@/lib/content";
import s from "./entry.module.css";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getWanderings()).map((w) => ({ slug: w.slug }));
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
  return entry ? { title: entry.meta.title ?? opening(entry.source, 8) } : {};
}

export default async function WanderingEntry({ params }: { params: Promise<{ slug: string }> }) {
  const entry = await find(params);
  if (!entry) notFound();
  const { meta, Body, words } = entry;

  return (
    <Page>
      <PlainTypeFrame className={s.entry}>
        <header className={s.header}>
          <p className={s.meta}>
            <PageLink href="/wanderings">Wanderings</PageLink>
            <span aria-hidden="true"> · </span>
            <time dateTime={meta.date}>{formatDate(meta.date)}</time>
          </p>
          <PlainTypeToggle className={s.toggle} />
        </header>
        <article className={s.article} data-length={words < 40 ? "fragment" : undefined}>
          {meta.title ? (
            <h1 className={s.title}>{meta.title}</h1>
          ) : (
            <h1 className="visually-hidden">Untitled, {formatDate(meta.date)}</h1>
          )}
          <div className={ink.ink}>
            <Body components={inkComponents(words)} />
          </div>
        </article>
      </PlainTypeFrame>
    </Page>
  );
}
