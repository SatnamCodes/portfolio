#!/usr/bin/env node
// After a production deploy: diff the live sitemap against the last snapshot and tell IndexNow about
// new, changed (lastmod) and removed URLs, through the site's authenticated endpoint.
//   SEO_ADMIN_TOKEN=... node scripts/seo/indexnow.mjs [--dry-run]
import { PRODUCTION } from "./crawl.mjs";
import { event, readJson, save } from "./lib/store.mjs";

const xml = await (await fetch(`${PRODUCTION}/sitemap.xml`)).text();
const now = Object.fromEntries([...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map((m) => [m[1], m[2] ?? ""]));
const before = readJson("indexnow", "snapshot.json", {});
const changed = Object.keys(now).filter((u) => before[u] === undefined || before[u] !== now[u]);
const removed = Object.keys(before).filter((u) => !(u in now));
const paths = [...changed, ...removed].map((u) => new URL(u).pathname);
console.log(`${changed.length} new/changed, ${removed.length} removed.`);
if (!paths.length || process.argv.includes("--dry-run")) process.exit(0);
if (!process.env.SEO_ADMIN_TOKEN) throw new Error("SEO_ADMIN_TOKEN is required");
const res = await fetch(`${PRODUCTION}/api/seo/indexnow`, {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.SEO_ADMIN_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ paths }),
});
const result = await res.json().catch(() => ({}));
event("indexnow", { status: res.status, changed: changed.length, removed: removed.length, result });
if (res.ok) save("indexnow", "snapshot.json", now);
console.log(res.status, result);
