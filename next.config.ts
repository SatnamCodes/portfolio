import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import bundleAnalyzer from "@next/bundle-analyzer";

type Header = { key: string; value: string };

const securityHeaders: Header[] = [
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline'" +
      // React's development build uses eval() for debugging; production never does.
      (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "") +
      "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

// GITHUB_PAGES=1 builds the static mirror for GitHub Pages (.github/workflows/pages.yml): a plain
// export under /portfolio, with no server features (API routes, headers, image optimisation).
const pages = process.env.GITHUB_PAGES === "1";
const basePath = pages ? (process.env.NEXT_PUBLIC_BASE_PATH ?? "/portfolio") : "";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
  ...(pages
    ? {
        output: "export" as const,
        basePath,
        trailingSlash: true,
        images: { loader: "custom" as const, loaderFile: "./lib/image-loader.ts" },
      }
    : {}),
  outputFileTracingExcludes: {
    "/*": ["content/**/*"],
  },
  // Static hosting can't send headers; the export skips them.
  ...(pages ? {} : { headers }),
};

async function headers() {
  return [
    {
      source: "/:path*",
      headers: securityHeaders,
    },
    // API responses are never search results.
    {
      source: "/api/:path*",
      headers: [...securityHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
    },
    {
      source: "/style-guide",
      headers: [...securityHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    },
  ];
}

const withMDX = createMDX({});
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

export default withBundleAnalyzer(withMDX(nextConfig));
