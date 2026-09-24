"use client";

import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/base-path";
import s from "./Heatmaps.module.css";

export type Activity = { days: Record<string, number>; total: number };
export type ActivityData = {
  at: string;
  github: Activity | null;
  leetcode: Activity | null;
  codeforces: Activity | null;
};

// Where fresh numbers come from: this site's own endpoint, or (on the static GitHub Pages copy)
// the Vercel deployment's.
const SOURCE = process.env.NEXT_PUBLIC_ACTIVITY_URL ?? asset("/api/activity");
const REFRESH_MS = 5 * 60 * 1000;

const WEEKS = 53;
const CELL = 11;
const GAP = 3;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The last 53 weeks as columns of Sunday-to-Saturday cells, ending with the current week.
function grid(todayIso: string) {
  const today = new Date(todayIso);
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - end.getUTCDay() - (WEEKS - 1) * 7);
  const weeks: { date: string; month: number; future: boolean }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + w * 7 + d);
      col.push({
        date: day.toISOString().slice(0, 10),
        month: day.getUTCMonth(),
        future: day > end,
      });
    }
    weeks.push(col);
  }
  return weeks;
}

// Five levels: none, then quartiles of this source's own busy days, so each map reads on its own scale.
function levels(activity: Activity) {
  const counts = Object.values(activity.days)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const q = (p: number) => counts[Math.min(counts.length - 1, Math.floor(counts.length * p))] ?? 1;
  const cuts = [q(0.25), q(0.5), q(0.75)];
  return (n: number) => (n <= 0 ? 0 : n <= cuts[0] ? 1 : n <= cuts[1] ? 2 : n <= cuts[2] ? 3 : 4);
}

function ActivityMap({
  name,
  unit,
  url,
  activity,
  weeks,
}: {
  name: string;
  unit: string;
  url: string;
  activity: Activity | null;
  weeks: ReturnType<typeof grid>;
}) {
  const inRange = new Set(weeks.flat().map((c) => c.date));
  const yearTotal = activity
    ? Object.entries(activity.days).reduce((a, [d, n]) => a + (inRange.has(d) ? n : 0), 0)
    : 0;
  const level = activity ? levels(activity) : () => 0;
  const width = WEEKS * (CELL + GAP);
  const height = 7 * (CELL + GAP) + 16;

  return (
    <figure className={s.map}>
      <figcaption className={s.caption}>
        <a href={url} target="_blank" rel="noopener noreferrer" className={s.name}>
          {name}
          <span aria-hidden="true"> ↗</span>
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
        <span className={s.total}>
          {activity
            ? `${yearTotal.toLocaleString("en-GB")} ${unit} in the last year`
            : "Unavailable right now"}
        </span>
      </figcaption>
      <div className={s.scroll}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="img"
          aria-label={`${name}: ${activity ? `${yearTotal} ${unit} in the last year` : "activity unavailable"}`}
        >
          {weeks.map((col, w) =>
            col[0].date.slice(8) <= "07" && (w === 0 || col[0].month !== weeks[w - 1][0].month) ? (
              <text key={`m${w}`} x={w * (CELL + GAP)} y={10} className={s.month}>
                {MONTHS[col[0].month]}
              </text>
            ) : null,
          )}
          {weeks.map((col, w) => (
            <g key={w} style={{ "--w": w } as React.CSSProperties}>
              {col.map((c, d) => {
                if (c.future) return null;
                const n = activity?.days[c.date] ?? 0;
                return (
                  <rect
                    key={d}
                    x={w * (CELL + GAP)}
                    y={16 + d * (CELL + GAP)}
                    width={CELL}
                    height={CELL}
                    data-level={level(n)}
                  >
                    {n > 0 && <title>{`${n} ${unit} on ${c.date}`}</title>}
                  </rect>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    </figure>
  );
}

const MAPS = [
  { key: "github", name: "GitHub", unit: "contributions" },
  { key: "leetcode", name: "LeetCode", unit: "submissions" },
  { key: "codeforces", name: "Codeforces", unit: "submissions" },
] as const;

/** The three heatmaps, kept current: they re-check every few minutes while the page is open,
 *  and draw themselves in, week by week, the first time they scroll into view. */
export function HeatmapsLive({
  initial,
  urls,
}: {
  initial: ActivityData;
  urls: Record<string, string>;
}) {
  const [data, setData] = useState(initial);
  const [shown, setShown] = useState(false);
  const [armed, setArmed] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Only hide the squares once we can reveal them (without scripts they simply show).
    setArmed(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(true), {
      threshold: 0.15,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let stop = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(SOURCE, { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as ActivityData;
        if (!stop)
          setData((prev) => ({
            at: next.at,
            // Keep what we had for a source that failed this time.
            github: next.github ?? prev.github,
            leetcode: next.leetcode ?? prev.leetcode,
            codeforces: next.codeforces ?? prev.codeforces,
          }));
      } catch {}
    };
    check();
    const timer = setInterval(check, REFRESH_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      stop = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  const weeks = grid(data.at);
  const checked = new Date(data.at);
  return (
    <section
      ref={ref}
      className={s.heatmaps}
      data-armed={armed || undefined}
      data-shown={shown || undefined}
      aria-labelledby="activity-title"
    >
      <h2 id="activity-title" className={s.title}>
        Practice, daily
        <span className={s.updated}>
          Checked{" "}
          {checked.toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC",
          })}{" "}
          UTC
        </span>
      </h2>
      {MAPS.map((m) => (
        <ActivityMap
          key={m.key}
          name={m.name}
          unit={m.unit}
          url={urls[m.key]}
          activity={data[m.key]}
          weeks={weeks}
        />
      ))}
    </section>
  );
}
