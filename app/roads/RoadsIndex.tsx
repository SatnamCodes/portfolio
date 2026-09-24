"use client";

import { useEffect, useRef, useState } from "react";
import { PageLink as Link } from "@/components/PageLink";
import s from "./roads.module.css";

export type RoadEntry = {
  slug: string;
  title: string;
  description: string;
  category: string;
  date: string;
  displayDate: string;
  minutes: number;
};

// Categories come from what has been written, so a new one appears with its first road.
export function RoadsIndex({ roads }: { roads: RoadEntry[] }) {
  const categories = [...new Set(roads.map((r) => r.category))].sort();
  const [category, setCategory] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  // Opening search is asking to type, so the field takes focus.
  useEffect(() => {
    if (searching) input.current?.focus();
  }, [searching]);

  const q = query.trim().toLowerCase();
  const shown = roads.filter(
    (r) =>
      (!category || r.category === category) &&
      (!q || `${r.title} ${r.description} ${r.category}`.toLowerCase().includes(q)),
  );
  const years = [...new Set(shown.map((r) => r.date.slice(0, 4)))];

  const closeSearch = () => {
    setSearching(false);
    setQuery("");
  };

  return (
    <>
      <div className={s.tools}>
        <ul className={s.categories} aria-label="Categories">
          {[null, ...categories].map((c) => (
            <li key={c ?? "all"}>
              <button
                type="button"
                className={s.tool}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c ?? "All"}
              </button>
            </li>
          ))}
        </ul>
        <div className={s.search} role="search">
          {searching && (
            <input
              ref={input}
              type="search"
              className={s.query}
              placeholder="Search blogs"
              aria-label="Search blogs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && closeSearch()}
            />
          )}
          <button
            type="button"
            className={s.tool}
            aria-expanded={searching}
            onClick={() => (searching ? closeSearch() : setSearching(true))}
          >
            {searching ? "Close" : "Search"}
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className={s.none}>Nothing on this road matches yet.</p>
      ) : (
        years.map((year) => (
          <section key={year} className={s.year} aria-labelledby={`year-${year}`}>
            <h2 id={`year-${year}`} className={s.yearLabel}>
              {year}
            </h2>
            <ol className={`${s.contents} stagger`}>
              {shown
                .filter((r) => r.date.startsWith(year))
                .map((road, i) => (
                  <li
                    key={road.slug}
                    className={s.entry}
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <time className={s.date} dateTime={road.date}>
                      {road.displayDate}
                    </time>
                    <div className={s.main}>
                      <h3 className={s.title}>
                        <Link href={`/roads/${road.slug}`} className={s.link}>
                          {road.title}
                        </Link>
                      </h3>
                      <p className={s.description}>{road.description}</p>
                    </div>
                    <p className={s.aside}>
                      <span>{road.category}</span>
                      <span>{road.minutes} min read</span>
                    </p>
                  </li>
                ))}
            </ol>
          </section>
        ))
      )}
    </>
  );
}
