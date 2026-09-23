export function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div
      style={{
        maxWidth: "var(--page-max)",
        marginInline: "auto",
        padding: "var(--space-xxl) var(--gutter)",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 400,
          fontSize: "var(--type-display-xl)",
          lineHeight: "var(--leading-display)",
        }}
      >
        {title}
      </h1>
      <p
        style={{
          marginTop: "var(--space-md)",
          fontStyle: "italic",
          color: "var(--color-ink-muted)",
        }}
      >
        [{note}]
      </p>
    </div>
  );
}
