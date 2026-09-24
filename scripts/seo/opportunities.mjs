// Opportunity detection from stored metrics, crawl issues and AEO diagnostics. Opportunities are
// candidates for a human-reviewed change, ranked by expected value; none is a promise of ranking gains.
export function detect({ metrics, crawl, aeo }) {
  const out = [];
  const rows = metrics?.google?.rows ?? [];
  const byPage = new Map();
  for (const r of rows) {
    const p = byPage.get(r.page) ?? { page: r.page, impressions: 0, clicks: 0, weighted: 0, queries: new Map() };
    p.impressions += r.impressions;
    p.clicks += r.clicks;
    p.weighted += r.position * r.impressions;
    p.queries.set(r.query, (p.queries.get(r.query) ?? 0) + r.impressions);
    byPage.set(r.page, p);
  }
  for (const p of byPage.values()) {
    const position = p.weighted / Math.max(1, p.impressions);
    const ctr = p.clicks / Math.max(1, p.impressions);
    const top = [...p.queries].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([q]) => q);
    if (p.impressions >= 100 && position >= 4 && position <= 20)
      out.push({ kind: "striking-distance", target: p.page, priority: p.impressions / position, reason: `${p.impressions} impressions at average position ${position.toFixed(1)}`, queries: top });
    if (p.impressions >= 200 && position <= 5 && ctr < 0.02)
      out.push({ kind: "low-ctr", target: p.page, priority: p.impressions * (0.05 - ctr), reason: `CTR ${(ctr * 100).toFixed(1)}% at position ${position.toFixed(1)}: review title and description against queries`, queries: top });
  }
  for (const i of crawl?.issues ?? []) {
    if (i.severity === "error") out.push({ kind: "technical", target: i.path, priority: 1000, reason: `${i.code}${i.detail ? `: ${i.detail}` : ""}` });
    if (i.code === "orphan-page" || i.code === "few-inbound-links") out.push({ kind: "internal-link", target: i.path, priority: 50, reason: `${i.code}: add a descriptive link from a related page` });
    if (i.code === "thin-content") out.push({ kind: "content-gap", target: i.path, priority: 10, reason: i.detail });
  }
  for (const p of aeo?.pages ?? [])
    if (p.diagnostic < 60) out.push({ kind: "aeo", target: p.path, priority: 100 - p.diagnostic, reason: `answer-extraction gaps: ${p.failed.join(", ")}` });
  return out.sort((a, b) => b.priority - a.priority);
}
