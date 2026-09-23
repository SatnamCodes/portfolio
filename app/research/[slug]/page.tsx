import type { Metadata } from "next";
import { PageLink as Link } from "@/components/PageLink";
import { notFound } from "next/navigation";
import { Page } from "@/components/Page";
import { formatDate, getResearch } from "@/lib/content";
import { fieldLabel } from "@/lib/research-fields";
import prose from "@/styles/prose.module.css";
import s from "./entry.module.css";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getResearch()).map((r) => ({ slug: r.slug }));
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
  return entry ? { title: entry.meta.title } : {};
}

// Entries shorter than this don't need a table of contents.
const JUMP_NAV_MIN_FIELDS = 3;

export default async function ResearchEntry({ params }: { params: Promise<{ slug: string }> }) {
  const entry = await find(params);
  if (!entry) notFound();
  const { meta, Body, fields, number } = entry;
  const showNav = fields.length >= JUMP_NAV_MIN_FIELDS;

  return (
    <Page>
      <article className={s.entry} data-nav={showNav || undefined}>
        <header className={s.header}>
          <p className={s.kicker}>
            <Link href="/research">Research</Link>
            <span aria-hidden="true"> · </span>
            No. {String(number).padStart(3, "0")}
            <span aria-hidden="true"> · </span>
            <time dateTime={meta.date}>{formatDate(meta.date)}</time>
          </p>
          <h1 className={s.title}>{meta.title}</h1>
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
