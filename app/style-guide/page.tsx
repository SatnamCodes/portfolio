import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { color, spectrum, type } from "@/lib/tokens";
import { contrastRatio } from "@/lib/contrast";
import Placeholder from "@/content/roads/sample-short.mdx";
import s from "./style-guide.module.css";

export const metadata: Metadata = {
  title: "Style guide",
  robots: { index: false, follow: false },
};

const typeSamples: { token: keyof typeof type; family: string; label: string }[] = [
  { token: "displayXl", family: "var(--font-display)", label: "Why I'm here" },
  { token: "displayLg", family: "var(--font-display)", label: "Roads that travel outward" },
  { token: "displayMd", family: "var(--font-display)", label: "A notebook of small questions" },
  {
    token: "bodyLg",
    family: "var(--font-body)",
    label: "The long evening light came in sideways.",
  },
  {
    token: "bodyMd",
    family: "var(--font-body)",
    label:
      "The long evening light came in sideways, and the dust in it moved like something thinking.",
  },
  { token: "bodySm", family: "var(--font-body)", label: "A footnote, set small but never faint." },
  { token: "meta", family: "var(--font-meta)", label: "Research · 23 September 2026" },
  { token: "metaSm", family: "var(--font-meta)", label: "Six minute read" },
];

const pairs = [
  ["espresso", "seaSand"],
  ["espressoTint1", "seaSand"],
  ["espressoTint2", "seaSand"],
  ["espressoTint2", "seaSandShade1"],
  ["espresso", "seaSandShade1"],
  ["espresso", "seaSandShade2"],
  ["seaSand", "espresso"],
] as const;

const handSample =
  "Different paths, same light. I keep coming back to this — the idea that a thing can split apart and still be whole.";

export default function StyleGuide() {
  if (process.env.NODE_ENV === "production" && process.env.STYLE_GUIDE !== "1") notFound();

  return (
    <div className={s.page}>
      <header className={s.header}>
        <p className={s.eyebrow}>Internal · not linked</p>
        <h1 className={s.title}>Style guide</h1>
      </header>

      <section aria-labelledby="sg-color" className={s.section}>
        <h2 id="sg-color" className={s.h2}>
          Structural colour
        </h2>
        <ul className={s.swatches}>
          {Object.entries(color).map(([name, hex]) => (
            <li key={name} className={s.swatch}>
              <span className={s.chip} style={{ background: hex }} />
              <span className={s.swatchName}>{name}</span>
              <span className={s.swatchHex}>{hex}</span>
            </li>
          ))}
        </ul>

        <h3 className={s.h3}>Contrast (WCAG 2.x)</h3>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">Text</th>
              <th scope="col">Background</th>
              <th scope="col">Ratio</th>
              <th scope="col">AA body (4.5)</th>
              <th scope="col">AA large (3.0)</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map(([fg, bg]) => {
              const r = contrastRatio(color[fg], color[bg]);
              return (
                <tr key={`${fg}-${bg}`}>
                  <td>{fg}</td>
                  <td>{bg}</td>
                  <td>
                    <span
                      className={s.sampleCell}
                      style={{ color: color[fg], background: color[bg] }}
                    >
                      {r.toFixed(2)}:1
                    </span>
                  </td>
                  <td>{r >= 4.5 ? "pass" : "fail"}</td>
                  <td>{r >= 3 ? "pass" : "fail"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="sg-spectrum" className={s.section}>
        <h2 id="sg-spectrum" className={s.h2}>
          Spectrum
        </h2>
        <p className={s.note}>Used only inside the prism scene. Never used as a UI accent.</p>
        <ul className={s.spectrum}>
          {Object.entries(spectrum).map(([name, hex]) => (
            <li key={name} style={{ background: hex }}>
              <span className="visually-hidden">
                {name} {hex}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sg-type" className={s.section}>
        <h2 id="sg-type" className={s.h2}>
          Type scale
        </h2>
        <dl className={s.typeList}>
          {typeSamples.map(({ token, family, label }) => (
            <div key={token} className={s.typeRow}>
              <dt className={s.typeToken}>{token}</dt>
              <dd
                style={{
                  fontFamily: family,
                  fontSize: type[token],
                  lineHeight: token.startsWith("display") ? "var(--leading-display)" : undefined,
                  letterSpacing: token.startsWith("meta") ? "var(--tracking-meta)" : undefined,
                  textTransform: token.startsWith("meta") ? "uppercase" : undefined,
                }}
              >
                {label}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="sg-hand" className={s.section}>
        <h2 id="sg-hand" className={s.h2}>
          Handwriting
        </h2>
        <div className={s.hands}>
          <figure className={s.hand}>
            <figcaption className={s.handLabel}>Fountain pen · Wanderings (thoughts)</figcaption>
            <p className={s.fountain}>{handSample}</p>
            <p className={s.fountain} style={{ fontSize: "1.25rem" }}>
              A mind that wanders builds anyways.
            </p>
          </figure>
          <figure className={s.hand}>
            <figcaption className={s.handLabel}>Gel pen · Shelves (notes)</figcaption>
            <p className={s.gel}>{handSample}</p>
            <p className={s.gel}>
              <strong>Note:</strong> refraction index n depends on wavelength — violet bends most.
            </p>
          </figure>
        </div>
      </section>

      <section aria-labelledby="sg-mdx" className={s.section}>
        <h2 id="sg-mdx" className={s.h2}>
          MDX pipeline
        </h2>
        <p className={s.note}>content/roads/sample-short.mdx, rendered below.</p>
        <div className={s.mdx}>
          <Placeholder />
        </div>
      </section>
    </div>
  );
}
