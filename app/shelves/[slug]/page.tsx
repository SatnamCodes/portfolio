import type { Metadata } from "next";
import { Page } from "@/components/Page";
import { JsonLd } from "@/components/seo/JsonLd";
import { getBooks, opening, staticParams } from "@/lib/content";
import { book as bookNode, breadcrumbs, webPage } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { LibraryFromContent } from "../LibraryFromContent";

export const dynamicParams = false;

export async function generateStaticParams() {
  return staticParams((await getBooks()).map((x) => x.slug));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = (await getBooks()).find((b) => b.slug === slug);
  if (!book) return {};
  return pageMetadata({
    title: `${book.meta.title} — Shelves`,
    description: [
      book.meta.author && `Notes on ${book.meta.title} by ${book.meta.author}.`,
      opening(book.source, 26),
    ]
      .filter(Boolean)
      .join(" "),
    path: `/shelves/${book.slug}`,
  });
}

export default async function OpenBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = (await getBooks()).find((b) => b.slug === slug);
  const path = `/shelves/${slug}`;
  return (
    <Page>
      {book && (
        <JsonLd
          nodes={[
            webPage(path, book.meta.title, opening(book.source, 26)),
            breadcrumbs([
              { name: "Shelves", path: "/shelves" },
              { name: book.meta.title, path },
            ]),
            ...(book.meta.kind === "book"
              ? [
                  bookNode({
                    path,
                    title: book.meta.title,
                    author: book.meta.author,
                    link: book.meta.link,
                  }),
                ]
              : []),
          ]}
        />
      )}
      <LibraryFromContent />
    </Page>
  );
}
