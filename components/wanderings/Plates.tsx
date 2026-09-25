// Illustrations for the essay, drawn as archival scientific plates: thin ink on cream, hatched
// like engravings. Every curve is computed here (Gaussians, a stretching vortex, potential flow
// past a cylinder), and everything is drawn in currentColor, so the plates invert for dark mode.
// Server components: pure SVG, no client JavaScript.
import s from "./Plates.module.css";

type P = [number, number];
const d = (pts: P[]) =>
  pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const gauss = (x: number, mu: number, sd: number) => Math.exp(-((x - mu) ** 2) / (2 * sd * sd));

function Plate({
  label,
  children,
  viewBox = "0 0 400 260",
}: {
  label: string;
  children: React.ReactNode;
  viewBox?: string;
}) {
  return (
    <figure className={s.plate}>
      <svg viewBox={viewBox} role="img" aria-label={label} className={s.svg}>
        {children}
      </svg>
    </figure>
  );
}

/** Vertical hatching under a curve y(x) down to a baseline: the engraver's shading. */
function Hatch({
  f,
  x0,
  x1,
  base,
  step = 4,
  id,
}: {
  f: (x: number) => number;
  x0: number;
  x1: number;
  base: number;
  step?: number;
  id: string;
}) {
  const outline: P[] = [
    [x0, base],
    ...range(121).map((i) => {
      const x = x0 + ((x1 - x0) * i) / 120;
      return [x, f(x)] as P;
    }),
    [x1, base],
  ];
  return (
    <g>
      <clipPath id={id}>
        <path d={d(outline) + "Z"} />
      </clipPath>
      <g clipPath={`url(#${id})`} className={s.hatch}>
        {range(Math.ceil((x1 - x0) / step) + 1).map((i) => (
          <line key={i} x1={x0 + i * step} y1={base - 200} x2={x0 + i * step - 3} y2={base} />
        ))}
      </g>
    </g>
  );
}

function Axes({ x0, x1, base, top }: { x0: number; x1: number; base: number; top: number }) {
  return (
    <g className={s.thin}>
      <path d={`M${x0} ${top}V${base}H${x1}`} />
      {range(11).map((i) => {
        const x = x0 + ((x1 - x0) * i) / 10;
        return <line key={i} x1={x} y1={base} x2={x} y2={base + (i % 5 === 0 ? 6 : 3)} />;
      })}
      {range(5).map((i) => {
        const y = base - ((base - top) * (i + 1)) / 5;
        return <line key={i} x1={x0 - 3} y1={y} x2={x0} y2={y} />;
      })}
      {/* Arrowheads: marks run right, students run up. */}
      <path d={`M${x1 - 6} ${base - 3}L${x1} ${base}L${x1 - 6} ${base + 3}`} />
      <path d={`M${x0 - 3} ${top + 6}L${x0} ${top}L${x0 + 3} ${top + 6}`} />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// 1. From one bell to two

export function BellPlates() {
  const x0 = 40,
    x1 = 370,
    base = 220,
    top = 40,
    h = 150;
  const X = (u: number) => x0 + u * (x1 - x0);
  const one = (x: number) => base - h * gauss((x - x0) / (x1 - x0), 0.52, 0.13);
  // Two crowds: one handing work to agents (low marks), one building from fundamentals (high).
  const w1 = 0.5,
    w2 = 0.5,
    m1 = 0.2,
    m2 = 0.83,
    sd1 = 0.075,
    sd2 = 0.07;
  const two = (x: number) => {
    const u = (x - x0) / (x1 - x0);
    return base - (h * 0.92 * (w1 * gauss(u, m1, sd1) + w2 * gauss(u, m2, sd2))) / 0.5;
  };
  const mean = w1 * m1 + w2 * m2; // the average moves into the empty valley
  const curve = (f: (x: number) => number) =>
    d(
      range(161).map((i) => {
        const x = x0 + ((x1 - x0) * i) / 160;
        return [x, f(x)] as P;
      }),
    );
  const my = two(X(mean));
  return (
    <div className={s.pair}>
      <Plate label="A single bell curve of marks against students: most students bunched in the middle, thin tails at either end, the mean at the peak.">
        <Axes x0={x0} x1={x1} base={base} top={top} />
        <Hatch f={one} x0={x0} x1={x1} base={base} id="bell-one" />
        <path d={curve(one)} className={s.ink} />
        <line x1={X(0.52)} y1={base} x2={X(0.52)} y2={one(X(0.52)) - 8} className={s.dash} />
        <circle cx={X(0.52)} cy={one(X(0.52))} r={2.6} className={s.dot} />
      </Plate>
      <Plate label="A two-humped curve: one crowd at low marks, one at high marks. The dashed mean falls into the empty valley between them, where almost no one is.">
        <Axes x0={x0} x1={x1} base={base} top={top} />
        {/* The old bell, remembered faintly. */}
        <path d={curve(one)} className={s.ghost} />
        <Hatch f={two} x0={x0} x1={x1} base={base} id="bell-two" />
        <path d={curve(two)} className={s.ink} />
        <line x1={X(mean)} y1={base} x2={X(mean)} y2={top + 18} className={s.dash} />
        <circle cx={X(mean)} cy={my} r={2.6} className={s.dot} />
      </Plate>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// 2. What actually happened: a vortex tube stretching. As it thins, circulation is conserved, so
// it spins faster (angular velocity ∝ 1/r²): the mechanism behind a finite-time blow-up.

export function VortexPlate() {
  const xA = 30,
    xB = 380,
    cy = 140;
  const R = (x: number) => 3 + 62 * Math.pow(1 - (x - xA) / (xB - xA), 1.7);
  // Accumulated twist: dθ/dx ∝ 1/R² (normalised so the fat end turns slowly).
  const twist: number[] = [];
  let acc = 0;
  for (let i = 0; i <= 400; i++) {
    const x = xA + ((xB - xA) * i) / 400;
    acc += (((xB - xA) / 400) * 150) / (R(x) * R(x) + 90);
    twist.push(acc);
  }
  const th = (x: number) => twist[Math.round(((x - xA) / (xB - xA)) * 400)];
  const strands = range(6).map((k) => (k / 6) * Math.PI * 2);
  const front: string[] = [],
    back: string[] = [];
  for (const ph of strands) {
    let seg: P[] = [],
      isFront = true;
    const flush = () => {
      if (seg.length > 1) (isFront ? front : back).push(d(seg));
      seg = [];
    };
    for (let i = 0; i <= 400; i++) {
      const x = xA + ((xB - xA) * i) / 400;
      const a = th(x) + ph;
      const f = Math.cos(a) > 0;
      if (f !== isFront) {
        flush();
        isFront = f;
      }
      seg.push([x, cy + R(x) * Math.sin(a)]);
    }
    flush();
  }
  // Cross-sections (ellipses) along the tube, and the inflow that feeds the stretch.
  const rings = [42, 120, 200, 270];
  return (
    <Plate label="A vortex tube drawn as an engraving: wide and slowly turning at one end, stretching into a thin, tightly wound strand at the other.">
      {/* Inflow streamlines converging on the tube. */}
      <g className={s.thin}>
        {range(6).map((i) => {
          const y0 = 20 + i * 8,
            y1 = 260 - i * 8;
          return (
            <g key={i}>
              <path
                d={`M${60 + i * 40} ${y0} C ${140 + i * 40} ${y0 + 30}, ${200 + i * 30} ${cy - 50 + i * 6}, ${250 + i * 22} ${cy - R(250 + i * 22) - 4}`}
                className={s.faint}
              />
              <path
                d={`M${60 + i * 40} ${y1} C ${140 + i * 40} ${y1 - 30}, ${200 + i * 30} ${cy + 50 - i * 6}, ${250 + i * 22} ${cy + R(250 + i * 22) + 4}`}
                className={s.faint}
              />
            </g>
          );
        })}
      </g>
      {back.map((p, i) => (
        <path key={`b${i}`} d={p} className={s.back} />
      ))}
      {rings.map((x) => (
        <ellipse
          key={x}
          cx={x}
          cy={cy}
          rx={Math.max(1, R(x) * 0.28)}
          ry={R(x)}
          className={s.thin}
        />
      ))}
      {front.map((p, i) => (
        <path key={`f${i}`} d={p} className={s.ink} />
      ))}
      {/* Silhouette of the tube. */}
      <path
        d={d(
          range(101).map((i) => {
            const x = xA + ((xB - xA) * i) / 100;
            return [x, cy - R(x)] as P;
          }),
        )}
        className={s.ink}
      />
      <path
        d={d(
          range(101).map((i) => {
            const x = xA + ((xB - xA) * i) / 100;
            return [x, cy + R(x)] as P;
          }),
        )}
        className={s.ink}
      />
      {/* Stretch arrows along the axis. */}
      <g className={s.thin}>
        <path d={`M${xB - 30} ${cy + 40}h24m-6 -3l6 3l-6 3`} />
        <path d={`M${xA + 10} ${cy + 86}h-12m6 -3l-6 3l6 3`} />
      </g>
    </Plate>
  );
}

// ---------------------------------------------------------------------------------------------
// 3. How it started: 32 lanes of a warp meet a branch and part around it, becoming streamlines
// (potential flow past a cylinder: ψ = U·y·(1 − a²/r²)). The half that waits is dashed.

export function WarpPlate() {
  const cx = 150,
    cy = 130,
    a = 26,
    U = 1;
  const psi = (x: number, y: number) => {
    const dx = x - cx,
      dy = y - cy;
    const r2 = dx * dx + dy * dy;
    return U * -dy * (1 - (a * a) / Math.max(r2, a * a * 1.0001));
  };
  const lanes = range(32).map((i) => (i - 15.5) * 3.2); // offsets from the axis, far upstream
  const paths = lanes.map((off) => {
    const target = -off * U; // ψ far upstream, where y = cy + off
    const pts: P[] = [];
    for (let x = 20; x <= 390; x += 3) {
      // Solve ψ(x, y) = target for y on this lane's side. On either side ψ falls as y increases,
      // so the same bisection rule works above and below the cylinder.
      let lo = off < 0 ? cy - 140 : cy + 0.01,
        hi = off < 0 ? cy - 0.01 : cy + 140;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (psi(x, mid) > target) lo = mid;
        else hi = mid;
      }
      pts.push([x, (lo + hi) / 2]);
    }
    return pts;
  });
  return (
    <Plate
      viewBox="0 55 400 150"
      label="Thirty-two parallel lanes arrive from the left as ticked threads, meet a branch drawn as a small hatched disc, split around it, and flow on as smooth streamlines; one half is dashed, waiting its turn."
    >
      {paths.map((pts, i) => {
        const upstream = pts.filter(([x]) => x < cx - 60);
        const downstream = pts.filter(([x]) => x >= cx - 62);
        const waits = lanes[i] > 0; // divergence: this half of the warp is masked off
        return (
          <g key={i}>
            {/* Upstream: discrete threads, one tick per instruction. */}
            <path d={d(upstream)} className={s.thin} />
            {upstream
              .filter((_, k) => k % 6 === i % 6)
              .map(([x, y], k) => (
                <line key={k} x1={x} y1={y - 1.2} x2={x} y2={y + 1.2} className={s.thin} />
              ))}
            <path d={d(downstream)} className={waits ? s.dashFine : s.ink} />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={a - 1} className={s.disc} />
      <Hatch
        f={(x) => cy - Math.sqrt(Math.max(0, (a - 2) ** 2 - (x - cx) ** 2))}
        x0={cx - a + 2}
        x1={cx + a - 2}
        base={cy + a}
        step={3}
        id="warp-disc"
      />
      {/* A branch: the decision diamond, engraved on the obstacle. */}
      <path
        d={`M${cx} ${cy - 10}L${cx + 10} ${cy}L${cx} ${cy + 10}L${cx - 10} ${cy}Z`}
        className={s.ink}
      />
    </Plate>
  );
}

// ---------------------------------------------------------------------------------------------
// 5. Mathematics is practice: finding 3⁻¹ mod 7 by hand, wrong turns left in.

export function InversePlate() {
  const lines: { t: string; struck?: boolean; boxed?: boolean; indent?: number }[] = [
    { t: "3x ≡ 1  (mod 7)" },
    { t: "x = 1 :  3 ≡ 3", struck: true, indent: 14 },
    { t: "x = 2 :  6 ≡ 6", struck: true, indent: 14 },
    { t: "x = 3 :  9 ≡ 2", struck: true, indent: 14 },
    { t: "x = 4 :  12 ≡ 5", struck: true, indent: 14 },
    { t: "x = 5 :  15 ≡ 1", boxed: true, indent: 14 },
    { t: "7 = 2·3 + 1  ⇒  1 = 7 − 2·3", indent: 0 },
    { t: "⇒  3·(−2) ≡ 1  ⇒  −2 ≡ 5", indent: 0 },
    { t: "3^-1 ≡ 5  (mod 7)", boxed: true, indent: 70 },
  ];
  return (
    <Plate
      label="A page of handwritten working finding the inverse of 3 modulo 7: trying x = 1 to 4 and crossing each out, finding x = 5 gives 15 ≡ 1, then checking it with the Euclidean algorithm."
      viewBox="0 0 400 300"
    >
      <rect x={30} y={10} width={340} height={280} className={s.paper} />
      <line x1={62} y1={10} x2={62} y2={290} className={s.margin} />
      {range(10).map((i) => (
        <line key={i} x1={30} y1={40 + i * 26} x2={370} y2={40 + i * 26} className={s.rule} />
      ))}
      {lines.map((l, i) => {
        const x = 74 + (l.indent ?? 0),
          y = 34 + i * 26 + (i > 5 ? 8 : 0);
        const w = l.t.length * 8.2;
        return (
          <g key={i}>
            <text x={x} y={y} className={s.hand}>
              {l.t.includes("^-1") ? (
                <>
                  {l.t.split("^-1")[0]}
                  <tspan dy={-8} fontSize={11}>
                    −1
                  </tspan>
                  <tspan dy={8}>{l.t.split("^-1")[1]}</tspan>
                </>
              ) : (
                l.t
              )}
            </text>
            {/* Struck through by hand: a wavy line, not a clean rule. */}
            {l.struck && (
              <path
                d={d(
                  range(21).map(
                    (k) => [x - 4 + (k / 20) * (w + 8), y - 6 + Math.sin(k * 1.3 + i) * 1.4] as P,
                  ),
                )}
                className={s.strike}
              />
            )}
            {l.boxed && (
              <rect x={x - 6} y={y - 18} width={w + 10} height={25} rx={3} className={s.box} />
            )}
          </g>
        );
      })}
      <path d="M300 170 l6 7 l12 -14" className={s.ink} />
    </Plate>
  );
}

// For MDX: <BellPlates /> etc. are passed to the essay through the components map.
export const plates = {
  BellPlates,
  VortexPlate,
  WarpPlate,
  InversePlate,
};
