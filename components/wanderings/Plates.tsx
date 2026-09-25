// Illustrations for the essay, engraved in ink with no background: thin lines and hatching in the
// text's own colour (currentColor), so they sit directly on the page in either view and in dark
// mode. Every curve is computed (the Gaussians and the mean are real). Pure SVG, no client JS.
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
