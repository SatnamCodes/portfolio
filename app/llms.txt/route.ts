import { publicRoutes, SECTIONS } from "@/lib/routes";
import { absolute, PROFILES, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

// llms.txt (https://llmstxt.org): a plain-markdown map of the site for language models. Generated
// from the same route list as the sitemap, so it never drifts from the real content. Supplemental:
// the HTML, sitemap, robots.txt and JSON-LD remain the primary sources.
// Built with the site: content only changes on deploy.
export const dynamic = "force-static";

export async function GET() {
  const routes = await publicRoutes();
  const bySection = (section: string) =>
    routes.filter((r) => r.section === section && !SECTIONS.some((x) => x.path === r.path));
  const list = (section: string) =>
    bySection(section)
      .map((r) => `- [${r.title}](${absolute(r.path)})${r.description ? `: ${r.description}` : ""}`)
      .join("\n");

  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} works on GPU computing (CUDA kernels and performance engineering), machine learning, LLM inference and systems, and photographs the night sky. The site is written and maintained by ${SITE_NAME}.

## Sections

${SECTIONS.map((r) => `- [${r.title}](${absolute(r.path)})${r.description ? `: ${r.description}` : ""}`).join("\n")}

## Projects

${list("Projects") || "- None published yet."}

## Research

${list("Research") || "- None published yet."}

## Blogs (Roads)

${list("Roads") || "- None published yet."}

## Essays and thoughts (Wanderings)

${list("Wanderings") || "- None published yet."}

## Book notes (Shelves)

${list("Shelves") || "- None published yet."}

## Elsewhere

- [GitHub](${PROFILES.github})
- [LinkedIn](${PROFILES.linkedin})
- [X](${PROFILES.x})
- [LeetCode](${PROFILES.leetcode})
- [Codeforces](${PROFILES.codeforces})

## Machine-readable

- [Sitemap](${absolute("/sitemap.xml")})
- [robots.txt](${absolute("/robots.txt")})
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
