import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbs, webPage, itemList } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { PageLink as Link } from "@/components/PageLink";
import { Page } from "@/components/Page";
import { Heatmaps } from "@/components/projects/Heatmaps";
import { EmptyState, SectionIntro } from "@/components/SectionIntro";
import { getProjects } from "@/lib/content";
import s from "./projects.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Projects",
  description:
    "Projects by Satnam in GPU computing (CUDA), machine learning, LLM inference and systems, with daily GitHub, LeetCode and Codeforces activity.",
  path: "/projects",
  type: "website",
});

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <Page>
      <JsonLd
        nodes={[
          webPage("/projects", "Projects", metadata.description!, "CollectionPage"),
          breadcrumbs([{ name: "Projects", path: "/projects" }]),
          itemList(
            "/projects",
            "Projects",
            projects.map((p) => ({ name: p.meta.title, path: `/projects/${p.slug}` })),
          ),
        ]}
      />
      <div className={s.page}>
        <SectionIntro title="Projects" meta="Log of built work" />
        <Heatmaps />
        {projects.length === 0 ? (
          <EmptyState>Nothing logged yet.</EmptyState>
        ) : (
          <table className={s.log}>
            <caption className="visually-hidden">Projects, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Project</th>
                <th scope="col">Status</th>
                <th scope="col">Built with</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {projects.map((p, i) => (
                <tr key={p.slug} style={{ "--i": i } as React.CSSProperties}>
                  <td className={s.year}>{p.meta.year}</td>
                  <th scope="row">
                    <div className={s.project}>
                      <Link href={`/projects/${p.slug}`} className={s.title}>
                        {p.meta.title}
                      </Link>
                      <span className={s.summary}>{p.meta.summary}</span>
                    </div>
                  </th>
                  <td className={s.status}>
                    <span className={s.inlineLabel}>Status: </span>
                    {p.meta.status}
                  </td>
                  <td className={s.stack}>
                    <span className={s.inlineLabel}>Built with: </span>
                    {p.meta.technologies.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  );
}
