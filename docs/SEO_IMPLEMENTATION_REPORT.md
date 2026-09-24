# SEO / AEO implementation report (2026-09-24)

This makes the site as crawlable, indexable and understandable as it can be made. It does **not** guarantee any ranking or AI citation; nothing can.

## Files created
- `lib/seo.ts`: production origin, profiles, `absolute()`, `pageMetadata()`
- `lib/schema.ts`: Schema.org builders (WebSite, Person, WebPage/CollectionPage/ProfilePage/ContactPage, BreadcrumbList, BlogPosting/Article, SoftwareSourceCode, Book, ImageGallery, ItemList)
- `lib/routes.ts`: single list of public routes
- `lib/indexnow.ts`, `app/indexnow-key.txt/route.ts`, `app/api/seo/indexnow/route.ts`
- `components/seo/JsonLd.tsx`
- `app/sitemap.ts`, `app/manifest.ts`, `app/llms.txt/route.ts`, `app/not-found.tsx`, `app/not-found.module.css`
- `scripts/seo/`: `crawl.mjs`, `aeo.mjs`, `ingest.mjs`, `opportunities.mjs`, `experiments.mjs`, `orchestrator.mjs`, `indexnow.mjs`, `test.mjs`, `lib/html.mjs`, `lib/store.mjs`, `integrations/gsc.mjs`, `integrations/bing.mjs`
- `.github/workflows/seo.yml`
- `docs/SEO_AEO_ARCHITECTURE.md`, `SEO_AGENT.md`, `SEO_SETUP.md`, `SEO_ENVIRONMENT_VARIABLES.md`, `SEO_AUTOMATION.md`, this report

## Files modified
`app/layout.tsx`, `app/robots.ts`, `app/page.tsx`; `app/{roads,research,projects,shelves,wanderings,traces,new-beginnings,post}/page.tsx`; `app/{roads,research,projects,wanderings,shelves}/[slug]/page.tsx`; `app/shelves/LibraryFromContent.tsx` + `shelves-page.module.css` (index of notes); `components/shelves/Shelf.tsx` (accessible names); `components/projects/Heatmaps.tsx` + css (HTML weight 547KB → 308KB); `app/{opengraph,twitter}-image.alt.txt`; `next.config.ts`; `package.json`; `.env.example`; `.gitignore`.

## Routes covered
28 indexable URLs in production: 9 section pages, 15 projects and 4 book notes. Drafts are excluded automatically. Future essays, research entries and wanderings join the sitemap, llms.txt and the tests as they're published.

## robots rules
`User-Agent: *` · `Allow: /` · `Disallow: /api/` · `Host` · `Sitemap: https://satnamportfolio.vercel.app/sitemap.xml`. No crawler is blocked by user agent, including AI search crawlers. `/style-guide` is deliberately *not* disallowed, so crawlers can see its `noindex` (meta tag and X-Robots-Tag). `/api/*` also sends `X-Robots-Tag: noindex, nofollow`.

## Sitemap behaviour
`/sitemap.xml` (application/xml) is generated from `publicRoutes()`. It contains canonical production URLs only, and `lastmod` appears only where content has a real date (essays, research, wanderings and their indexes). No `priority` or `changefreq` is set, because Google ignores both. `generateSitemaps()` can split it past 50,000 URLs.

## Canonical strategy
Centralised in `pageMetadata()`: one absolute HTTPS canonical per page on the production origin, without query or trailing slash. Previews still point at production. Trailing slashes return 308. The 404 page is `noindex, follow`.

## Structured data
One `@graph` per page with stable `@id`s (`/#website`, `/#person`, `<url>#webpage`, `#breadcrumb`, `#article`, `#project`, `#book`, `#gallery`). The layout supplies WebSite + Person (`sameAs`: GitHub, LinkedIn, X, LeetCode, Codeforces). Page nodes match what the page visibly shows (see SEO_AEO_ARCHITECTURE.md). There are no reviews, ratings, prices or invented dates.

## AEO implementation
- Every page now has a factual meta description. Detail pages use their own summary or opening text.
- Single H1 per page with descriptive headings. Detail pages open with the direct summary (projects) or lead (essays).
- Author and dates are machine-readable (`author` → Person, `datePublished`, `<time datetime>`).
- `llms.txt` is generated from content.
- The AEO auditor scores 12 answer-engine questions per page. The current internal average is 87/100, with structured data on 100% of pages.

## AI-agent accessibility
Real links for every note (the "Index of notes" on /shelves), where before the book pages were reachable only through JavaScript buttons. The shelf book buttons are now named in every state. Landmarks, skip link, labelled controls, `lang`, and reduced-motion handling were already in place and are asserted by the crawler on every page.

## Crawler, agent, automation
See SEO_AGENT.md and SEO_AUTOMATION.md. The crawler stores history in `.seo/crawls/` and compares runs. The orchestrator writes reports, experiment proposals and a private local dashboard. CI blocks merges on SEO regressions; scheduled runs observe and propose, and never deploy.

## Integrations
| Integration | Status |
|---|---|
| Google Search Console | Implemented (service account → searchAnalytics + sitemaps → `.seo/metrics/`). **Needs credentials.** |
| Bing Webmaster Tools | Implemented (query, page, crawl, crawl-issue and sitemap stats). **Needs API key.** |
| IndexNow | Implemented (key route, authenticated + rate-limited endpoint, sitemap-diff script). **Needs `INDEXNOW_KEY` and `SEO_ADMIN_TOKEN` on Vercel.** |

## Validation results (production build, `next start`)
- `npm run build`: passes, and the draft safeguard found no drafts in output.
- `npm run lint`, `tsc --noEmit`: clean.
- `npm run seo:test`: **30/30 passed.**
- `npm run seo:crawl`: 28 pages, **0 errors, 0 warnings.** Informational notes remain: 13 short pages (thin by word count: section indexes and short project summaries) and 15 pages with a single inbound link.
- Headers: robots.txt `text/plain`, sitemap `application/xml`, llms.txt `text/markdown; charset=utf-8`.
- Representative pages checked: title, description, canonical, og:image, JSON-LD, H1.

## Remaining manual configuration
1. Set `NEXT_PUBLIC_SITE_URL`, `INDEXNOW_KEY` and `SEO_ADMIN_TOKEN` on Vercel. Update `NEXT_PUBLIC_SITE_URL` if you move to a custom domain.
2. Verify the site in Search Console and Bing and submit the sitemap. Add GSC and Bing secrets to GitHub for scheduled ingestion.
3. Replace the placeholder notes on the four book pages, and publish real essays and research. Several project pages are one paragraph: adding a "What is it / How it works / Results" write-up is the single biggest AEO gain available.
4. Consider whether the site should name you in full ("Satnam" today) for entity disambiguation. Schema and copy follow whatever the site shows.

## Known limitations
- Lighthouse was not run in this session. Core Web Vitals were not measured beyond the crawler's timing and HTML-size checks. The WebGL prism and the reels are the main client costs, and both were already lazy and visibility-gated.
- The in-memory rate limiter is per serverless instance. That's proportionate for one authenticated endpoint, but it isn't a global limit.
- Agent history lives in `.seo/` (local, or the Actions cache). A database would be needed for multi-machine history.
- Instagram content can't be pulled automatically: Instagram requires login and blocks anonymous API access.
