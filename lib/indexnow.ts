import "server-only";
import { absolute, SITE_URL } from "./seo";

// IndexNow (https://www.indexnow.org): tells Bing, Yandex, Seznam and others that URLs changed.
// The key is, by protocol design, publicly verifiable: engines fetch it from keyLocation. It still
// lives only in the INDEXNOW_KEY environment variable, never in source control.
export const indexNowKey = () => process.env.INDEXNOW_KEY?.trim() || null;

export async function submitToIndexNow(paths: string[]) {
  const key = indexNowKey();
  if (!key) return { ok: false as const, reason: "INDEXNOW_KEY is not set" };
  const host = new URL(SITE_URL).host;
  const urlList = [...new Set(paths.map((p) => absolute(p)))].filter(
    (u) => new URL(u).host === host,
  );
  if (!urlList.length) return { ok: false as const, reason: "no URLs on this host" };
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation: absolute("/indexnow-key.txt"), urlList }),
  });
  return { ok: res.ok, status: res.status, submitted: urlList.length } as const;
}
