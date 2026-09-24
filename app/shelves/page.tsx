import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbs, webPage } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { Page } from "@/components/Page";
import { LibraryFromContent } from "./LibraryFromContent";

export const metadata: Metadata = pageMetadata({
  title: "Shelves",
  description:
    "Satnam's shelves: notes on books in computer science, physics and mathematics, philosophy, and current reads.",
  path: "/shelves",
  type: "website",
});

export default function ShelvesPage() {
  return (
    <Page>
      <JsonLd
        nodes={[
          webPage("/shelves", "Shelves", metadata.description!, "CollectionPage"),
          breadcrumbs([{ name: "Shelves", path: "/shelves" }]),
        ]}
      />
      <LibraryFromContent />
    </Page>
  );
}
