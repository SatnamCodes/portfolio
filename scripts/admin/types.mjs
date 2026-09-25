// What each kind of content is made of: the form fields, and how they become an MDX file.
// Mirrors the zod schemas in lib/content.ts; the site's build re-checks everything anyway.
export const RESEARCH_FIELDS = [
  ["question", "Question"],
  ["motivation", "Motivation"],
  ["background", "Background"],
  ["method", "Method"],
  ["experiment", "Experiment"],
  ["results", "Results"],
  ["visualizations", "Visualizations"],
  ["discussion", "Discussion"],
  ["limitations", "Limitations"],
  ["reflection", "Reflection"],
  ["references", "References"],
];

const draft = { name: "draft", label: "Keep as draft (not published)", type: "checkbox" };
const date = { name: "date", label: "Date", type: "date", required: true };

export const TYPES = {
  roads: {
    label: "Essay (Roads)",
    dir: "content/roads",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      date,
      {
        name: "description",
        label: "One-line description (shown in search results)",
        type: "text",
        required: true,
      },
      { name: "category", label: "Category", type: "text", required: true },
      draft,
    ],
    body: "markdown",
  },
  research: {
    label: "Research entry",
    dir: "content/research",
    fields: [{ name: "title", label: "Title", type: "text", required: true }, date, draft],
    body: "research",
  },
  projects: {
    label: "Project",
    dir: "content/projects",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "year", label: "Year", type: "number", required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: ["in progress", "maintained", "complete", "archived"],
        required: true,
      },
      { name: "technologies", label: "Built with (comma separated)", type: "list", required: true },
      { name: "repository", label: "Repository URL", type: "url" },
      { name: "demo", label: "Live demo URL", type: "url" },
      {
        name: "summary",
        label: "Summary (one paragraph: what it is, how it works, where it stands)",
        type: "textarea",
        required: true,
      },
      draft,
    ],
    body: "markdown",
    bodyLabel: "Write-up (optional)",
  },
  shelves: {
    label: "Book or notes (Shelves)",
    dir: "content/shelves",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      {
        name: "category",
        label: "Shelf",
        type: "select",
        options: [
          "Current Reads",
          "Physics & Mathematics",
          "Engineering & Electronics",
          "Computer Science",
          "Literature",
          "Philosophy",
        ],
        required: true,
      },
      {
        name: "kind",
        label: "Kind",
        type: "select",
        options: ["book", "notebook", "notes", "reference", "scan"],
        required: true,
      },
      { name: "author", label: "Author(s)", type: "text" },
      { name: "published", label: "Publisher, edition, year", type: "text" },
      { name: "link", label: "Link to the book", type: "url" },
      { name: "order", label: "Position on the shelf (lower = further left)", type: "number" },
      draft,
    ],
    body: "markdown",
    bodyLabel: "Your notes",
  },
  wanderings: {
    label: "Thought (Wanderings)",
    dir: "content/wanderings",
    fields: [
      { name: "title", label: "Title (optional: untitled is normal)", type: "text" },
      date,
      { name: "ending", label: "Closing animation", type: "select", options: ["", "feynman"] },
      draft,
    ],
    body: "markdown",
  },
};

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** Form values → file contents. */
export function toMdx(type, values) {
  const t = TYPES[type];
  const meta = {};
  for (const f of t.fields) {
    let v = values[f.name];
    if (f.type === "checkbox") {
      if (v) meta[f.name] = true;
      continue;
    }
    if (v === undefined || v === null || v === "") continue;
    if (f.type === "number") v = Number(v);
    if (f.type === "list")
      v = String(v)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    meta[f.name] = v;
  }
  let body = "";
  if (t.body === "research") {
    body = RESEARCH_FIELDS.filter(([k]) => values.sections?.[k]?.trim())
      .map(([k]) => `<Field name="${k}">\n\n${values.sections[k].trim()}\n\n</Field>`)
      .join("\n\n");
  } else body = (values.body ?? "").trim();
  return `export const metadata = ${JSON.stringify(meta, null, 2)};\n${body ? `\n${body}\n` : ""}`;
}

/** File contents → form values (for editing). */
export function fromMdx(type, src) {
  const m = src.match(/export const metadata = (\{[\s\S]*?\n\});/);
  // Our own files, read locally: the object literal is evaluated as JavaScript.
  const meta = m ? new Function(`return (${m[1]})`)() : {};
  const rest = m ? src.slice(src.indexOf(m[0]) + m[0].length).trim() : src;
  const values = { ...meta };
  if (Array.isArray(values.technologies)) values.technologies = values.technologies.join(", ");
  if (TYPES[type].body === "research") {
    values.sections = {};
    for (const x of rest.matchAll(/<Field name="([a-z]+)">\s*([\s\S]*?)\s*<\/Field>/g))
      values.sections[x[1]] = x[2];
  } else values.body = rest;
  return values;
}

export function validate(type, values) {
  const t = TYPES[type];
  const errors = [];
  for (const f of t.fields) {
    const v = values[f.name];
    if (f.required && (v === undefined || v === null || String(v).trim() === ""))
      errors.push(`${f.label} is required.`);
    if (f.type === "date" && v && !/^\d{4}-\d{2}-\d{2}$/.test(v))
      errors.push(`${f.label} must be YYYY-MM-DD.`);
    if (f.type === "url" && v && !/^https?:\/\/\S+$/.test(v))
      errors.push(`${f.label} must be a full URL (https://…).`);
    if (f.type === "select" && v && !f.options.includes(v))
      errors.push(`${f.label} must be one of: ${f.options.join(", ")}.`);
  }
  if (t.body === "research" && !Object.values(values.sections ?? {}).some((s) => String(s).trim()))
    errors.push("Write at least one section.");
  return errors;
}
