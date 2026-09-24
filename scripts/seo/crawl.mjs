#!/usr/bin/env node
// SEO crawler/auditor. Crawls a running site (local, preview or production), checks every page
// against technical SEO and accessibility rules, and stores the result as one crawl in .seo/crawls/.
//
//   node scripts/seo/crawl.mjs [--base http://localhost:3000] [--compare]
//
// Canonical URLs are expected on the production origin (SITE_URL / NEXT_PUBLIC_SITE_URL), even when
// crawling localhost or a preview, and are mapped back onto --base for fetching.
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { extract, schemaNodes } from "./lib/html.mjs";
import { event, latest, save, stamp } from "./lib/store.mjs";

export const PRODUCTION = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "https://satnamportfolio.vercel.app").replace(/\/+$/, "");
const SLOW_MS = 1500;
const HEAVY_HTML = 400 * 1024;
const THIN_WORDS = 80;
const DEEP = 3;
const STALE_DAYS = 540;

const norm = (u) => {
  const url = new URL(u);
  url.hash = "";
  url.search = "";
  const p = url.pathname.replace(/\/+$/, "") || "/";
  return p;
};

async function get(url) {
  const chain = [];
  let current = url;
  const started = performance.now();
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(current, { redirect: "manual", headers: { "User-Agent": "SatnamSEOAudit/1.0" } });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      chain.push({ from: current, status: res.status });
      current = new URL(res.headers.get("location"), current).toString();
      continue;
    }
    const body = await res.text();
    return {
      status: res.status,
      finalUrl: current,
      chain,
      ms: Math.round(performance.now() - started),
      bytes: Buffer.byteLength(body),
      type: res.headers.get("content-type") ?? "",
      xRobots: res.headers.get("x-robots-tag"),
      body,
    };
  }
  return { status: 0, finalUrl: current, chain, ms: 0, bytes: 0, type: "", xRobots: null, body: "" };
}

function robotsRules(txt) {
  const rules = [];
  let applies = false;
  for (const line of txt.split("\n")) {
    const [k, ...rest] = line.split(":");
    const v = rest.join(":").trim();
    if (/^user-agent$/i.test(k.trim())) applies = v === "*";
    else if (applies && /^disallow$/i.test(k.trim()) && v) rules.push(v);
  }
  return rules;
}

export async function crawl({ base = process.env.BASE_URL ?? "http://localhost:3000", max = 400 } = {}) {
  base = base.replace(/\/+$/, "");
  const toBase = (u) => u.replace(PRODUCTION, base);
  const robotsRes = await get(`${base}/robots.txt`);
  const disallow = robotsRes.status === 200 ? robotsRules(robotsRes.body) : [];
  const sitemapRes = await get(`${base}/sitemap.xml`);
  const sitemap = [...sitemapRes.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const lastmods = Object.fromEntries(
    [...sitemapRes.body.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map((m) => [norm(m[1]), m[2]]),
  );

  const pages = new Map();
  const inbound = new Map();
  const queue = [{ path: "/", depth: 0 }, ...sitemap.map((u) => ({ path: norm(u), depth: Infinity }))];
  const seen = new Set();

  while (queue.length && pages.size < max) {
    queue.sort((a, b) => a.depth - b.depth);
    const { path, depth } = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    const res = await get(`${base}${path}`);
    const html = res.type.includes("text/html");
    const page = { path, depth, status: res.status, ms: res.ms, bytes: res.bytes, chain: res.chain, xRobots: res.xRobots, inSitemap: sitemap.some((u) => norm(u) === path), lastmod: lastmods[path] };
    if (html && res.status === 200) {
      const x = extract(res.body);
      Object.assign(page, x);
      page.hash = crypto.createHash("sha1").update(x.bodyText).digest("hex");
      delete page.bodyText;
      for (const a of x.anchors) {
        if (!a.href || /^(mailto:|tel:|javascript:|#)/.test(a.href)) continue;
        let target;
        try {
          target = new URL(toBase(a.href), `${base}${path}`);
        } catch {
          continue;
        }
        if (target.origin !== new URL(base).origin) continue;
        const tp = norm(target.toString());
        if (tp.startsWith("/_next") || /\.(png|jpe?g|webp|gif|mp4|svg|ico|txt|xml)$/.test(tp)) continue;
        if (!inbound.has(tp)) inbound.set(tp, []);
        inbound.get(tp).push({ from: path, text: a.text });
        if (!seen.has(tp)) queue.push({ path: tp, depth: depth + 1 });
      }
    }
    pages.set(path, page);
  }

  // Click depth from home (BFS over discovered links).
  const depthOf = new Map([["/", 0]]);
  const bfs = ["/"];
  while (bfs.length) {
    const p = bfs.shift();
    for (const [target, froms] of inbound)
      if (!depthOf.has(target) && froms.some((f) => f.from === p)) {
        depthOf.set(target, depthOf.get(p) + 1);
        bfs.push(target);
      }
  }

  const issues = [];
  const add = (severity, code, path, detail) => issues.push({ severity, code, path, ...(detail ? { detail } : {}) });
  const titles = new Map();
  const descriptions = new Map();
  const hashes = new Map();

  for (const p of pages.values()) {
    p.depth = depthOf.get(p.path) ?? null;
    p.inbound = (inbound.get(p.path) ?? []).filter((l) => l.from !== p.path).length;
    if (p.status >= 400 || p.status === 0) {
      const froms = inbound.get(p.path)?.map((l) => l.from) ?? [];
      add("error", p.inSitemap ? "sitemap-url-broken" : "broken-link", p.path, `HTTP ${p.status}${froms.length ? ` · linked from ${[...new Set(froms)].join(", ")}` : ""}`);
      continue;
    }
    if (p.chain.length > 1) add("warning", "redirect-chain", p.path, p.chain.map((c) => `${c.status} ${c.from}`).join(" → "));
    if (!p.title) continue;
    const noindex = /noindex/i.test(`${p.robots ?? ""} ${p.xRobots ?? ""}`);
    if (noindex && p.inSitemap) add("error", "noindex-in-sitemap", p.path);
    if (noindex) {
      add("info", "noindex", p.path);
      continue;
    }
    if (!p.inSitemap) add("warning", "missing-from-sitemap", p.path);
    if (disallow.some((d) => p.path.startsWith(d))) add("error", "blocked-by-robots", p.path);
    if (!p.description) add("error", "missing-description", p.path);
    if (p.canonicals.length === 0) add("error", "missing-canonical", p.path);
    else if (p.canonicals.length > 1) add("error", "multiple-canonicals", p.path);
    else {
      const c = p.canonicals[0];
      if (!c.startsWith(PRODUCTION)) add("error", "canonical-wrong-origin", p.path, c);
      else if (norm(c) !== p.path) add("warning", "canonical-points-elsewhere", p.path, c);
    }
    const h1s = p.headings.filter((h) => h.level === 1);
    if (h1s.length === 0) add("error", "missing-h1", p.path);
    if (h1s.length > 1) add("warning", "multiple-h1", p.path, h1s.map((h) => h.text).join(" | "));
    const levels = p.headings.map((h) => h.level);
    if (levels.some((l, i) => i > 0 && l - levels[i - 1] > 1)) add("info", "heading-level-skipped", p.path);
    if (!p.og.title && !p.title) add("warning", "missing-og-title", p.path);
    if (!p.og.image) add("warning", "missing-og-image", p.path);
    if (p.jsonld.length === 0) add("warning", "missing-structured-data", p.path);
    for (const b of p.jsonld) if (!b.ok) add("error", "invalid-json-ld", p.path, b.error);
    const nodes = schemaNodes(p);
    const ids = nodes.map((n) => n["@id"]).filter(Boolean);
    if (new Set(ids).size !== ids.length) add("warning", "duplicate-schema-id", p.path);
    for (const img of p.images) if (img.alt === null && !img.hidden) add("error", "image-missing-alt", p.path, img.src);
    for (const b of p.buttons) if (!b.name) add("error", "button-without-name", p.path);
    for (const a of p.anchors) if (a.href && !a.text.trim()) add("warning", "link-without-text", p.path, a.href);
    if (!p.lang) add("error", "missing-lang", p.path);
    if (!p.landmarks.includes("main")) add("warning", "missing-main-landmark", p.path);
    if (p.ms > SLOW_MS) add("warning", "slow-page", p.path, `${p.ms}ms`);
    if (p.bytes > HEAVY_HTML) add("warning", "heavy-html", p.path, `${Math.round(p.bytes / 1024)}KB`);
    if (p.words < THIN_WORDS && p.depth > 1) add("info", "thin-content", p.path, `${p.words} words`);
    if (p.path !== "/" && p.inbound === 0) add("warning", "orphan-page", p.path);
    else if (p.path !== "/" && p.inbound === 1) add("info", "few-inbound-links", p.path);
    if (p.depth !== null && p.depth > DEEP) add("warning", "deep-page", p.path, `depth ${p.depth}`);
    if (p.lastmod && (Date.now() - Date.parse(p.lastmod)) / 864e5 > STALE_DAYS) add("info", "stale-content", p.path, p.lastmod);
    titles.set(p.title, [...(titles.get(p.title) ?? []), p.path]);
    if (p.description) descriptions.set(p.description, [...(descriptions.get(p.description) ?? []), p.path]);
    hashes.set(p.hash, [...(hashes.get(p.hash) ?? []), p.path]);
  }
  for (const [t, ps] of titles) if (ps.length > 1) add("error", "duplicate-title", ps.join(", "), t);
  for (const [d, ps] of descriptions) if (ps.length > 1) add("warning", "duplicate-description", ps.join(", "), d.slice(0, 80));
  for (const [, ps] of hashes) if (ps.length > 1) add("warning", "duplicate-content", ps.join(", "));
  if (robotsRes.status !== 200) add("error", "robots-missing", "/robots.txt");
  if (!/^sitemap:/im.test(robotsRes.body)) add("warning", "robots-no-sitemap", "/robots.txt");
  if (sitemapRes.status !== 200 || !sitemap.length) add("error", "sitemap-missing-or-empty", "/sitemap.xml");
  for (const u of sitemap) if (!u.startsWith(PRODUCTION)) add("error", "sitemap-wrong-origin", u);

  const summary = {
    pages: pages.size,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
  };
  return { at: new Date().toISOString(), base, production: PRODUCTION, summary, issues, pages: [...pages.values()] };
}

export function compare(prev, next) {
  const key = (i) => `${i.code}|${i.path}`;
  const before = new Set(prev.issues.map(key));
  const after = new Set(next.issues.map(key));
  return {
    introduced: next.issues.filter((i) => !before.has(key(i))),
    resolved: prev.issues.filter((i) => !after.has(key(i))),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const base = args[args.indexOf("--base") + 1] && args.includes("--base") ? args[args.indexOf("--base") + 1] : undefined;
  const prev = latest("crawls");
  const result = await crawl({ base });
  const file = save("crawls", `${stamp()}.json`, result);
  event("crawl", { base: result.base, ...result.summary });
  console.log(`Crawled ${result.summary.pages} pages at ${result.base}: ${result.summary.errors} errors, ${result.summary.warnings} warnings, ${result.summary.info} notes.`);
  for (const i of result.issues.filter((i) => i.severity !== "info"))
    console.log(`  ${i.severity.padEnd(7)} ${i.code.padEnd(28)} ${i.path}${i.detail ? ` — ${i.detail}` : ""}`);
  if (args.includes("--compare") && prev) {
    const d = compare(prev.data, result);
    console.log(`\nSince ${prev.name}: ${d.introduced.length} new issues, ${d.resolved.length} resolved.`);
    for (const i of d.introduced) console.log(`  + ${i.code} ${i.path}`);
    for (const i of d.resolved) console.log(`  - ${i.code} ${i.path}`);
  }
  console.log(`Saved ${file}`);
}
