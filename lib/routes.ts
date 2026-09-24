import "server-only";
import { getBooks, getProjects, getResearch, getRoads, getWanderings, opening } from "./content";

// Every public, indexable URL on the site, with what we genuinely know about it. The sitemap,
// llms.txt and the SEO tests all read from here, so a new page is picked up everywhere at once.
export type PublicRoute = {
  path: string;
  title: string;
  section: string;
  description?: string;
  // Only real dates from content metadata; never invented.
  lastModified?: string;
};

export const SECTIONS: PublicRoute[] = [
  { path: "/", title: "Home", section: "Home" },
  { path: "/roads", title: "Roads", section: "Roads", description: "Essays." },
  {
    path: "/research",
    title: "Research",
    section: "Research",
    description: "A numbered, dated research notebook.",
  },
  {
    path: "/projects",
    title: "Projects",
    section: "Projects",
    description: "Built work, with GitHub, LeetCode and Codeforces activity.",
  },
  { path: "/shelves", title: "Shelves", section: "Shelves", description: "Notes on books." },
  {
    path: "/wanderings",
    title: "Wanderings",
    section: "Wanderings",
    description: "Thoughts, fragments and questions.",
  },
  { path: "/traces", title: "Traces", section: "Traces", description: "Astrophotography." },
  {
    path: "/new-beginnings",
    title: "New Beginnings",
    section: "About",
    description: "The owner's story, in chapters.",
  },
  {
    path: "/post",
    title: "Post",
    section: "Contact",
    description: "Write a letter; LinkedIn and X links.",
  },
];

export async function publicRoutes(): Promise<PublicRoute[]> {
  const [roads, research, projects, books, wanderings] = await Promise.all([
    getRoads(),
    getResearch(),
    getProjects(),
    getBooks(),
    getWanderings(),
  ]);
  const newest = (dates: string[]) => dates.sort().at(-1);
  const withDates = SECTIONS.map((r) =>
    r.path === "/roads"
      ? { ...r, lastModified: newest(roads.map((x) => x.meta.date)) }
      : r.path === "/research"
        ? { ...r, lastModified: newest(research.map((x) => x.meta.date)) }
        : r.path === "/wanderings"
          ? { ...r, lastModified: newest(wanderings.map((x) => x.meta.date)) }
          : r,
  );
  return [
    ...withDates,
    ...roads.map((r) => ({
      path: `/roads/${r.slug}`,
      title: r.meta.title,
      section: "Roads",
      description: r.meta.description,
      lastModified: r.meta.date,
    })),
    ...research.map((r) => ({
      path: `/research/${r.slug}`,
      title: r.meta.title,
      section: "Research",
      description: opening(r.source, 30),
      lastModified: r.meta.date,
    })),
    ...projects.map((p) => ({
      path: `/projects/${p.slug}`,
      title: p.meta.title,
      section: "Projects",
      description: p.meta.summary,
    })),
    ...books.map((b) => ({
      path: `/shelves/${b.slug}`,
      title: b.meta.title,
      section: "Shelves",
      description: b.meta.author ? `${b.meta.title}, by ${b.meta.author}.` : undefined,
    })),
    ...wanderings.map((w) => ({
      path: `/wanderings/${w.slug}`,
      title: w.meta.title ?? opening(w.source, 8),
      section: "Wanderings",
      description: opening(w.source, 30),
      lastModified: w.meta.date,
    })),
  ];
}
