#!/usr/bin/env node
// AEO (answer-engine) auditor. Reads the latest crawl and asks, per page, the twelve questions an
// answer engine implicitly asks. The scores are INTERNAL DIAGNOSTICS for prioritising work, not
// Google rankings and not any official "AI score".
import { pathToFileURL } from "node:url";
import { schemaNodes } from "./lib/html.mjs";
import { latest, save, stamp } from "./lib/store.mjs";

const VAGUE = /\b(world-class|cutting-edge|revolutionary|next-gen|best-in-class|synergy|game-changing)\b/i;

export function auditPage(p) {
  const nodes = schemaNodes(p);
  const h1 = p.headings.find((h) => h.level === 1)?.text ?? "";
  const subheads = p.headings.filter((h) => h.level > 1 && !h.hidden);
  const types = nodes.map((n) => n["@type"]);
  const hasAuthor = nodes.some((n) => n.author || n["@type"] === "Person");
  const dated = p.times.length > 0 || nodes.some((n) => n.datePublished);
  const headline = nodes.find((n) => n.headline || n.name)?.headline;
  const internalTargets = new Set(p.anchors.map((a) => a.href).filter((h) => h?.startsWith("/")));
  const checks = {
    answersDirectly: p.firstParagraph.split(" ").length >= 12 || (p.description ?? "").length >= 60,
    definesConcepts: /\b(is|are) (a|an|the)\b/i.test(`${p.firstParagraph} ${p.description ?? ""}`),
    unambiguousEntities: types.some((t) => ["Person", "SoftwareSourceCode", "Book", "BlogPosting", "Article", "ImageGallery", "ProfilePage", "CollectionPage", "ItemList", "ContactPage"].includes(t)),
    supportedFacts: p.anchors.some((a) => /^https?:/.test(a.href ?? "")) || types.includes("CollectionPage"),
    descriptiveHeadings: h1.length > 3 && subheads.every((h) => h.text.split(" ").length >= 1),
    extractable: p.words >= 40 && !VAGUE.test(p.firstParagraph),
    authorIdentifiable: hasAuthor,
    datesClear: dated || !types.some((t) => ["BlogPosting", "Article"].includes(t)),
    contentInHtml: p.words >= 25,
    relatedLinked: internalTargets.size >= 3,
    schemaMatchesVisible: !headline || headline.trim() === h1.trim(),
    current: !p.lastmod || (Date.now() - Date.parse(p.lastmod)) / 864e5 < 540,
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return {
    path: p.path,
    diagnostic: Math.round((passed / Object.keys(checks).length) * 100),
    failed: Object.entries(checks).filter(([, v]) => !v).map(([k]) => k),
  };
}

export function audit(crawlData) {
  const pages = crawlData.pages.filter((p) => p.status === 200 && p.title && !/noindex/i.test(`${p.robots ?? ""}`));
  const results = pages.map((p) => auditPage(p)).sort((a, b) => a.diagnostic - b.diagnostic);
  const coverage = pages.filter((p) => p.jsonld.length).length / Math.max(1, pages.length);
  return {
    at: new Date().toISOString(),
    note: "Internal diagnostic scores for prioritisation only. Not a search ranking.",
    structuredDataCoverage: Math.round(coverage * 100),
    averageDiagnostic: Math.round(results.reduce((a, r) => a + r.diagnostic, 0) / Math.max(1, results.length)),
    pages: results,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const c = latest("crawls");
  if (!c) throw new Error("No crawl yet: run `npm run seo:crawl` first.");
  const report = audit(c.data);
  save("aeo", `${stamp()}.json`, report);
  console.log(`AEO diagnostics (internal): average ${report.averageDiagnostic}/100, structured data on ${report.structuredDataCoverage}% of pages.`);
  for (const r of report.pages.filter((r) => r.failed.length)) console.log(`  ${String(r.diagnostic).padStart(3)}  ${r.path}  missing: ${r.failed.join(", ")}`);
}
