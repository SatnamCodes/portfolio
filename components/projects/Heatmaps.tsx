import { getActivity, PROFILES } from "@/lib/activity";
import { HeatmapsLive } from "./HeatmapsLive";

// Server-rendered first (so the numbers are in the HTML), then kept live in the browser.
export async function Heatmaps() {
  const activity = await getActivity();
  return (
    <HeatmapsLive
      initial={activity}
      urls={{
        github: PROFILES.github.url,
        leetcode: PROFILES.leetcode.url,
        codeforces: PROFILES.codeforces.url,
      }}
    />
  );
}
