import type { MetadataRoute } from "next";
import { publicRoutes } from "@/lib/routes";
import { absolute } from "@/lib/seo";

// Generated at build time (also required by the static GitHub Pages export).
export const dynamic = "force-static";

// Every public, canonical, indexable URL (drafts are already excluded from production content).
// lastModified appears only where content carries a real date. Well under the 50,000-URL limit;
// split with generateSitemaps() if that ever changes.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return (await publicRoutes()).map((r) => ({
    url: absolute(r.path),
    ...(r.lastModified ? { lastModified: r.lastModified } : {}),
  }));
}
