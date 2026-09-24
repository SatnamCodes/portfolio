import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbs, webPage } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { Page } from "@/components/Page";
import Story, { metadata as story } from "@/content/new-beginnings.mdx";
import { slugify } from "@/lib/slug";
import prose from "@/styles/prose.module.css";
import s from "./new-beginnings.module.css";

export const metadata: Metadata = pageMetadata({
  title: "New Beginnings",
  description: "Satnam's story, told in chapters.",
  path: "/new-beginnings",
  type: "profile",
});

function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

// Chapters come straight from the prose: every `## heading` becomes a jump link.
const chapters = fs
  .readFileSync(path.join(process.cwd(), "content/new-beginnings.mdx"), "utf8")
  .split("\n")
  .filter((line) => line.startsWith("## "))
  .map((line) => line.slice(3).trim());

export default function NewBeginningsPage() {
  const placeholder = story?.isPlaceholder === true;
  return (
    <Page>
      <JsonLd
        nodes={[
          webPage("/new-beginnings", "New Beginnings", metadata.description!, "ProfilePage"),
          breadcrumbs([{ name: "New Beginnings", path: "/new-beginnings" }]),
        ]}
      />
      <article className={s.page}>
        <header className={s.header}>
          <h1 className={s.title}>New Beginnings</h1>
          {placeholder && (
            <p className={s.notice}>Placeholder: this story hasn’t been written yet.</p>
          )}
          {chapters.length > 2 && (
            <nav aria-label="Chapters" className={s.chapters}>
              <ol>
                {chapters.map((title, i) => (
                  <li key={title}>
                    <a href={`#${slugify(title)}`}>
                      <span className={s.numeral} aria-hidden="true">
                        {["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][i] ?? i + 1}
                      </span>{" "}
                      {title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </header>
        <div className={`${prose.prose} ${s.story}`} data-placeholder={placeholder || undefined}>
          <Story
            components={{
              h2: ({ children }) => (
                <h2 id={slugify(textOf(children))} className={s.chapter}>
                  {children}
                </h2>
              ),
            }}
          />
        </div>
      </article>
    </Page>
  );
}
