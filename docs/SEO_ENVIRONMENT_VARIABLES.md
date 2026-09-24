# SEO environment variables

Never commit real values; `.env.example` lists the names only. Only variables used by implemented code are listed.

| Variable | Where | Used by | Required? |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Vercel (Production + Preview), CI | `lib/seo.ts`: canonicals, sitemap, robots, JSON-LD, llms.txt; `scripts/seo/*` expected origin | Recommended (falls back to the production domain) |
| `INDEXNOW_KEY` | Vercel (Production) | `/indexnow-key.txt`, `lib/indexnow.ts` | For IndexNow |
| `SEO_ADMIN_TOKEN` | Vercel (Production) and whoever runs `seo:indexnow` | Bearer auth on `POST /api/seo/indexnow` | For IndexNow |
| `GSC_SERVICE_ACCOUNT_EMAIL` | local `.env.local`, GitHub secret | `scripts/seo/integrations/gsc.mjs` | For Search Console data |
| `GSC_PRIVATE_KEY` | local, GitHub secret | same | For Search Console data |
| `GSC_PROPERTY` | local, GitHub secret | same | For Search Console data |
| `BING_WEBMASTER_API_KEY` | local, GitHub secret | `scripts/seo/integrations/bing.mjs` | For Bing data |
| `SEO_DATA_DIR` | local | where the agent keeps history (default `.seo`) | Optional |
| `BASE_URL` | local, CI | which running site `seo:test` and `seo:crawl` check | Optional (default `http://localhost:3000`) |

Notes:
- `NEXT_PUBLIC_SITE_URL` is public by nature (it is the site's own address). Nothing else is exposed to the browser: none of the others has the `NEXT_PUBLIC_` prefix.
- The IndexNow protocol publishes the key at `keyLocation` for verification. The key is still kept out of source control.
- Search and webmaster credentials are **not needed on Vercel**: ingestion runs in the agent, not in the site.
