// Google Search Console, via a service account (no user OAuth dance, suits scheduled jobs).
// Needs GSC_SERVICE_ACCOUNT_EMAIL, GSC_PRIVATE_KEY and GSC_PROPERTY (e.g. "sc-domain:example.com" or
// "https://example.com/"). Add the service account as a user on the property in Search Console.
import crypto from "node:crypto";

export const configured = () =>
  Boolean(process.env.GSC_SERVICE_ACCOUNT_EMAIL && process.env.GSC_PRIVATE_KEY && process.env.GSC_PROPERTY);

async function token() {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: process.env.GSC_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const key = process.env.GSC_PRIVATE_KEY.replace(/\\n/g, "\n");
  const sig = crypto.createSign("RSA-SHA256").update(unsigned).sign(key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  });
  if (!res.ok) throw new Error(`GSC token ${res.status}`);
  return (await res.json()).access_token;
}

/** Rows of { date, query, page, clicks, impressions, ctr, position } for a date range. */
export async function searchAnalytics({ startDate, endDate }) {
  const t = await token();
  const rows = [];
  for (let startRow = 0; ; startRow += 25000) {
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(process.env.GSC_PROPERTY)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, dimensions: ["date", "query", "page"], rowLimit: 25000, startRow }),
      },
    );
    if (!res.ok) throw new Error(`GSC query ${res.status}`);
    const batch = (await res.json()).rows ?? [];
    rows.push(
      ...batch.map((r) => ({ date: r.keys[0], query: r.keys[1], page: r.keys[2], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    );
    if (batch.length < 25000) break;
  }
  return rows;
}

export async function sitemaps() {
  const t = await token();
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(process.env.GSC_PROPERTY)}/sitemaps`,
    { headers: { Authorization: `Bearer ${t}` } },
  );
  if (!res.ok) throw new Error(`GSC sitemaps ${res.status}`);
  return (await res.json()).sitemap ?? [];
}
