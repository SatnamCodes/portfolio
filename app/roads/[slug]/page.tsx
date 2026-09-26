import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import Image from "next/image";
import { PageLink as Link } from "@/components/PageLink";
import { notFound } from "next/navigation";
import { Page } from "@/components/Page";
import { formatDate, getRoads, staticParams } from "@/lib/content";
import { article, breadcrumbs, webPage } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { shareCard } from "@/lib/share";
import prose from "@/styles/prose.module.css";
import s from "../article.module.css";

export const dynamicParams = false;

export async function generateStaticParams() {
  return staticParams((await getRoads()).map((x) => x.slug));
}

async function find(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  return (await getRoads()).find((r) => r.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const road = await find(params);
  if (!road) return {};
  return pageMetadata({
    title: road.meta.title,
    description: road.meta.description,
    path: `/roads/${road.slug}`,
    type: "article",
    published: road.meta.date,
    image: shareCard("roads", road.slug, road.meta.title),
  });
}

export default async function RoadPage({ params }: { params: Promise<{ slug: string }> }) {
  const road = await find(params);
  if (!road) notFound();
  const { meta, Body, minutes } = road;
  const path = `/roads/${road.slug}`;

  return (
    <Page>
      <JsonLd
        nodes={[
          webPage(path, meta.title, meta.description),
          breadcrumbs([
            { name: "Roads", path: "/roads" },
            { name: meta.title, path },
          ]),
          article({
            path,
            title: meta.title,
            description: meta.description,
            date: meta.date,
            section: meta.category,
            image: meta.image?.src,
          }),
        ]}
      />
      <article className={s.article}>
        <header className={s.header}>
          <p className={s.kicker}>
            <Link href="/roads">Roads</Link>
            <span aria-hidden="true"> · </span>
            {meta.category}
          </p>
          <h1 className={s.title}>{meta.title}</h1>
          <p className={s.lead}>{meta.description}</p>
          <p className={s.meta}>
            <time dateTime={meta.date}>{formatDate(meta.date)}</time>
            <span aria-hidden="true"> · </span>
            {minutes} min read
          </p>
        </header>
        {meta.image && (
          <figure className={s.figure}>
            <Image
              src={meta.image.src}
              alt={meta.image.alt}
              width={meta.image.width}
              height={meta.image.height}
              sizes="(min-width: 90rem) 60rem, (min-width: 48rem) 70vw, 100vw"
              priority
            />
          </figure>
        )}
        <div className={prose.prose}>
          <Body />
        </div>
      </article>
    </Page>
  );
}
