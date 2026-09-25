import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { MDXContent } from "mdx/types";
import { z } from "zod";
import { RESEARCH_FIELDS, type ResearchField } from "./research-fields";

const CONTENT = path.join(process.cwd(), "content");

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");
const draft = z.boolean().optional();

export const roadSchema = z.strictObject({
  title: z.string().min(1),
  date: isoDate,
  description: z.string().min(1),
  category: z.string().min(1),
  readingTime: z.number().int().positive().optional(),
  image: z
    .strictObject({
      src: z.string().startsWith("/"),
      alt: z.string().min(1, "images need meaningful alt text"),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
  draft,
});

export const RESEARCH_STATUSES = ["in progress", "complete"] as const;

export const researchSchema = z.strictObject({
  title: z.string().min(1),
  date: isoDate,
  status: z.enum(RESEARCH_STATUSES).optional(),
  // Co-authors, named on the entry beside the owner.
  collaborators: z.array(z.string().min(1)).optional(),
  // Where the work has been sent, e.g. a conference abstract; shown under the title.
  submission: z.string().min(1).optional(),
  draft,
});

export const PROJECT_STATUSES = ["in progress", "maintained", "complete", "archived"] as const;

export const projectSchema = z.strictObject({
  title: z.string().min(1),
  year: z.number().int().min(1990).max(2100),
  technologies: z.array(z.string().min(1)).min(1),
  status: z.enum(PROJECT_STATUSES),
  repository: z.url().optional(),
  demo: z.url().optional(),
  summary: z.string().min(1),
  draft,
});

export const SHELF_CATEGORIES = [
  "Current Reads",
  "Physics & Mathematics",
  "Engineering & Electronics",
  "Computer Science",
  "Literature",
  "Philosophy",
] as const;

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "use a #rrggbb colour");

// How a real copy's spine looks, so the shelf shows the book rather than a generated one.
// Without it a book gets a deterministic spine in the site's own tones (lib/book-variation.ts).
export const spineSchema = z.strictObject({
  color: hex,
  ink: hex,
  // Rules or bands printed near the head and foot.
  accent: hex.optional(),
  type: z.enum(["serif", "sans"]).optional(),
  // What the spine itself says, when it's shorter than the full title.
  label: z.string().min(1).optional(),
  byline: z.string().min(1).optional(),
  imprint: z.string().min(1).optional(),
  // Size on the shelf in the same units as generated spines: height 100–240, thickness 10–70.
  height: z.number().int().min(100).max(240).optional(),
  thickness: z.number().int().min(10).max(70).optional(),
  // A photo of the actual spine (under /public), drawn instead of the lettering above.
  image: z.string().startsWith("/").optional(),
});

export type Spine = z.infer<typeof spineSchema>;

export const NOTE_KINDS = {
  book: "Book notes",
  notebook: "Notebook",
  scan: "Scanned notes",
  notes: "Typed notes",
  reference: "References",
} as const;

export const bookSchema = z.strictObject({
  title: z.string().min(1),
  category: z.enum(SHELF_CATEGORIES),
  kind: z.enum(
    Object.keys(NOTE_KINDS) as [keyof typeof NOTE_KINDS, ...(keyof typeof NOTE_KINDS)[]],
  ),
  author: z.string().min(1).optional(),
  // Publication line shown in the reader, e.g. "Morgan Kaufmann, 4th edition, 2022".
  published: z.string().min(1).optional(),
  link: z.url().optional(),
  // Lower numbers sit further left on the shelf.
  order: z.number().optional(),
  orientation: z.enum(["upright", "leaning", "flat"]).optional(),
  spine: spineSchema.optional(),
  draft,
});

// Wanderings: thoughts and fragments. Untitled is normal.
export const wanderingSchema = z.strictObject({
  title: z.string().min(1).optional(),
  date: isoDate,
  // An optional closing piece drawn after the essay (see components/wanderings/Unravel).
  ending: z.enum(["feynman"]).optional(),
  draft,
});

export { RESEARCH_FIELDS, type ResearchField };
const FIELD_ORDER: readonly string[] = RESEARCH_FIELDS.map(([k]) => k);

type Section = "roads" | "research" | "projects" | "shelves" | "wanderings";

function includeDrafts() {
  return process.env.NODE_ENV !== "production" || process.env.INCLUDE_DRAFTS === "1";
}

function files(section: Section) {
  const dir = path.join(CONTENT, section);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => ({ slug: f.replace(/\.mdx$/, ""), file: path.join(dir, f) }));
}

function importMdx(section: Section, slug: string) {
  // Literal prefixes keep each section's bundle context to its own folder.
  const load =
    section === "roads"
      ? import(`@/content/roads/${slug}.mdx`)
      : section === "research"
        ? import(`@/content/research/${slug}.mdx`)
        : section === "projects"
          ? import(`@/content/projects/${slug}.mdx`)
          : section === "shelves"
            ? import(`@/content/shelves/${slug}.mdx`)
            : import(`@/content/wanderings/${slug}.mdx`);
  return load as Promise<{ default: MDXContent; metadata?: unknown }>;
}

function parse<T extends z.ZodType>(schema: T, data: unknown, where: string): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid metadata in ${where}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

// Prose-only text: drop the metadata export, code fences, JSX tags and markdown punctuation.
export function proseText(source: string) {
  return (
    source
      .replace(/^export const metadata = \{[\s\S]*?\n\};?\s*$/m, "")
      // MDX imports (a component used by one entry only) aren't prose.
      .replace(/^import .* from ["'][^"']+["'];?\s*$/gm, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[#>*_`~\[\]()!|-]/g, " ")
  );
}

export function readingMinutes(source: string, wpm = 225) {
  return Math.max(1, Math.ceil(wordCount(source) / wpm));
}

export function researchFields(source: string, where: string): ResearchField[] {
  const found = [...source.matchAll(/<Field\s+name="([^"]+)"/g)].map((m) => m[1]);
  let last = -1;
  for (const name of found) {
    const index = FIELD_ORDER.indexOf(name);
    if (index === -1) throw new Error(`${where}: unknown research field "${name}"`);
    if (index <= last) {
      throw new Error(`${where}: research field "${name}" is duplicated or out of order`);
    }
    last = index;
  }
  return found as ResearchField[];
}

export function fieldText(source: string, field: ResearchField) {
  const m = source.match(new RegExp(`<Field\\s+name="${field}"\\s*>([\\s\\S]*?)</Field>`));
  return m ? proseText(m[1]).replace(/\s+/g, " ").trim() : null;
}

export function hasBody(source: string) {
  return proseText(source).trim().length > 0;
}

async function load<T extends z.ZodType>(section: Section, schema: T) {
  const entries = await Promise.all(
    files(section).map(async ({ slug, file }) => {
      const where = `content/${section}/${slug}.mdx`;
      const mod = await importMdx(section, slug);
      const meta = parse(schema, mod.metadata, where);
      return { slug, meta, Body: mod.default, source: fs.readFileSync(file, "utf8"), where };
    }),
  );
  return entries.filter((e) => includeDrafts() || !(e.meta as { draft?: boolean }).draft);
}

export async function getRoads() {
  const entries = await load("roads", roadSchema);
  return entries
    .map((e) => ({ ...e, minutes: e.meta.readingTime ?? readingMinutes(e.source) }))
    .sort((a, b) => b.meta.date.localeCompare(a.meta.date));
}

export async function getResearch() {
  const entries = await load("research", researchSchema);
  return entries
    .map((e) => ({ ...e, fields: researchFields(e.source, e.where) }))
    .sort((a, b) => b.meta.date.localeCompare(a.meta.date))
    .map((e, i, all) => ({ ...e, number: all.length - i }));
}

export async function getProjects() {
  const entries = await load("projects", projectSchema);
  return entries.sort(
    (a, b) => b.meta.year - a.meta.year || a.meta.title.localeCompare(b.meta.title),
  );
}

export async function getBooks() {
  const entries = await load("shelves", bookSchema);
  return entries.sort(
    (a, b) => (a.meta.order ?? 0) - (b.meta.order ?? 0) || a.meta.title.localeCompare(b.meta.title),
  );
}

export function wordCount(source: string) {
  return proseText(source).match(/[\p{L}\p{N}'’]+/gu)?.length ?? 0;
}

// The first words of an entry, for untitled fragments and previews.
export function opening(source: string, words: number) {
  const all = proseText(source).replace(/\s+/g, " ").trim().split(" ");
  return all.slice(0, words).join(" ") + (all.length > words ? "…" : "");
}

export async function getWanderings() {
  const entries = await load("wanderings", wanderingSchema);
  return entries
    .map((e) => ({ ...e, words: wordCount(e.source) }))
    .sort((a, b) => b.meta.date.localeCompare(a.meta.date));
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/**
 * generateStaticParams() for a detail route. The static GitHub Pages export refuses a dynamic route
 * with zero pages (a section whose entries are all drafts), so there it emits one placeholder that
 * renders the 404 page; the Pages workflow deletes it from the output. Vercel builds are unaffected.
 */
export function staticParams(slugs: string[]) {
  if (slugs.length || process.env.GITHUB_PAGES !== "1") return slugs.map((slug) => ({ slug }));
  return [{ slug: "__empty" }];
}

/**
 * The author's own opening sentences, character for character (no markdown, headings, links'
 * addresses or components), cut at a sentence end near `max` characters. Used as a page's
 * description so search engines and AI answers quote the actual words.
 */
export function excerpt(source: string, max = 160) {
  const body = source
    .replace(/^export const metadata = \{[\s\S]*?\n\};?\s*$/m, "")
    // MDX imports (a component used by one entry only) aren't prose.
    .replace(/^import .* from ["'][^"']+["'];?\s*$/gm, "")
    .replace(/^#{1,6} .*$/gm, "")
    .replace(/<[A-Z][^>]*\/>/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|__/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (body.length <= max) return body;
  const cut = body.slice(0, max + 80);
  const end = Math.max(cut.lastIndexOf(". ", max + 40), cut.lastIndexOf("? ", max + 40));
  return end > 60 ? cut.slice(0, end + 1) : `${body.slice(0, body.lastIndexOf(" ", max))}…`;
}
