# SEO automation

## Where things run, and why
- **Vercel:** only what the site itself must serve: pages, `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/manifest.webmanifest`, `/indexnow-key.txt` and the authenticated IndexNow endpoint. There are no Vercel cron jobs. Crawls and audits are long-running, need history and Git, and would be wasteful as serverless invocations.
- **GitHub Actions** (`.github/workflows/seo.yml`):
  - every push and PR: lint → `next build` → `next start` → `npm run seo:test`. A failing test fails the check and blocks the merge.
  - daily 03:17 UTC: ingest Search Console and Bing data (if secrets exist) → agent pass against production → uploads the dashboard and report as an artifact. History persists through the Actions cache.
  - weekly (Monday 04:43 UTC): the same pass with `--cadence weekly`, for the deep AEO, entity and link review.
- **Locally:** any time, the same commands (see SEO_SETUP.md).

## Recommended cadence
| Cadence | What | How |
|---|---|---|
| Hourly | uptime, critical indexing errors | Vercel's own monitoring or an external uptime check; not built here, to avoid an expensive job |
| Daily | crawl, technical audit, GSC and Bing ingestion, opportunity detection | scheduled workflow |
| Weekly | AEO, entity and internal-link audit, experiment evaluation (`seo:experiments evaluate`) | scheduled workflow + a person |
| Monthly | site-wide content review, stale content (crawl flags >18 months), topical structure | a person, with the dashboard |

Production is never modified on a schedule. Scheduled jobs only observe and propose.

## What the regression suite checks (`npm run seo:test`)
robots.txt (200, text/plain, allows `*`, sitemap line, no site-wide block) · sitemap.xml (200, XML urlset, production origin only, no private routes, no duplicates) · llms.txt served · unknown URL returns 404 · trailing slash returns 308 · `/api/*` has X-Robots-Tag noindex · style guide noindex · a full crawl with zero: missing or multiple canonicals, wrong-origin canonicals, missing descriptions, missing H1, duplicate titles, invalid JSON-LD, broken links, broken sitemap URLs, noindex in sitemap, robots-blocked pages, images without alt, unnamed buttons, missing `lang` · JSON-LD on every sitemap page · no accidental noindex.

## Deploy and rollback
Deploys are Vercel's normal flow: PR → preview → merge → production. To roll back a change, `git revert <commit>` and push (or use *Instant Rollback* in Vercel), then record it with `npm run seo:experiments rollback <id> <commit>`.

## Security
- `POST /api/seo/indexnow` requires `Authorization: Bearer $SEO_ADMIN_TOKEN` (constant-time compare) and is rate limited (10/hour). It is the only agent-management endpoint on the site.
- The dashboard is a local file (`.seo/dashboard.html`, `noindex`, git-ignored), never deployed, so nothing needs authenticating on the web.
- No secrets reach the client or robots, sitemap or llms output. The tests assert that private routes stay out of the sitemap.
