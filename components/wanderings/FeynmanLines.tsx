import { PATHS } from "./feynman-paths";
import s from "./FeynmanLines.module.css";

// An abstract line portrait of Richard Feynman: tone contours and hatching traced from a
// photograph of him at the blackboard, kept to his silhouette (no background). Ink only;
// with `animate` the lines draw themselves: outline, hair, face, then the smile.


export function FeynmanLines({ animate, className }: { animate?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 375 305"
      className={`${s.lines} ${className ?? ""}`}
      data-animate={animate || undefined}
      role="img"
      aria-label="An abstract line portrait of Richard Feynman, smiling, with his wavy hair and an open collar."
    >
      {PATHS.map((d, i) => (
        <path key={i} d={d} pathLength={1} style={{ "--i": i } as React.CSSProperties} />
      ))}
    </svg>
  );
}
