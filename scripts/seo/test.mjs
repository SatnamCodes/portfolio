#!/usr/bin/env node
// SEO regression tests: fail (exit 1) when critical discovery infrastructure breaks. Run against a
// production build: `npm run build && npm start` then `npm run seo:test` (CI does exactly this).
import { crawl, PRODUCTION } from "./crawl.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const failures = [];
const check = (ok, msg) => (ok ? console.log(`  ✓ ${msg}`) : (failures.push(msg), console.log(`  ✗ ${msg}`)));
const get = (p) => fetch(`${BASE}${p}`, { redirect: "manual" });

console.log(`SEO tests against ${BASE} (production origin ${PRODUCTION})`);

const robots = await get("/robots.txt");
const robotsTxt = await robots.text();
check(robots.status === 200 && robots.headers.get("content-type")?.includes("text/plain"), "robots.txt is 200 text/plain");
check(/^User-Agent:\s*\*/im.test(robotsTxt) && /^Allow:\s*\/\s*$/im.test(robotsTxt), "robots.txt allows all crawlers");
check(robotsTxt.includes(`Sitemap: ${PRODUCTION}/sitemap.xml`), "robots.txt points at the production sitemap");
check(!/^Disallow:\s*\/\s*$/im.test(robotsTxt), "robots.txt does not block the whole site");

const sm = await get("/sitemap.xml");
const smXml = await sm.text();
const locs = [...smXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
check(sm.status === 200 && sm.headers.get("content-type")?.includes("xml"), "sitemap.xml is 200 XML");
check(smXml.startsWith("<?xml") && smXml.includes("<urlset") && locs.length > 5, `sitemap.xml is a valid urlset (${locs.length} URLs)`);
check(locs.every((u) => u.startsWith(`${PRODUCTION}/`) || u === `${PRODUCTION}/`), "every sitemap URL uses the production origin");
check(!locs.some((u) => /\/api\/|\/style-guide|\/indexnow/.test(u)), "no private or internal routes in the sitemap");
check(new Set(locs).size === locs.length, "no duplicate sitemap URLs");

const llms = await get("/llms.txt");
check(llms.status === 200 && (await llms.text()).startsWith("# "), "llms.txt is served");

const missing = await get("/definitely-not-a-page");
check(missing.status === 404, "unknown URLs return 404");
const slash = await get("/projects/");
check([301, 308].includes(slash.status), "trailing slash redirects permanently");
const api = await fetch(`${BASE}/api/post`, { method: "GET" });
check((api.headers.get("x-robots-tag") ?? "").includes("noindex"), "API responses carry X-Robots-Tag: noindex");
const guide = await get("/style-guide");
check((await guide.text()).includes("noindex"), "style guide is noindex");

const result = await crawl({ base: BASE });
const codes = (c) => result.issues.filter((i) => i.code === c);
for (const code of ["missing-canonical", "multiple-canonicals", "canonical-wrong-origin", "missing-description", "missing-h1", "duplicate-title", "invalid-json-ld", "broken-link", "sitemap-url-broken", "noindex-in-sitemap", "blocked-by-robots", "image-missing-alt", "button-without-name", "missing-lang"])
  check(codes(code).length === 0, `no ${code}${codes(code).length ? `: ${codes(code).map((i) => i.path).join(", ")}` : ""}`);
const indexable = result.pages.filter((p) => p.inSitemap && p.status === 200);
check(indexable.every((p) => p.jsonld?.length), "every sitemap page has JSON-LD");
check(indexable.every((p) => !/noindex/.test(p.robots ?? "")), "no accidental noindex on public pages");

console.log(failures.length ? `\n${failures.length} SEO test(s) failed.` : "\nAll SEO tests passed.");
process.exit(failures.length ? 1 : 0);
