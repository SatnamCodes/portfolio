import s from "./FeynmanLines.module.css";

// An abstract line portrait of Richard Feynman in his later years, drawn from descriptions of him
// (thin, longish hair swept back, a lined face, the smile that never left) rather than from any
// photograph. Beside him, his own signature: a Feynman diagram, two electrons exchanging a
// virtual photon. Ink only, no background; with `animate` the lines draw themselves in order.

// viewBox 0 0 260 250. Order matters: it is the drawing order.
const PATHS: string[] = [
  // The diagram: two electron lines meeting at vertices, a wavy photon between them.
  "M14 34 L40 54",
  "M40 54 L66 34",
  "M14 118 L40 98",
  "M40 98 L66 118",
  "M40 54 q6 4 0 8 q-6 4 0 8 q6 4 0 8 q-6 4 0 8 q6 4 0 6",
  "M24 42 l4 1 l-1 4",
  "M56 42 l-1 -4 l4 1",
  // Hair: longish, wavy, swept back from a high forehead.
  "M118 92 C120 58, 158 40, 196 50 C220 58, 232 82, 226 110",
  "M124 82 C140 58, 178 52, 206 66 C222 76, 228 96, 224 124",
  "M132 72 C154 56, 188 58, 212 80",
  "M196 50 C212 44, 230 56, 238 74",
  "M226 110 C234 124, 232 138, 242 150",
  "M224 124 C230 136, 226 150, 234 162",
  // Face: long, lined, turned slightly.
  "M120 96 C112 126, 114 166, 132 192 C146 210, 170 214, 186 200 C202 186, 208 152, 202 116",
  // Brows, raised in amusement.
  "M134 116 q10 -8 22 -3",
  "M170 110 q11 -7 22 -1",
  // Eyes that twinkle: crinkled arcs, with laugh lines at the corners.
  "M138 128 q7 -5 14 0",
  "M173 122 q7 -5 14 0",
  "M190 118 l7 -3 M190 123 l7 1",
  // Nose.
  "M162 128 C160 144, 154 152, 162 157 q6 2 11 -2",
  // The grin, wide, with deep smile lines.
  "M142 168 C154 184, 178 184, 192 164",
  "M148 172 q20 9 40 -4",
  "M138 158 q-5 9 2 18",
  "M196 154 q6 9 -1 19",
  // Ear.
  "M202 124 C214 122, 216 146, 204 150",
  // Neck and an open collar.
  "M144 204 L142 234",
  "M184 204 L188 234",
  "M126 246 L150 222 L166 246 L182 222 L206 246",
];

export function FeynmanLines({ animate, className }: { animate?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 260 250"
      className={`${s.lines} ${className ?? ""}`}
      data-animate={animate || undefined}
      role="img"
      aria-label="An abstract line portrait of Richard Feynman, smiling, with his hair swept back, beside a Feynman diagram of two electrons exchanging a photon."
    >
      {PATHS.map((d, i) => (
        <path key={i} d={d} pathLength={1} style={{ "--i": i } as React.CSSProperties} />
      ))}
    </svg>
  );
}
