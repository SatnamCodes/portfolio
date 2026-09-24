import type { MetadataRoute } from "next";
import { absolute, SITE_URL } from "@/lib/seo";

// Generated at build time (also required by the static GitHub Pages export).
export const dynamic = "force-static";

// Public content is open to every crawler, search engines and AI search crawlers alike; nothing is
// blocked by user agent. Disallowed, deliberately:
//   /api/  the letter endpoint (POST only) and internal endpoints; not content.
// /style-guide is NOT disallowed: it carries noindex (meta and X-Robots-Tag), and a crawler must be
// able to fetch it to see that.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: absolute("/sitemap.xml"),
    host: SITE_URL,
  };
}
