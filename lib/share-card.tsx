import "server-only";
import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { PATHS as FEYNMAN } from "@/components/wanderings/feynman-paths";
import { color } from "@/lib/tokens";

// Share cards for writings, made at build time for every entry (new ones included): the site
// banner's cream on Espresso, the writing's title, and a still of its animation. Section pages
// keep the banner (app/opengraph-image.jpg); only a writing gets one of these.

export const CARD_SIZE = { width: 1200, height: 630 };

const font = (file: string) => fs.readFileSync(path.join(process.cwd(), "assets/fonts", file));
const FONTS = [
  { name: "Instrument Serif", data: font("InstrumentSerif-Regular.ttf"), style: "normal" as const },
  { name: "Instrument Serif", data: font("InstrumentSerif-Italic.ttf"), style: "italic" as const },
  { name: "La Belle Aurore", data: font("LaBelleAurore.ttf"), style: "normal" as const },
];

const CREAM = color.seaSand;
const INK = color.espresso;

type Art = "feynman" | "kernel" | "trails";

/** The animation a writing is known by: its ending, else the first animated figure in it, else
 *  star trails (the site's own long exposure), so a new piece always has something. */
export function artFor(source: string, ending?: string): Art {
  if (ending === "feynman") return "feynman";
  if (source.includes("<KernelAnimation")) return "kernel";
  return "trails";
}

function seeded(key: string) {
  let seed = 7;
  for (const ch of key) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  seed = seed || 7;
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function Feynman() {
  return (
    <svg width="470" height="382" viewBox="0 0 375 305">
      {FEYNMAN.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={CREAM} strokeWidth="1.1" strokeLinecap="round" />
      ))}
    </svg>
  );
}

// The naive SGEMM kernel mid-run: a row of A and a column of B lit, their product landing in C.
function Kernel() {
  const n = 12;
  const cell = 16;
  const grid = (x0: number, y0: number, lit: (r: number, c: number) => number) => {
    const out = [];
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const a = lit(r, c);
        out.push(
          <rect
            key={`${x0}-${y0}-${r}-${c}`}
            x={x0 + c * cell}
            y={y0 + r * cell}
            width={cell - 2}
            height={cell - 2}
            fill={CREAM}
            fillOpacity={a}
          />,
        );
      }
    return out;
  };
  const off = n * cell + 24;
  return (
    <svg width="440" height="440" viewBox={`0 0 ${off * 2} ${off * 2}`}>
      {grid(off, 0, (r, c) => (c === 3 ? (r === 6 ? 0.95 : 0.35) : 0.1))}
      {grid(0, off, (r, c) => (r === 3 ? (c === 6 ? 0.95 : 0.35) : 0.1))}
      {grid(off, off, (r, c) =>
        r === 3 && c === 3 ? 0.95 : r < 3 || (r === 3 && c < 3) ? 0.55 : 0.1,
      )}
    </svg>
  );
}

// Star trails around a pole, the same long exposure as the Traces viewer, seeded by the piece.
function Trails({ seed }: { seed: string }) {
  const rand = seeded(seed);
  const arcs = Array.from({ length: 150 }, (_, i) => {
    const r = 12 + Math.pow(rand(), 0.7) * 250;
    const from = rand() * Math.PI * 2;
    const to = from + 0.25 + rand() * 0.9;
    const at = (a: number) => `${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`;
    return (
      <path
        key={i}
        d={`M${at(from)}A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${at(to)}`}
        fill="none"
        stroke={CREAM}
        strokeWidth={(0.6 + rand() * rand() * 2).toFixed(2)}
        strokeLinecap="round"
        strokeOpacity={(0.25 + rand() * 0.6).toFixed(2)}
      />
    );
  });
  return (
    <svg width="460" height="460" viewBox="-260 -260 520 520">
      {arcs}
      <circle cx="0" cy="0" r="2.5" fill={CREAM} />
    </svg>
  );
}

export function shareCard({
  title,
  section,
  art,
  seed,
}: {
  title: string;
  section: string;
  art: Art;
  seed: string;
}) {
  const size = title.length > 60 ? 54 : title.length > 36 ? 64 : 76;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: INK,
        color: CREAM,
        padding: "0 72px",
        fontFamily: "Instrument Serif",
      }}
    >
      <div style={{ display: "flex", width: 480, justifyContent: "center", alignItems: "center" }}>
        {art === "feynman" ? <Feynman /> : art === "kernel" ? <Kernel /> : <Trails seed={seed} />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: 64, gap: 22 }}>
        <div
          style={{
            fontSize: 22,
            fontStyle: "italic",
            letterSpacing: "0.12em",
            color: color.seaSandShade2,
          }}
        >
          {section}
        </div>
        <div style={{ fontSize: size, lineHeight: 1.05 }}>{title}</div>
        <div
          style={{
            fontFamily: "La Belle Aurore",
            fontSize: 30,
            marginTop: 18,
            color: color.seaSandShade1,
          }}
        >
          Satnam · a cartographer of the unseen
        </div>
      </div>
    </div>,
    { ...CARD_SIZE, fonts: FONTS },
  );
}
