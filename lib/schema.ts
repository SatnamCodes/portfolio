import { absolute, PROFILES, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./seo";

// Schema.org builders. Every node describes something visible on the page it's attached to, and
// shared entities (the site, its owner) use stable @id values so pages link into one graph.

export const IDS = {
  website: `${SITE_URL}/#website`,
  person: `${SITE_URL}/#person`,
} as const;

type Node = Record<string, unknown>;

export function website(): Node {
  return {
    "@type": "WebSite",
    "@id": IDS.website,
    url: absolute("/"),
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": IDS.person },
  };
}

export function person(): Node {
  return {
    "@type": "Person",
    "@id": IDS.person,
    name: SITE_NAME,
    url: absolute("/"),
    image: absolute("/opengraph-image.jpg"),
    description: "A cartographer of the unseen.",
    sameAs: Object.values(PROFILES),
    knowsAbout: [
      "CUDA",
      "GPU programming",
      "Parallel computing",
      "Machine learning",
      "Graph neural networks",
      "Large language model inference",
      "RISC-V",
      "Astrophotography",
    ],
  };
}

export function webPage(path: string, name: string, description: string, type = "WebPage"): Node {
  return {
    "@type": type,
    "@id": `${absolute(path)}#webpage`,
    url: absolute(path),
    name,
    description,
    isPartOf: { "@id": IDS.website },
    inLanguage: "en",
    ...(type === "ProfilePage" ? { mainEntity: { "@id": IDS.person } } : {}),
  };
}

export function breadcrumbs(trail: { name: string; path: string }[]): Node {
  return {
    "@type": "BreadcrumbList",
    "@id": `${absolute(trail.at(-1)!.path)}#breadcrumb`,
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absolute(c.path),
    })),
  };
}

export function article(opts: {
  path: string;
  title: string;
  description?: string;
  date: string;
  section?: string;
  image?: string;
  type?: "BlogPosting" | "Article";
  wordCount?: number;
  // People the text names and links to, identified by the page they link to.
  mentions?: { name: string; url: string }[];
}): Node {
  return {
    "@type": opts.type ?? "BlogPosting",
    "@id": `${absolute(opts.path)}#article`,
    headline: opts.title,
    ...(opts.description ? { description: opts.description } : {}),
    datePublished: opts.date,
    dateModified: opts.date,
    url: absolute(opts.path),
    mainEntityOfPage: { "@id": `${absolute(opts.path)}#webpage` },
    author: { "@id": IDS.person },
    publisher: { "@id": IDS.person },
    inLanguage: "en",
    ...(opts.section ? { articleSection: opts.section } : {}),
    ...(opts.image ? { image: absolute(opts.image) } : {}),
    ...(opts.wordCount ? { wordCount: opts.wordCount } : {}),
    ...(opts.mentions?.length
      ? { mentions: opts.mentions.map((m) => ({ "@type": "Person", name: m.name, sameAs: m.url })) }
      : {}),
  };
}

export function project(opts: {
  path: string;
  title: string;
  summary: string;
  year: number;
  technologies: string[];
  repository?: string;
  demo?: string;
}): Node {
  return {
    "@type": "SoftwareSourceCode",
    "@id": `${absolute(opts.path)}#project`,
    name: opts.title,
    description: opts.summary,
    url: absolute(opts.path),
    dateCreated: String(opts.year),
    keywords: opts.technologies.join(", "),
    author: { "@id": IDS.person },
    creator: { "@id": IDS.person },
    ...(opts.repository ? { codeRepository: opts.repository } : {}),
    ...(opts.demo ? { sameAs: opts.demo } : {}),
  };
}

export function book(opts: { path: string; title: string; author?: string; link?: string }): Node {
  return {
    "@type": "Book",
    "@id": `${absolute(opts.path)}#book`,
    name: opts.title,
    ...(opts.author
      ? { author: opts.author.split(/,\s*/).map((name) => ({ "@type": "Person", name })) }
      : {}),
    ...(opts.link ? { sameAs: opts.link } : {}),
  };
}

export function imageGallery(
  path: string,
  items: { src: string; alt: string; caption?: string; width: number; height: number }[],
): Node {
  return {
    "@type": "ImageGallery",
    "@id": `${absolute(path)}#gallery`,
    name: "Traces",
    creator: { "@id": IDS.person },
    image: items.map((p) => ({
      "@type": "ImageObject",
      contentUrl: absolute(p.src),
      description: p.alt,
      ...(p.caption ? { caption: p.caption } : {}),
      width: p.width,
      height: p.height,
      creator: { "@id": IDS.person },
    })),
  };
}

export function itemList(
  path: string,
  name: string,
  items: { name: string; path: string }[],
): Node {
  return {
    "@type": "ItemList",
    "@id": `${absolute(path)}#list`,
    name,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: absolute(it.path),
    })),
  };
}
