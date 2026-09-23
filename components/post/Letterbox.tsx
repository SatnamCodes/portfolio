// A wall letterbox in the site's line-art style. Geometry is fixed (viewBox 200×300) because the submit
// sequence clones this exact element and needs the slot's position: see SLOT below.
export const LETTERBOX_VIEWBOX = { width: 200, height: 300 };
export const SLOT = { x: 62, y: 96, width: 76 };

export function Letterbox({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 300"
      role="img"
      aria-label="A letterbox"
      data-letterbox=""
      style={{
        ["--ink" as string]: "var(--color-espresso)",
        ["--fill" as string]: "var(--color-sea-sand)",
      }}
    >
      <g
        data-part="body"
        fill="var(--fill)"
        stroke="var(--ink)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
      >
        <path d="M32 288V72c0-30 30-48 68-48s68 18 68 48v216Z" vectorEffect="non-scaling-stroke" />
        <path d="M24 72h152" vectorEffect="non-scaling-stroke" />
        <path d="M40 58c14-14 34-20 60-20" vectorEffect="non-scaling-stroke" opacity="0.5" />
        <rect
          x="62"
          y="92"
          width="76"
          height="8"
          rx="4"
          fill="var(--ink)"
          vectorEffect="non-scaling-stroke"
        />
        <rect x="74" y="122" width="52" height="18" rx="2" vectorEffect="non-scaling-stroke" />
        <text
          x="100"
          y="135"
          textAnchor="middle"
          fontSize="10"
          letterSpacing="2.5"
          fill="var(--ink)"
          stroke="none"
          style={{ fontFamily: "var(--font-meta)" }}
        >
          POST
        </text>
        <rect x="52" y="160" width="96" height="104" rx="5" vectorEffect="non-scaling-stroke" />
        <circle cx="100" cy="206" r="4" vectorEffect="non-scaling-stroke" />
        <path d="M100 210v9" vectorEffect="non-scaling-stroke" />
        <path d="M12 290h176" vectorEffect="non-scaling-stroke" />
      </g>
      <rect
        data-part="flap"
        x="58"
        y="85"
        width="84"
        height="12"
        rx="3"
        fill="var(--fill)"
        stroke="var(--ink)"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        style={{ transformBox: "fill-box", transformOrigin: "50% 0%" }}
      />
    </svg>
  );
}
