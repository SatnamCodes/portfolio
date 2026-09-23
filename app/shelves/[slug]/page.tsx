import type { Metadata } from "next";
import { Page } from "@/components/Page";
import { getBooks } from "@/lib/content";
import { LibraryFromContent } from "../LibraryFromContent";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getBooks()).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = (await getBooks()).find((b) => b.slug === slug);
  return book ? { title: `${book.meta.title} — Shelves` } : {};
}

export default function OpenBookPage() {
  return (
    <Page>
      <LibraryFromContent />
    </Page>
  );
}
