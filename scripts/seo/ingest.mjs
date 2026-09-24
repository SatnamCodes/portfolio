#!/usr/bin/env node
// Daily ingestion of search performance into .seo/metrics/. Each source is optional: without
// credentials it is skipped and recorded as such, never faked.
import { pathToFileURL } from "node:url";
import { PRODUCTION } from "./crawl.mjs";
import * as bing from "./integrations/bing.mjs";
import * as gsc from "./integrations/gsc.mjs";
import { event, save } from "./lib/store.mjs";

const day = (offset) => new Date(Date.now() - offset * 864e5).toISOString().slice(0, 10);

export async function ingest() {
  const out = { at: new Date().toISOString(), google: null, bing: null, skipped: [] };
  if (gsc.configured()) {
    try {
      // Search Console data settles after ~2-3 days; take a 28-day window ending 3 days ago.
      out.google = { rows: await gsc.searchAnalytics({ startDate: day(30), endDate: day(3) }), sitemaps: await gsc.sitemaps() };
    } catch (e) {
      out.skipped.push(`google: ${e.message}`);
    }
  } else out.skipped.push("google: not configured");
  if (bing.configured()) {
    try {
      const site = `${PRODUCTION}/`;
      out.bing = { queries: await bing.queryStats(site), pages: await bing.pageStats(site), crawl: await bing.crawlStats(site), issues: await bing.crawlIssues(site), sitemaps: await bing.sitemapStatus(site) };
    } catch (e) {
      out.skipped.push(`bing: ${e.message}`);
    }
  } else out.skipped.push("bing: not configured");
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const data = await ingest();
  const file = save("metrics", `${data.at.slice(0, 10)}.json`, data);
  event("ingest", { google: Boolean(data.google), bing: Boolean(data.bing), skipped: data.skipped });
  console.log(`Ingested → ${file}${data.skipped.length ? `\n  skipped: ${data.skipped.join("; ")}` : ""}`);
}
