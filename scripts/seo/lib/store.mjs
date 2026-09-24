// Local, append-only history for the SEO agent: crawls, metrics, experiments and events live under
// .seo/ (git-ignored). Everything is plain JSON so runs can be diffed, archived or loaded elsewhere.
import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(process.env.SEO_DATA_DIR ?? ".seo");
const dir = (sub) => {
  const d = path.join(ROOT, sub);
  fs.mkdirSync(d, { recursive: true });
  return d;
};

export const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

export function save(sub, name, data) {
  const file = path.join(dir(sub), name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

export function list(sub) {
  const d = dir(sub);
  return fs.readdirSync(d).filter((f) => f.endsWith(".json")).sort();
}

export function load(sub, name) {
  return JSON.parse(fs.readFileSync(path.join(dir(sub), name), "utf8"));
}

export function latest(sub, offset = 0) {
  const files = list(sub);
  const f = files[files.length - 1 - offset];
  return f ? { name: f, data: load(sub, f) } : null;
}

export function event(type, detail) {
  fs.appendFileSync(
    path.join(dir("events"), "events.jsonl"),
    JSON.stringify({ at: new Date().toISOString(), type, ...detail }) + "\n",
  );
}

export function readJson(sub, name, fallback) {
  const file = path.join(dir(sub), name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}
