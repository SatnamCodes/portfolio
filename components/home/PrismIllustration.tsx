import {
  equilateral,
  narrowShift,
  PRISM_SCALE,
  traceDispersion,
  type Vec2,
} from "@/lib/prism-optics";
import { color, spectrum } from "@/lib/tokens";

const BAND_COLORS = Object.values(spectrum);
const ROT = (8.5 * Math.PI) / 180;

export type IllustrationLayout = {
  triangle: Vec2[];
  entry: Vec2;
  start: Vec2;
  internal: Vec2[];
  ends: Vec2[];
};

// A 2D pass of the same optics as the WebGL scene, in stage pixels (y down).
export function illustrationLayout(
  w: number,
  h: number,
  labelX: number | null,
): IllustrationLayout {
  // Same scale as the WebGL scene: the original 70svh stage framed 5.63 scene units.
  const unit = (PRISM_SCALE * Math.min(736, Math.max(320, window.innerHeight * 0.7))) / 5.63;
  const side = labelX === null ? PRISM_SCALE * Math.min(w * 0.2, h * 0.42) : 2.4 * unit;
  const center: Vec2 = [w * (labelX === null ? 0.34 : 0.47) - narrowShift(w), h * 0.5];
  const toPx = ([x, y]: Vec2): Vec2 => {
    const rx = x * Math.cos(ROT) - y * Math.sin(ROT);
    const ry = x * Math.sin(ROT) + y * Math.cos(ROT);
    return [center[0] + rx, center[1] - ry];
  };
  const dirPx = ([x, y]: Vec2): Vec2 => [
    x * Math.cos(ROT) - y * Math.sin(ROT),
    -(x * Math.sin(ROT) + y * Math.cos(ROT)),
  ];

  const tri = equilateral(side);
  const trace = traceDispersion(tri, (18.75 * Math.PI) / 180, 0.49, 0.9);
  const entry = toPx(trace.entry);
  const inDir = dirPx(trace.incomingDir);
  const back = entry[0] / Math.max(0.01, inDir[0]);
  const start: Vec2 = [entry[0] - inDir[0] * back, entry[1] - inDir[1] * back];
  const targetX = labelX ?? w * 1.05;

  const internal: Vec2[] = [];
  const ends: Vec2[] = [];
  for (const band of trace.bands) {
    const p = toPx(band.internalEnd);
    const d = dirPx(band.exitDir);
    const t = (targetX - p[0]) / d[0];
    internal.push(p);
    ends.push([targetX, p[1] + d[1] * t]);
  }
  return { triangle: [tri.apex, tri.left, tri.right].map(toPx), entry, start, internal, ends };
}

export function PrismIllustration({
  width,
  height,
  layout,
  outlineOnly,
}: {
  width: number;
  height: number;
  layout: IllustrationLayout;
  outlineOnly: boolean;
}) {
  const pts = (p: Vec2[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="beam-in" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.25" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
      </defs>
      {!outlineOnly && (
        <g>
          <line
            x1={layout.start[0]}
            y1={layout.start[1]}
            x2={layout.entry[0]}
            y2={layout.entry[1]}
            stroke={color.espressoTint3}
            strokeOpacity={0.35}
            strokeWidth={9}
            strokeLinecap="round"
          />
          <line
            x1={layout.start[0]}
            y1={layout.start[1]}
            x2={layout.entry[0]}
            y2={layout.entry[1]}
            stroke="url(#beam-in)"
            strokeWidth={3}
          />
          {layout.ends.map((end, i) => (
            <g key={i} stroke={BAND_COLORS[i]} strokeLinecap="round">
              <line
                x1={layout.entry[0]}
                y1={layout.entry[1]}
                x2={layout.internal[i][0]}
                y2={layout.internal[i][1]}
                strokeOpacity={0.4}
                strokeWidth={1.5}
              />
              <line
                x1={layout.internal[i][0]}
                y1={layout.internal[i][1]}
                x2={end[0]}
                y2={end[1]}
                strokeOpacity={0.75}
                strokeWidth={4}
              />
            </g>
          ))}
        </g>
      )}
      <polygon
        points={pts(layout.triangle)}
        fill={outlineOnly ? "none" : color.seaSandShade1}
        fillOpacity={0.35}
        stroke={color.espresso}
        strokeOpacity={outlineOnly ? 0.18 : 0.45}
        strokeWidth={1.25}
        strokeLinejoin="round"
      />
    </svg>
  );
}
