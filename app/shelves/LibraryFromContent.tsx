import { PageLink } from "@/components/PageLink";
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
    source: meta.published || meta.link ? { detail: meta.published, link: meta.link } : undefined,
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
      {/* Every note as a plain link: the shelves are an interactive toy, this is the index that
          readers, keyboards and crawlers can always rely on. */}
      {data.length > 0 && (
        <nav className={s.index} aria-labelledby="notes-index">
          <h2 id="notes-index" className={s.indexTitle}>
            Index of notes
          </h2>
          {SHELF_CATEGORIES.filter((c) => data.some((b) => b.category === c)).map((category) => (
            <section key={category} className={s.indexGroup}>
              <h3 className={s.indexCategory}>{category}</h3>
              <ul>
                {data
                  .filter((b) => b.category === category)
                  .map((b) => (
                    <li key={b.slug}>
                      <PageLink href={`/shelves/${b.slug}`}>{b.title}</PageLink>
                      {b.author && <span className={s.indexAuthor}> · {b.author}</span>}
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </nav>
      )}
    </div>
  );
}
