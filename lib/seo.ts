import type { Metadata } from "next";

// One place for everything search engines and AI systems read about the site: the production origin,
// the owner's identity and profiles, and a helper that gives every page the same metadata shape.

// Production origin. Preview deployments must never become canonical, so this comes from
// configuration (NEXT_PUBLIC_SITE_URL) and falls back to the production domain, not VERCEL_URL.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://satnamportfolio.vercel.app")
  .trim()
  .replace(/\/+$/, "");

export const SITE_NAME = "Satnam";
export const SITE_DESCRIPTION =
  "Satnam's personal site: GPU computing with CUDA, machine learning and systems projects, research notes, blogs, book notes and astrophotography.";

// Profiles that genuinely belong to the site's owner (used as Person.sameAs and in llms.txt).
export const PROFILES = {
  github: "https://github.com/SatnamCodes",
  linkedin: "https://www.linkedin.com/in/satnamcodes/",
  x: "https://x.com/gitblamesatnam",
  leetcode: "https://leetcode.com/u/EliasCross/",
  codeforces: "https://codeforces.com/profile/WiredInSatnam",
} as const;

/** Absolute, canonical form of a site path: production origin, no trailing slash, no query. */
export function absolute(path = "/") {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return clean === "/" ? `${SITE_URL}/` : `${SITE_URL}${clean.startsWith("/") ? "" : "/"}${clean}`;
}

type PageMeta = {
  title?: string;
  description: string;
  path: string;
  type?: "website" | "article" | "profile" | "book";
  published?: string;
  modified?: string;
  noindex?: boolean;
  /** The page has its own opengraph-image route (a writing's card); section pages leave this out
   *  and share the banner. */
  ownCard?: boolean;
};

// The site's share card (app/opengraph-image.jpg). Repeated per page because a page's own openGraph
// object replaces, rather than merges with, the inherited one.
const SHARE_IMAGE = {
  url: "/opengraph-image.jpg",
  width: 1280,
  height: 720,
  alt: "Satnam, seen from behind, in front of the name SATNAM in large cream letters on dark brown, with the words: A cartographer of the unseen.",
};

/** Metadata for one page: title, description, canonical, Open Graph and X card, all consistent. */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  published,
  modified,
  noindex,
  ownCard,
}: PageMeta): Metadata {
  const url = absolute(path);
  // A page with its own card leaves `images` out, so its opengraph-image route supplies it.
  const images = ownCard ? {} : { images: [SHARE_IMAGE] };
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: SITE_NAME,
      locale: "en_GB",
      ...(title ? { title } : {}),
      description,
      ...images,
      ...(type === "article" && published
        ? { publishedTime: published, ...(modified ? { modifiedTime: modified } : {}) }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      ...(title ? { title } : {}),
      description,
      ...images,
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
