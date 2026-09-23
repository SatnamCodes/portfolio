// Small marginal marks, the kind left in a journal's margin. Purely decorative.
const MARKS = {
  asterisk: (
    <path d="M12 3.5c.3 5.6-.2 11.4.4 17M4.6 8.2c4.7 2.4 10.2 5.3 14.9 7.4M19.2 7.6c-4.4 3-10 5.9-14.7 8.6" />
  ),
  circle: (
    <path d="M13.5 3.2C7.6 2.6 3.4 7 3.6 12.3c.2 5.1 4.6 8.8 9.4 8.4 5.1-.4 8.1-4.7 7.6-9.4C20 6.6 16.4 3.9 11.2 4.4" />
  ),
  tick: <path d="M3.5 12.8c2 1.6 3.6 3.6 5 6 3-6.3 7.1-11.3 12-15" />,
  swoosh: <path d="M2.5 15.5c4-2.6 8.4-3.4 12.8-2.6 2.2.4 4.2 1.1 6.2 2.3" />,
  dash: <path d="M4 12.6c5.3-.8 10.7-.9 16-.4" />,
} as const;

export type MarkName = keyof typeof MARKS | "none";
export const MARK_NAMES = [
  "none",
  "none",
  "asterisk",
  "circle",
  "tick",
  "swoosh",
  "dash",
] as const satisfies readonly MarkName[];

export function Mark({ name, className }: { name: MarkName; className?: string }) {
  if (name === "none") return null;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {MARKS[name]}
    </svg>
  );
}
