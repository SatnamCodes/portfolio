// Runs after `next build` (npm "postbuild"). Fails the build if anything marked draft reached the output.
import fs from "node:fs";
import path from "node:path";
import { ROOT, allEntries } from "./content-drafts.mjs";

const fail = (msg) => {
  console.error(`\n✖ Draft safeguard: ${msg}\n`);
  process.exit(1);
};

const includeDrafts = process.env.INCLUDE_DRAFTS === "1";
if (includeDrafts && process.env.VERCEL_ENV === "production") {
  fail("INCLUDE_DRAFTS=1 is set on a production deployment. Remove it from the Vercel environment.");
}

const entries = allEntries();
const drafts = entries.filter((e) => e.draft);
const published = entries.filter((e) => !e.draft);

const bySection = (list) => {
  const counts = {};
  for (const e of list) counts[e.section] = (counts[e.section] ?? 0) + 1;
  return Object.entries(counts).map(([s, n]) => `${s} ${n}`).join(", ") || "none";
};
console.log(`\nContent: publishing ${published.length} (${bySection(published)})`);
if (drafts.length) {
  console.log(`Held back as drafts: ${drafts.length}`);
  for (const d of drafts) console.log(`  · ${path.relative(ROOT, d.file)}${d.kind === "photo" ? ` #${d.slug}` : ""}`);
}

if (includeDrafts) {
  console.log("INCLUDE_DRAFTS=1: drafts are intentionally included in this local build; skipping the leak scan.\n");
  process.exit(0);
}

const out = path.join(ROOT, ".next/server/app");
if (!fs.existsSync(out)) fail(".next/server/app not found; run this after `next build`.");

const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(html|rsc|body|meta|segments|json)$/.test(f.name) || !path.extname(f.name)) files.push(p);
  }
})(out);

const leaks = [];
for (const d of drafts) {
  if (d.route) {
    const base = path.join(out, d.route);
    for (const ext of [".html", ".rsc", ".meta", ".body"]) {
      if (fs.existsSync(base + ext)) leaks.push(`${d.route} was prerendered (${path.relative(ROOT, base + ext)})`);
    }
  }
}
const needles = drafts.flatMap((d) => [d.title && d.title.length >= 12 ? d.title : null, d.alt ?? null].filter(Boolean));
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const needle of needles) {
    if (text.includes(needle)) leaks.push(`"${needle}" appears in ${path.relative(ROOT, file)}`);
  }
}

if (leaks.length) fail(`${leaks.length} draft item(s) reached the build output:\n  ${[...new Set(leaks)].join("\n  ")}`);
console.log(`Draft safeguard: scanned ${files.length} output files; no drafts found. ✓\n`);
