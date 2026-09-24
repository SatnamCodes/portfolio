import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { JsonLd } from "@/components/seo/JsonLd";
import { person, website } from "@/lib/schema";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

// Site-wide defaults. Each page adds its own description and canonical URL via pageMetadata()
// (lib/seo.ts); nothing canonical is set here, so no page can inherit another's canonical.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_GB" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, "max-image-preview": "large" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fff4e4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {/* The site and its owner: every page's own JSON-LD refers to these by @id. */}
        <JsonLd nodes={[website(), person()]} />
        <SiteNav />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
