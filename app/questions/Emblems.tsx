// One emblem per thinker, drawn in ink: their work, not their face (no invented likenesses).
const E: Record<string, React.ReactNode> = {
  socrates: (
    <>
      <path d="M50 22c-12 0-20 8-20 18 0 9 6 13 12 16v10" />
      <circle cx="42" cy="78" r="2.5" fill="currentColor" />
    </>
  ),
  euclid: (
    <>
      <circle cx="40" cy="58" r="20" />
      <circle cx="60" cy="58" r="20" />
      <path d="M40 58h20L50 40.7Z" />
    </>
  ),
  newton: (
    <>
      <circle cx="50" cy="58" r="12" />
      <path d="M50 46v-6" />
      <circle cx="50" cy="58" r="26" strokeDasharray="2 4" />
      <path d="M50 40c10 0 20 6 24 16" />
      <circle cx="74" cy="56" r="2.5" fill="currentColor" />
    </>
  ),
  faraday: (
    <>
      <rect x="36" y="53" width="28" height="10" />
      <path d="M36 58c-14-22 42-22 28 0M36 58c-14 22 42 22 28 0M36 58c-24-34 52-34 28 0M36 58c-24 34 52 34 28 0" />
    </>
  ),
  maxwell: (
    <>
      <path d="M22 58c7-14 14-14 21 0s14 14 21 0 14-14 21 0" />
      <path d="M22 58h63" strokeDasharray="1 3" />
      <text x="50" y="34" textAnchor="middle">
        ∇×B
      </text>
    </>
  ),
  einstein: (
    <>
      <circle cx="36" cy="54" r="11" />
      <path d="M36 54v-8M36 54l5 3" />
      <circle cx="66" cy="54" r="11" />
      <path d="M66 54v-8M66 54l2 5" />
      <path d="M20 78c20-8 40-8 60 0" />
    </>
  ),
  cantor: (
    <>
      <path
        d="M30 34h40v40H30ZM30 44h40M30 54h40M30 64h40M40 34v40M50 34v40M60 34v40"
        opacity=".5"
      />
      <path d="M30 34l40 40" />
      <text x="50" y="92" textAnchor="middle">
        ℵ₀
      </text>
    </>
  ),
  godel: (
    <>
      <text x="50" y="50" textAnchor="middle">
        G
      </text>
      <path d="M60 46c14 4 12 26-10 26S30 50 40 46" />
      <path d="M37 42l3 4 4-2" />
    </>
  ),
  turing: (
    <>
      <path d="M18 60h64M18 72h64M28 60v12M40 60v12M52 60v12M64 60v12M76 60v12" />
      <path d="M46 44h12l-6 10Z" />
      <text x="34" y="69" textAnchor="middle">
        0
      </text>
      <text x="58" y="69" textAnchor="middle">
        1
      </text>
    </>
  ),
  keats: (
    <>
      <path d="M66 26C44 38 36 58 34 80" />
      <path d="M66 26c-2 18-14 34-28 42" />
      <path d="M26 86h40" strokeDasharray="1 3" />
    </>
  ),
};

export function Emblem({ id }: { id: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {E[id]}
    </svg>
  );
}
