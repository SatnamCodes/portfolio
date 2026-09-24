// Renders one JSON-LD graph for the page. Nodes are merged into a single @graph so shared entities
// (the site, its owner) are referenced by @id rather than duplicated. `<` is escaped so content can
// never close the script element.
export function JsonLd({ nodes }: { nodes: Record<string, unknown>[] }) {
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(
    /</g,
    "\\u003c",
  );
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
