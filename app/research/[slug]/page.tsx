import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageLink as Link } from "@/components/PageLink";
import { notFound } from "next/navigation";
import { Page } from "@/components/Page";
import { formatDate, getResearch, opening, staticParams } from "@/lib/content";
import { article, breadcrumbs, webPage } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { fieldLabel } from "@/lib/research-fields";
import prose from "@/styles/prose.module.css";
import { site } from "@/lib/site";
import s from "./entry.module.css";

const listFormat = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

export const dynamicParams = false;

export async function generateStaticParams() {
  return staticParams((await getResearch()).map((x) => x.slug));
}

async function find(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  return (await getResearch()).find((r) => r.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const entry = await find(params);
  if (!entry) return {};
  return pageMetadata({
    title: entry.meta.title,
    description: opening(entry.source, 30),
    path: `/research/${entry.slug}`,
    type: "article",
    published: entry.meta.date,
  });
}

// Entries shorter than this don't need a table of contents.
const JUMP_NAV_MIN_FIELDS = 3;

export default async function ResearchEntry({ params }: { params: Promise<{ slug: string }> }) {
  const entry = await find(params);
  if (!entry) notFound();
  const { meta, Body, fields, number } = entry;
  const showNav = fields.length >= JUMP_NAV_MIN_FIELDS;
  const path = `/research/${entry.slug}`;
  const description = opening(entry.source, 30);

  return (
    <Page>
      <JsonLd
        nodes={[
          webPage(path, meta.title, description),
          breadcrumbs([
            { name: "Research", path: "/research" },
            { name: meta.title, path },
          ]),
          article({ path, title: meta.title, description, date: meta.date, type: "Article" }),
        ]}
      />
      <article className={s.entry} data-nav={showNav || undefined}>
        <header className={s.header}>
          <p className={s.kicker}>
            <Link href="/research">Research</Link>
            <span aria-hidden="true"> · </span>
            No. {String(number).padStart(3, "0")}
            <span aria-hidden="true"> · </span>
            <time dateTime={meta.date}>{formatDate(meta.date)}</time>
            {meta.status && (
              <>
                <span aria-hidden="true"> · </span>
                {meta.status}
              </>
            )}
          </p>
          <h1 className={s.title}>{meta.title}</h1>
          {meta.collaborators?.length ? (
            <p className={s.byline}>
              {site.owner}, with {listFormat.format(meta.collaborators)}
            </p>
          ) : null}
        </header>
        {showNav && (
          <nav className={s.nav} aria-label="In this entry">
            <p className={s.navLabel} aria-hidden="true">
              In this entry
            </p>
            <ol>
              {fields.map((f) => (
                <li key={f}>
                  <a href={`#field-${f}`}>{fieldLabel(f)}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className={`${prose.prose} ${s.body}`}>
          <Body />
        </div>
      </article>
    </Page>
  );
}
