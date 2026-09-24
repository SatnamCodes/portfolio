# SEO / AEO architecture

How the site makes itself discoverable, indexable and easy for search engines and AI systems to understand, and how it keeps checking that it still does.

## What was there before (audit, 2026-09-24)

| Area | Found |
|---|---|
| Framework | Next.js 16.3.6, App Router, React 19, TypeScript (strict), Turbopack; `pageExtensions` ts/tsx/mdx |
| Content | MDX files in `content/<section>/` with zod-validated `metadata`; drafts excluded from production builds (`scripts/check-drafts.mjs`); photos in `content/traces/traces.json` |
| Routes | `/`, `/roads`, `/research`, `/projects`, `/shelves`, `/wanderings`, `/traces`, `/new-beginnings`, `/post`, and detail pages under five sections; `/style-guide` (internal); `/api/post` (letter form, rate limited) |
| Hosting | Vercel (production: `satnamportfolio.vercel.app`), no `vercel.json`, no database, no auth, no analytics |
| Metadata | Titles on every page and descriptions on two; **no canonical URLs, no `metadataBase`**; one site-wide share image |
| robots | `app/robots.ts` allowed everything except `/style-guide`, **no sitemap line**; that disallow would also have hidden the page's own `noindex` |
| Sitemap, JSON-LD, llms.txt, manifest, 404 page | **None** |
| Accessibility | Good base (skip link, landmarks, labelled controls, reduced motion). Shelf book pages were reachable only through JavaScript buttons, so they were orphaned for crawlers |

## Architecture now

```
lib/seo.ts          SITE_URL (production origin), PROFILES, absolute(), pageMetadata()
lib/schema.ts       Schema.org builders with stable @ids (#website, #person, <url>#webpage …)
lib/routes.ts       publicRoutes(): the single list of public URLs (sitemap, llms.txt, tests)
components/seo/JsonLd.tsx   one JSON-LD @graph per page, safely escaped
app/layout.tsx      metadataBase, defaults, viewport; WebSite + Person graph on every page
app/<page>          pageMetadata({...}) + page-specific JSON-LD (WebPage, BreadcrumbList, …)
app/sitemap.ts      /sitemap.xml from publicRoutes(), lastmod only from real content dates
app/robots.ts       /robots.txt: allow all, disallow /api/, sitemap, host
app/llms.txt/route.ts   /llms.txt generated from publicRoutes()
app/manifest.ts     /manifest.webmanifest (identity only, not a PWA)
app/not-found.tsx   useful 404 (HTTP 404, noindex) with the full site map
app/indexnow-key.txt/route.ts, app/api/seo/indexnow/route.ts, lib/indexnow.ts   IndexNow
next.config.ts      X-Robots-Tag: noindex on /api/* and /style-guide (+ existing security headers)
scripts/seo/        offline agent: crawler, AEO auditor, integrations, experiments, dashboard, tests
.github/workflows/seo.yml   CI regression tests + scheduled audits
```

### Canonical strategy
- `SITE_URL` comes from `NEXT_PUBLIC_SITE_URL`, falling back to the production domain, and **never** from `VERCEL_URL`. Previews therefore still declare production canonicals.
- Every indexable page declares exactly one canonical: absolute, HTTPS, no query string, no trailing slash (`absolute()` strips both).
- Next.js already 308-redirects trailing-slash URLs. Query and tracking parameters render the same page and the canonical removes them.
- The layout sets no canonical, so no page can inherit someone else's.

### Structured data
One `@graph` per page. The layout contributes `WebSite` and `Person`; pages add nodes that reference them by `@id`:

| Page | Nodes |
|---|---|
| Home | WebPage |
| Section indexes | CollectionPage + BreadcrumbList (+ ItemList of projects on /projects, ImageGallery on /traces) |
| /new-beginnings | ProfilePage (mainEntity → Person) |
| /post | ContactPage |
| Essay / wandering | WebPage + BreadcrumbList + BlogPosting (author, datePublished) |
| Research entry | WebPage + BreadcrumbList + Article |
| Project | WebPage + BreadcrumbList + SoftwareSourceCode (codeRepository, keywords = technologies) |
| Book note | WebPage + BreadcrumbList + Book (authors, link) |

`Person.sameAs` lists only the owner's real profiles (GitHub, LinkedIn, X, LeetCode, Codeforces). There are no ratings, reviews, prices or invented dates. Videos are not marked up as `VideoObject`, because an upload date is required and not all clips have one.

### Entity graph
Person → created → Projects (SoftwareSourceCode.author), wrote → posts (BlogPosting.author), knowsAbout → topics drawn from the projects. Projects → technologies (keywords). The orchestrator rebuilds this graph from live JSON-LD every run and reports technology clusters and unlinked authors.

### Discovery
Home → nav → section → item. Every sitemap URL is reachable through links. The Shelves page now ends with an "Index of notes" of real links. Visible breadcrumbs already exist on detail pages as the "Section · …" kicker link, and BreadcrumbList mirrors them.

## Files
**Created:** `lib/seo.ts`, `lib/schema.ts`, `lib/routes.ts`, `lib/indexnow.ts`, `components/seo/JsonLd.tsx`, `app/sitemap.ts`, `app/manifest.ts`, `app/llms.txt/route.ts`, `app/not-found.tsx` (+ css), `app/indexnow-key.txt/route.ts`, `app/api/seo/indexnow/route.ts`, `scripts/seo/**`, `.github/workflows/seo.yml`, `docs/SEO_*.md`.
**Modified:** `app/layout.tsx`, `app/robots.ts`, `app/page.tsx`, every section and detail `page.tsx`, `app/shelves/LibraryFromContent.tsx` (+ css), `components/shelves/Shelf.tsx` (button names), `components/projects/Heatmaps.*` (lighter SVG), `next.config.ts`, `package.json`, `.env.example`, `.gitignore`.
