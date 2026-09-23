// The explicit publish step: promote a draft to public by removing its draft flag.
//   npm run publish -- content/roads/my-essay.mdx
//   npm run publish -- traces:photo-id
//   npm run publish -- --list
import fs from "node:fs";
import path from "node:path";
import { ROOT, allEntries } from "./content-drafts.mjs";

const arg = process.argv[2];
const drafts = allEntries().filter((e) => e.draft);

if (!arg || arg === "--list") {
  if (!drafts.length) console.log("No drafts.");
  for (const d of drafts) console.log(d.kind === "photo" ? `traces:${d.slug}` : path.relative(ROOT, d.file));
  process.exit(0);
}

if (arg.startsWith("traces:")) {
  const id = arg.slice("traces:".length);
  const file = path.join(ROOT, "content/traces/traces.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const photo = data.photos.find((p) => p.id === id);
  if (!photo) throw new Error(`No photo with id "${id}".`);
  if (!photo.draft) {
    console.log(`traces:${id} is already public.`);
    process.exit(0);
  }
  delete photo.draft;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.log(`Published traces:${id}. Review, commit and push to deploy.`);
  process.exit(0);
}

const file = path.resolve(ROOT, arg);
if (!fs.existsSync(file)) throw new Error(`No such file: ${arg}`);
const source = fs.readFileSync(file, "utf8");
const next = source.replace(/^\s*draft:\s*true,?\s*\n/m, "");
if (next === source) {
  console.log(`${arg} has no draft flag; it is already public.`);
} else {
  fs.writeFileSync(file, next);
  console.log(`Published ${arg}. Review, commit and push to deploy.`);
}
