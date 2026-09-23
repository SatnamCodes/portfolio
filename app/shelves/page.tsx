import type { Metadata } from "next";
import { Page } from "@/components/Page";
import { LibraryFromContent } from "./LibraryFromContent";

export const metadata: Metadata = { title: "Shelves" };

export default function ShelvesPage() {
  return (
    <Page>
      <LibraryFromContent />
    </Page>
  );
}
