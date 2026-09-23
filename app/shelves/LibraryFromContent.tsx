import { SectionIntro } from "@/components/SectionIntro";
import { Library } from "@/components/shelves/Library";
import { bookVariation } from "@/lib/book-variation";
import { getBooks, NOTE_KINDS, SHELF_CATEGORIES } from "@/lib/content";
import s from "./shelves-page.module.css";

// Shared by /shelves and /shelves/[slug]: both render the whole library; the URL decides which book is open.
export async function LibraryFromContent() {
  const books = await getBooks();
  const data = books.map(({ slug, meta }) => ({
    slug,
    title: meta.title,
    category: meta.category,
    kindLabel: NOTE_KINDS[meta.kind],
    author: meta.author,
    variation: bookVariation(slug, { orientation: meta.orientation }),
  }));
  const notes = Object.fromEntries(books.map(({ slug, Body }) => [slug, <Body key={slug} />]));

  return (
    <div className={s.page}>
      <SectionIntro
        title="Shelves"
        meta={books.length ? `Notes · ${books.length} on the shelves` : "Notes"}
      />
      <Library books={data} categories={SHELF_CATEGORIES} notes={notes} />
    </div>
  );
}
