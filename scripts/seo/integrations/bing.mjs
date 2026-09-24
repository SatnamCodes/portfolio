// Bing Webmaster Tools JSON API. Needs BING_WEBMASTER_API_KEY (Settings → API access) and uses the
// production origin as siteUrl. Only documented read endpoints; nothing is written to Bing here.
const API = "https://ssl.bing.com/webmaster/api.svc/json";

export const configured = () => Boolean(process.env.BING_WEBMASTER_API_KEY);

async function call(method, siteUrl) {
  const url = `${API}/${method}?siteUrl=${encodeURIComponent(siteUrl)}&apikey=${process.env.BING_WEBMASTER_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bing ${method} ${res.status}`);
  return (await res.json()).d;
}

export const queryStats = (siteUrl) => call("GetQueryStats", siteUrl);
export const pageStats = (siteUrl) => call("GetPageStats", siteUrl);
export const crawlStats = (siteUrl) => call("GetCrawlStats", siteUrl);
export const crawlIssues = (siteUrl) => call("GetCrawlIssues", siteUrl);
export const sitemapStatus = (siteUrl) => call("GetFeeds", siteUrl);
