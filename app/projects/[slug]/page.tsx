import type { Metadata } from "next";
import { PageLink as Link } from "@/components/PageLink";
import { notFound } from "next/navigation";
import { ExternalLink } from "@/components/ExternalLink";
import { Page } from "@/components/Page";
import { getProjects, hasBody } from "@/lib/content";
import prose from "@/styles/prose.module.css";
import s from "./project.module.css";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }));
}

async function find(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  return (await getProjects()).find((p) => p.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const project = await find(params);
  return project ? { title: project.meta.title, description: project.meta.summary } : {};
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = await find(params);
  if (!project) notFound();
  const { meta, Body, source } = project;

  const rows: [string, React.ReactNode][] = [
    ["Year", meta.year],
    ["Status", meta.status],
    ["Built with", meta.technologies.join(", ")],
  ];
  if (meta.repository)
    rows.push([
      "Repository",
      <ExternalLink key="r" href={meta.repository}>
        Source
      </ExternalLink>,
    ]);
  if (meta.demo)
    rows.push([
      "Live",
      <ExternalLink key="d" href={meta.demo}>
        Demo
      </ExternalLink>,
    ]);

  return (
    <Page>
      <article className={s.project}>
        <header>
          <p className={s.kicker}>
            <Link href="/projects">Projects</Link>
          </p>
          <h1 className={s.title}>{meta.title}</h1>
        </header>
        <dl className={s.facts}>
          {rows.map(([label, value]) => (
            <div key={label} className={s.fact}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <section aria-labelledby="summary-heading" className={s.summary}>
          <h2 id="summary-heading" className="visually-hidden">
            Technical summary
          </h2>
          <p>{meta.summary}</p>
        </section>
        {hasBody(source) && (
          <div className={prose.prose}>
            <Body />
          </div>
        )}
      </article>
    </Page>
  );
}
