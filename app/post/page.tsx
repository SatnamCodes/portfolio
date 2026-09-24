import type { Metadata } from "next";
import { Page } from "@/components/Page";
import { Elsewhere } from "@/components/post/Elsewhere";
import { PostDesk } from "@/components/post/PostDesk";
import { SectionIntro } from "@/components/SectionIntro";
import s from "./post-page.module.css";

export const metadata: Metadata = { title: "Post" };

export default function PostPage() {
  return (
    <Page>
      <div className={s.page}>
        <SectionIntro title="Post" meta="Write a letter. Post it." />
        <PostDesk />
        <Elsewhere />
      </div>
    </Page>
  );
}
