import { getActivity } from "@/lib/activity";

// Fresh GitHub / LeetCode / Codeforces activity for the live heatmaps. Cached at the edge for
// ten minutes, so visitors never hammer the three sources. The GitHub Pages mirror reads it
// cross-origin.
export const revalidate = 600;

const ALLOWED = (process.env.POST_ALLOWED_ORIGINS ?? "https://satnamcodes.github.io")
  .split(",")
  .map((o) => o.trim());

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  return Response.json(await getActivity(), {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      ...(origin && ALLOWED.includes(origin)
        ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
        : {}),
    },
  });
}
