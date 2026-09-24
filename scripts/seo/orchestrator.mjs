#!/usr/bin/env node
// The SEO/AEO agent loop, one resumable pass per run:
//   1 crawl → 2 analyse (technical, AEO, entities, links) → 3 detect → 4 prioritise
//   5 propose experiments → 6 validate the site → report + private dashboard.
// Steps 7-13 (branch, preview, approval, deploy, monitor, keep/rollback) are human-gated through
// experiments.mjs and the normal Git → Vercel preview → PR flow. This script never edits content,
// never pushes, and never deploys.
//
//   node scripts/seo/orchestrator.mjs [--base URL] [--cadence daily|weekly|monthly]
import fs from "node:fs";
import path from "node:path";
import { audit } from "./aeo.mjs";
import { compare, crawl } from "./crawl.mjs";
import { all as experiments, propose } from "./experiments.mjs";
import { schemaNodes } from "./lib/html.mjs";
import { event, latest, ROOT, save, stamp } from "./lib/store.mjs";
import { detect } from "./opportunities.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = opt("--base", process.env.BASE_URL ?? "http://localhost:3000");
const cadence = opt("--cadence", "daily");

// Entity graph: which entities the site declares and how pages connect to them.
function entities(crawlData) {
  const nodes = crawlData.pages.flatMap((p) => schemaNodes(p).map((n) => ({ ...n, _page: p.path })));
  const byType = {};
  for (const n of nodes) byType[n["@type"]] = (byType[n["@type"]] ?? 0) + 1;
  const technologies = {};
  for (const n of nodes.filter((n) => n["@type"] === "SoftwareSourceCode"))
    for (const t of String(n.keywords ?? "").split(", ").filter(Boolean)) (technologies[t] ??= []).push(n._page);
  const unlinkedAuthors = nodes.filter((n) => ["BlogPosting", "Article", "SoftwareSourceCode"].includes(n["@type"]) && !n.author);
  return { types: byType, technologyClusters: technologies, unlinkedAuthors: unlinkedAuthors.map((n) => n._page) };
}

// Internal links: anchor text reuse pointing at different pages is worth a look.
function linkAudit(crawlData) {
  const anchors = new Map();
  for (const p of crawlData.pages)
    for (const a of p.anchors ?? []) {
      if (!a.href?.startsWith("/") || !a.text) continue;
      const key = a.text.toLowerCase();
      anchors.set(key, new Set([...(anchors.get(key) ?? []), a.href.split(/[?#]/)[0]]));
    }
  return [...anchors].filter(([t, targets]) => targets.size > 1 && t.length > 2 && !["source", "demo"].includes(t)).map(([t, s]) => ({ text: t, targets: [...s] }));
}

const prev = latest("crawls");
console.log(`[1/6] Crawling ${base} (${cadence})…`);
const c = await crawl({ base });
save("crawls", `${stamp()}.json`, c);
console.log(`[2/6] Analysing ${c.summary.pages} pages…`);
const a = audit(c);
save("aeo", `${stamp()}.json`, a);
const graph = entities(c);
const ambiguousAnchors = linkAudit(c);
const metrics = latest("metrics")?.data ?? null;
console.log("[3/6] Detecting opportunities…");
const opps = detect({ metrics, crawl: c, aeo: a });
console.log(`[4/6] ${opps.length} opportunities, top ${Math.min(10, opps.length)} proposed.`);
console.log("[5/6] Recording experiment proposals (status: proposed)…");
const created = propose(opps.slice(0, 10));
console.log("[6/6] Validation: crawl errors must be zero before any change ships.");
const diff = prev ? compare(prev.data, c) : null;

const report = { at: new Date().toISOString(), base, cadence, crawl: c.summary, aeo: { average: a.averageDiagnostic, coverage: a.structuredDataCoverage }, entities: graph, ambiguousAnchors, diff: diff && { introduced: diff.introduced.length, resolved: diff.resolved.length }, metrics: metrics ? { skipped: metrics.skipped } : "none ingested", opportunities: opps.slice(0, 25), newExperiments: created.map((e) => e.experiment_id) };
save("reports", `${stamp()}.json`, report);
event("orchestrator", { cadence, errors: c.summary.errors, opportunities: opps.length });
writeDashboard({ c, a, opps, metrics, graph, ambiguousAnchors, diff });
console.log(`\nErrors ${c.summary.errors} · warnings ${c.summary.warnings} · AEO avg ${a.averageDiagnostic}/100 (internal) · ${created.length} new proposals`);
console.log(`Dashboard: ${path.join(ROOT, "dashboard.html")}`);
process.exit(c.summary.errors ? 1 : 0);

function writeDashboard({ c, a, opps, metrics, graph, ambiguousAnchors, diff }) {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  const rows = metrics?.google?.rows ?? [];
  const sum = (k) => rows.reduce((t, r) => t + r[k], 0);
  const imp = sum("impressions");
  const clicks = sum("clicks");
  const pos = rows.reduce((t, r) => t + r.position * r.impressions, 0) / Math.max(1, imp);
  const table = (head, body) => `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((d) => `<td>${esc(d)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${head.length}">None</td></tr>`}</tbody></table>`;
  const exps = experiments();
  const events = fs.existsSync(path.join(ROOT, "events/events.jsonl")) ? fs.readFileSync(path.join(ROOT, "events/events.jsonl"), "utf8").trim().split("\n").slice(-20).reverse().map((l) => JSON.parse(l)) : [];
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SEO/AEO dashboard</title>
<style>:root{--ink:#3e2723;--paper:#fff4e4;--rule:#bcaaa4}body{margin:0;padding:24px 16px;font:15px/1.5 system-ui,sans-serif;color:var(--ink);background:var(--paper)}main{max-width:72rem;margin:auto}h1{font-weight:500}h2{margin-top:2.5rem;border-bottom:1px solid var(--ink);font-size:1rem;text-transform:uppercase;letter-spacing:.1em}.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:12px}.tile{border:1px solid var(--rule);padding:12px}.tile b{display:block;font-size:1.6rem}table{width:100%;border-collapse:collapse;font-size:13px;display:block;overflow-x:auto}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--rule);vertical-align:top}p.note{color:#7d6055}</style>
<main><h1>SEO/AEO dashboard</h1><p class="note">Private and local (.seo/, git-ignored, never deployed). Generated ${esc(new Date().toISOString())} from ${esc(c.base)}. AEO figures are internal diagnostics, not rankings.</p>
<h2>Overview</h2><div class="tiles">
<div class="tile">Organic clicks<b>${rows.length ? clicks : "—"}</b></div><div class="tile">Impressions<b>${rows.length ? imp : "—"}</b></div><div class="tile">CTR<b>${rows.length ? ((clicks / Math.max(1, imp)) * 100).toFixed(1) + "%" : "—"}</b></div><div class="tile">Avg position<b>${rows.length ? pos.toFixed(1) : "—"}</b></div>
<div class="tile">Pages crawled<b>${c.summary.pages}</b></div><div class="tile">Crawl errors<b>${c.summary.errors}</b></div><div class="tile">Warnings<b>${c.summary.warnings}</b></div><div class="tile">Since last crawl<b>${diff ? `+${diff.introduced.length} / −${diff.resolved.length}` : "—"}</b></div></div>
${metrics ? `<p class="note">Search data: ${esc(metrics.skipped?.join("; ") || "Google and Bing ingested")}</p>` : `<p class="note">No search data ingested yet (see docs/SEO_SETUP.md).</p>`}
<h2>Technical SEO</h2>${table(["Severity", "Issue", "Path", "Detail"], c.issues.filter((i) => i.severity !== "info").map((i) => [i.severity, i.code, i.path, i.detail ?? ""]))}
<h2>Opportunities</h2>${table(["Kind", "Target", "Why"], opps.slice(0, 30).map((o) => [o.kind, o.target, o.reason]))}
<h2>AEO</h2><div class="tiles"><div class="tile">Average diagnostic<b>${a.averageDiagnostic}</b></div><div class="tile">Structured-data coverage<b>${a.structuredDataCoverage}%</b></div></div>${table(["Diagnostic", "Page", "Gaps"], a.pages.map((p) => [p.diagnostic, p.path, p.failed.join(", ")]))}
<h2>Entities</h2>${table(["Type", "Nodes"], Object.entries(graph.types))}${table(["Technology", "Projects"], Object.entries(graph.technologyClusters).map(([t, ps]) => [t, ps.join(", ")]))}${table(["Anchor text", "Points to"], ambiguousAnchors.map((x) => [x.text, x.targets.join(", ")]))}
<h2>Experiments</h2>${table(["ID", "Status", "Kind", "Target", "Reason", "Commit"], exps.map((e) => [e.experiment_id, e.status, e.kind, e.target_url, e.reason, e.git_commit ?? ""]))}
<h2>Events and deployments</h2>${table(["When", "Type", "Detail"], events.map((e) => [e.at, e.type, JSON.stringify({ ...e, at: undefined, type: undefined })]))}
</main></html>`;
  fs.writeFileSync(path.join(ROOT, "dashboard.html"), html);
}
