import { getActivity, PROFILES, type Activity } from "@/lib/activity";
import s from "./Heatmaps.module.css";

const WEEKS = 53;
const CELL = 11;
const GAP = 3;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The last 53 weeks as columns of Sunday-to-Saturday cells, ending with the current week.
function grid(today: Date) {
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

export async function Heatmaps() {
  const activity = await getActivity();
  const weeks = grid(new Date());
  return (
    <section className={s.heatmaps} aria-labelledby="activity-title">
      <h2 id="activity-title" className={s.title}>
        Practice, daily
      </h2>
      <ActivityMap
        name="GitHub"
        unit="contributions"
        url={PROFILES.github.url}
        activity={activity.github}
        weeks={weeks}
      />
      <ActivityMap
        name="LeetCode"
        unit="submissions"
        url={PROFILES.leetcode.url}
        activity={activity.leetcode}
        weeks={weeks}
      />
      <ActivityMap
        name="Codeforces"
        unit="submissions"
        url={PROFILES.codeforces.url}
        activity={activity.codeforces}
        weeks={weeks}
      />
    </section>
  );
}
