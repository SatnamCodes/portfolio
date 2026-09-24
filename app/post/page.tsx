import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbs, webPage } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import { Page } from "@/components/Page";
import { Elsewhere } from "@/components/post/Elsewhere";
import { PostDesk } from "@/components/post/PostDesk";
import { SectionIntro } from "@/components/SectionIntro";
import s from "./post-page.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Post",
  description: "Write a letter to Satnam, or find Satnam on LinkedIn and X.",
  path: "/post",
  type: "website",
});

export default function PostPage() {
  return (
    <Page>
      <JsonLd
        nodes={[
          webPage("/post", "Post", metadata.description!, "ContactPage"),
          breadcrumbs([{ name: "Post", path: "/post" }]),
        ]}
      />
      <div className={s.page}>
        <SectionIntro title="Post" meta="Write a letter. Post it." />
        <PostDesk />
        <Elsewhere />
      </div>
    </Page>
  );
}
