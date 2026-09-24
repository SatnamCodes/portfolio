"use client";

import { setPlainType, usePlainType } from "@/lib/plain-type";

// Wraps handwritten content; `data-plain` switches it to an ordinary typeset article (see the ink
// stylesheets). The toggle is labelled "View as article" / "View as notebook".
export function PlainTypeFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const plain = usePlainType();
  return (
    <div className={className} data-plain={plain || undefined}>
      {children}
    </div>
  );
}

export function PlainTypeToggle({ className }: { className?: string }) {
  const plain = usePlainType();
  return (
    <button
      type="button"
      className={className}
      aria-pressed={plain}
      onClick={() => setPlainType(!plain)}
    >
      {plain ? "View as notebook" : "View as article"}
    </button>
  );
}
