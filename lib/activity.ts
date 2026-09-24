import "server-only";

// Daily activity from three public sources, for the Projects heatmaps. Fetched on the server and
// cached for ten minutes; a source that fails simply renders as unavailable.
export type Activity = { days: Record<string, number>; total: number };

const REVALIDATE = 60 * 10; // ten minutes
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const PROFILES = {
  github: { user: "SatnamCodes", url: "https://github.com/SatnamCodes" },
  leetcode: { user: "EliasCross", url: "https://leetcode.com/u/EliasCross/" },
  codeforces: { user: "WiredInSatnam", url: "https://codeforces.com/profile/WiredInSatnam" },
} as const;

function tally(days: Record<string, number>): Activity {
  return { days, total: Object.values(days).reduce((a, b) => a + b, 0) };
}

async function github(): Promise<Activity> {
  const res = await fetch(`https://github.com/users/${PROFILES.github.user}/contributions`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const html = await res.text();
  // Each day cell has an id and a date; its count lives in the matching <tool-tip for="id">.
  const dates = new Map<string, string>();
  for (const m of html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"\s+id="([^"]+)"/g))
    dates.set(m[2], m[1]);
  const days: Record<string, number> = {};
  for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)</g)) {
    const date = dates.get(m[1]);
    const n = m[2].match(/^(\d+) contribution/);
    if (date) days[date] = n ? Number(n[1]) : 0;
  }
  if (!Object.keys(days).length) throw new Error("GitHub: no calendar found");
  return tally(days);
}

async function leetcode(): Promise<Activity> {
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: "https://leetcode.com" },
    body: JSON.stringify({
      query: "query($u:String!){matchedUser(username:$u){userCalendar{submissionCalendar}}}",
      variables: { u: PROFILES.leetcode.user },
    }),
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) throw new Error(`LeetCode ${res.status}`);
  const json = await res.json();
  const raw: Record<string, number> = JSON.parse(
    json?.data?.matchedUser?.userCalendar?.submissionCalendar ?? "{}",
  );
  const days: Record<string, number> = {};
  for (const [ts, n] of Object.entries(raw)) {
    const d = iso(new Date(Number(ts) * 1000));
    days[d] = (days[d] ?? 0) + n;
  }
  return tally(days);
}

async function codeforces(): Promise<Activity> {
  const res = await fetch(
    `https://codeforces.com/api/user.status?handle=${PROFILES.codeforces.user}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (!res.ok) throw new Error(`Codeforces ${res.status}`);
  const json = await res.json();
  if (json.status !== "OK") throw new Error("Codeforces: bad status");
  const days: Record<string, number> = {};
  for (const sub of json.result as { creationTimeSeconds: number }[]) {
    const d = iso(new Date(sub.creationTimeSeconds * 1000));
    days[d] = (days[d] ?? 0) + 1;
  }
  return tally(days);
}

const settle = (p: Promise<Activity>) => p.catch(() => null);

export async function getActivity() {
  const [gh, lc, cf] = await Promise.all([
    settle(github()),
    settle(leetcode()),
    settle(codeforces()),
  ]);
  return { at: new Date().toISOString(), github: gh, leetcode: lc, codeforces: cf };
}
