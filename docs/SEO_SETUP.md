# SEO setup

## 1. Production origin
In Vercel → Project → Settings → Environment Variables, set `NEXT_PUBLIC_SITE_URL` to the production origin (currently `https://satnamportfolio.vercel.app`) for **Production** and **Preview**. If you move to a custom domain, change only this variable. Canonicals, the sitemap, robots, JSON-LD and llms.txt all follow it.

## 2. Google Search Console
1. Add the property (Domain property recommended, verified by DNS; or URL-prefix, verified by HTML tag or file).
2. Submit `https://<origin>/sitemap.xml` under Sitemaps.
3. For the agent: in Google Cloud, create a service account, enable the *Search Console API*, and create a JSON key. In Search Console → Settings → Users, add the service account's email with *Restricted* access.
4. Put `GSC_SERVICE_ACCOUNT_EMAIL`, `GSC_PRIVATE_KEY` (the key's `private_key`, with `\n` escapes) and `GSC_PROPERTY` (`sc-domain:example.com` or `https://example.com/`) in `.env.local` for local runs and in GitHub Actions secrets for scheduled runs.

## 3. Bing Webmaster Tools
1. Add the site (it can be imported from Search Console) and submit the sitemap.
2. Settings → API access → generate a key and set it as `BING_WEBMASTER_API_KEY` (locally and in GitHub secrets).

## 4. IndexNow
1. Generate a key: `openssl rand -hex 16`.
2. On Vercel set `INDEXNOW_KEY` (Production) and a long random `SEO_ADMIN_TOKEN`. Redeploy. `https://<origin>/indexnow-key.txt` should now return the key.
3. After each production deploy: `SEO_ADMIN_TOKEN=… npm run seo:indexnow` (use `--dry-run` first).

## 5. Run it
```bash
npm run build && npx next start -p 3000   # production build locally
npm run seo:test                          # regression suite (BASE_URL defaults to http://localhost:3000)
npm run seo:agent                         # crawl + analyse + propose; open .seo/dashboard.html
npm run seo:ingest                        # once search credentials exist
```

## 6. GitHub Pages mirror
`.github/workflows/pages.yml` publishes a static copy at `https://satnamcodes.github.io/portfolio/` on every push to `main` and once a day (to refresh the heatmaps).
- One-time: GitHub → repo → Settings → Pages → *Build and deployment* → Source: **GitHub Actions**.
- The mirror's canonicals point at Vercel, so it doesn't compete with the real site in search.
- On the mirror, the letter form posts to the Vercel API. The API allows that origin through `POST_ALLOWED_ORIGINS` (default `https://satnamcodes.github.io`).
- Build it locally: `GITHUB_PAGES=1 NEXT_PUBLIC_BASE_PATH=/portfolio npx next build` after moving `app/api` and `app/indexnow-key.txt` aside (the workflow deletes them in its own checkout).
