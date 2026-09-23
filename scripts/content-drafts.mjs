// Shared by check-drafts and publish: finds every draft in the content folders.
import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const SECTIONS = ["roads", "research", "projects", "shelves", "wanderings"];
const META = /export const metadata = \{[\s\S]*?\n\};?/;

export function mdxEntries() {
  return SECTIONS.flatMap((section) => {
    const dir = path.join(ROOT, "content", section);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => {
        const file = path.join(dir, f);
        const source = fs.readFileSync(file, "utf8");
        const meta = source.match(META)?.[0] ?? "";
        return {
          kind: "mdx",
          section,
          slug: f.replace(/\.mdx$/, ""),
          file,
          route: `/${section}/${f.replace(/\.mdx$/, "")}`,
          title: meta.match(/\btitle:\s*"([^"]+)"/)?.[1] ?? null,
          draft: /\bdraft:\s*true\b/.test(meta),
        };
      });
  });
}

export function photoEntries() {
  const file = path.join(ROOT, "content/traces/traces.json");
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8")).photos.map((p) => ({
    kind: "photo",
    section: "traces",
    slug: p.id,
    file,
    route: null,
    title: p.caption ?? null,
    // Image files may be shared with public pages, so a photo is identified by its own words.
    alt: p.alt,
    draft: p.draft === true,
  }));
}

export const allEntries = () => [...mdxEntries(), ...photoEntries()];
