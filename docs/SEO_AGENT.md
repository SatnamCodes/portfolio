# The SEO/AEO agent

`scripts/seo/` is a dependency-free Node toolkit. It runs locally or in GitHub Actions, never inside the deployed site, so it adds nothing to page weight and can take as long as it needs.

## Modules

| Module | Role |
|---|---|
| `crawl.mjs` (technical SEO) | Crawls from `/` plus every sitemap URL. Per page: status, redirect chains, timing, HTML size, title, description, canonical(s), robots and X-Robots-Tag, H1s and heading order, Open Graph, JSON-LD validity and duplicate `@id`s, image alt, unnamed buttons, empty links, `lang`, `<main>`. Site-wide: duplicate titles, descriptions and content, orphans, inbound link counts, click depth, robots and sitemap sanity, stale content. Stores each crawl in `.seo/crawls/`; `--compare` diffs against the previous one. |
| `aeo.mjs` (AEO analyser) | Twelve answer-engine questions per page: direct answer, defined terms, unambiguous entity, supported facts, descriptive headings, extractable text, identifiable author, clear dates, content in HTML, related links, schema matches visible H1, freshness. The **internal diagnostic** percentage is for prioritising work only. It is not a ranking. |
| entity and link analysers (in `orchestrator.mjs`) | Rebuild the entity graph from JSON-LD (types, technology clusters, unlinked authors) and flag one anchor text pointing at several targets. |
| `integrations/gsc.mjs`, `integrations/bing.mjs`, `ingest.mjs` | Pull Search Console rows (date, query, page, clicks, impressions, CTR, position) and Bing query, page, crawl and sitemap stats into `.seo/metrics/`. Each source is skipped (and recorded as skipped) when not configured. |
| `opportunities.mjs` (keyword and performance analyser) | Striking distance (≥100 impressions at position 4–20), low CTR in the top 5, technical errors, orphans and weakly linked pages, thin content, AEO gaps. Sorted by expected value. |
| `experiments.mjs` (experiment manager) | The ledger (`.seo/experiments/experiments.json`) and state machine: proposed → testing → deployed/monitoring → successful, inconclusive or rolled_back. |
| `orchestrator.mjs` | One resumable pass: crawl → analyse → detect → prioritise → propose (top 10, deduplicated) → validate → report (`.seo/reports/`) and private dashboard (`.seo/dashboard.html`). Exits non-zero if the crawl found errors. |
| `indexnow.mjs` | After a deploy, diffs the live sitemap against the last snapshot and submits new, changed and removed URLs through the authenticated endpoint. |
| `test.mjs` | CI regression suite (see SEO_AUTOMATION.md). |

## The 13-step loop, and who does what

1–6 (crawl, analyse, detect, prioritise, propose, validate) are automatic: `npm run seo:agent`.

7–13 are **human-gated**. This is deliberate: an LLM never writes to production.

7. `npm run seo:experiments start <id>` creates branch `seo/<id>` and refuses to run on a dirty tree.
8. Make the change on the branch (by hand, or by drafting with an assistant and reviewing it). Fill in `proposed_change`.
9. Push. Vercel's Git integration builds a **preview**.
10. `BASE_URL=<preview url> npm run seo:test` and `npm run seo:crawl -- --base <preview url>` must pass.
11. Merge the PR after review. Vercel deploys production.
12. `npm run seo:experiments deployed <id> <commit> [deploymentId]` snapshots the before metrics.
13. After ≥28 days, `npm run seo:experiments evaluate <id>`. It returns `insufficient-data` unless both windows have ≥100 impressions. Clicks up ≥10% without a worse position counts as successful; clicks down ≥20% is a regression, which prints the `git revert` to run, and then `rollback <id> <commit>` records it. Anything else is inconclusive.

An experiment is never marked successful on thin data.

## Guarantees
- The agent never edits content, commits, pushes or deploys.
- Opportunities and diagnostics are candidates for review, not promises of ranking.
- All history is plain JSON under `.seo/`, which is git-ignored and never deployed.
