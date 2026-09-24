#!/usr/bin/env node
// Experiment ledger. Every automated suggestion becomes an experiment that a person moves through
// its states; nothing here edits content or deploys by itself.
//
//   node scripts/seo/experiments.mjs list
//   node scripts/seo/experiments.mjs start <id>                      # git branch seo/<id>; Vercel builds a preview
//   node scripts/seo/experiments.mjs deployed <id> <commit> [deploymentId]
//   node scripts/seo/experiments.mjs evaluate <id>
//   node scripts/seo/experiments.mjs rollback <id> <rollbackCommit>
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { event, latest, readJson, save } from "./lib/store.mjs";

export const STATES = ["proposed", "testing", "deployed", "monitoring", "successful", "inconclusive", "rolled_back"];
const MIN_DAYS = 28;
const MIN_IMPRESSIONS = 100;

export const all = () => readJson("experiments", "experiments.json", []);
const write = (list) => save("experiments", "experiments.json", list);

export function propose(opportunities) {
  const list = all();
  const open = new Set(list.filter((e) => !["successful", "inconclusive", "rolled_back"].includes(e.status)).map((e) => `${e.kind}|${e.target_url}`));
  const created = [];
  for (const o of opportunities) {
    if (open.has(`${o.kind}|${o.target}`)) continue;
    const exp = {
      experiment_id: `exp-${Date.now().toString(36)}-${created.length}`,
      timestamp: new Date().toISOString(),
      kind: o.kind,
      target_url: o.target,
      proposed_change: null, // written by the person (or a reviewed LLM draft) who takes it on
      reason: o.reason,
      hypothesis: hypothesis(o),
      metrics_before: null,
      metrics_after: null,
      git_commit: null,
      deployment_id: null,
      status: "proposed",
      rollback_commit: null,
    };
    list.push(exp);
    created.push(exp);
    open.add(`${o.kind}|${o.target}`);
  }
  write(list);
  return created;
}

function hypothesis(o) {
  switch (o.kind) {
    case "striking-distance": return `Clearer coverage of "${o.queries?.[0] ?? "the main query"}" could lift impressions into clicks; measure clicks and position over ${MIN_DAYS} days.`;
    case "low-ctr": return "A title and description that answer the dominant queries could raise CTR at the same position.";
    case "internal-link": return "A descriptive link from a related page improves discovery and context.";
    case "aeo": return "Direct answers near the top, defined terms and consistent structured data make the page easier to extract and cite.";
    case "technical": return "Fixing the error removes a barrier to crawling, indexing or rendering.";
    default: return "Improves usefulness for readers; effect measured, not assumed.";
  }
}

function metricsFor(url) {
  const m = latest("metrics")?.data?.google?.rows ?? [];
  const rows = m.filter((r) => r.page.replace(/\/$/, "").endsWith(url.replace(/\/$/, "")));
  const impressions = rows.reduce((a, r) => a + r.impressions, 0);
  const clicks = rows.reduce((a, r) => a + r.clicks, 0);
  const position = rows.reduce((a, r) => a + r.position * r.impressions, 0) / Math.max(1, impressions);
  return { at: new Date().toISOString(), impressions, clicks, ctr: clicks / Math.max(1, impressions), position };
}

function update(id, fn) {
  const list = all();
  const e = list.find((x) => x.experiment_id === id);
  if (!e) throw new Error(`No experiment ${id}`);
  fn(e);
  write(list);
  event("experiment", { id, status: e.status });
  return e;
}

export function evaluate(e) {
  const days = e.metrics_before ? (Date.now() - Date.parse(e.metrics_before.at)) / 864e5 : 0;
  const after = metricsFor(e.target_url);
  if (days < MIN_DAYS || after.impressions < MIN_IMPRESSIONS || (e.metrics_before?.impressions ?? 0) < MIN_IMPRESSIONS)
    return { verdict: "insufficient-data", days: Math.floor(days), after };
  const b = e.metrics_before;
  const clicksUp = after.clicks >= b.clicks * 1.1;
  const clicksDown = after.clicks <= b.clicks * 0.8;
  const positionWorse = after.position > b.position + 1;
  return { verdict: clicksUp && !positionWorse ? "successful" : clicksDown ? "regressed" : "inconclusive", days: Math.floor(days), after };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, id, a, b] = process.argv.slice(2);
  if (cmd === "list" || !cmd) for (const e of all()) console.log(`${e.experiment_id}  ${e.status.padEnd(12)} ${e.kind.padEnd(18)} ${e.target_url}  ${e.reason}`);
  else if (cmd === "start") {
    const dirty = execFileSync("git", ["status", "--porcelain"]).toString().trim();
    if (dirty) throw new Error("Working tree has uncommitted changes; commit or stash first.");
    execFileSync("git", ["switch", "-c", `seo/${id}`], { stdio: "inherit" });
    update(id, (e) => { e.status = "testing"; e.branch = `seo/${id}`; });
    console.log("Make the change on this branch, run `npm run seo:test` against its Vercel preview, then open a PR.");
  } else if (cmd === "deployed") update(id, (e) => { e.status = "monitoring"; e.git_commit = a; e.deployment_id = b ?? null; e.metrics_before = metricsFor(e.target_url); });
  else if (cmd === "evaluate") {
    const e = all().find((x) => x.experiment_id === id);
    const r = evaluate(e);
    console.log(JSON.stringify(r, null, 2));
    if (r.verdict === "successful" || r.verdict === "inconclusive") update(id, (x) => { x.status = r.verdict; x.metrics_after = r.after; });
    if (r.verdict === "regressed") console.log(`Clicks fell. To roll back: git revert ${e.git_commit} && npm run seo:experiments rollback ${id} <new-commit>`);
  } else if (cmd === "rollback") update(id, (e) => { e.status = "rolled_back"; e.rollback_commit = a; e.metrics_after = metricsFor(e.target_url); });
  else console.log("Commands: list | start <id> | deployed <id> <commit> [deploymentId] | evaluate <id> | rollback <id> <commit>");
}
