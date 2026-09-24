import type { Metadata } from "next";
import { Page } from "@/components/Page";
import { PageLink } from "@/components/PageLink";
import { navItems } from "@/lib/site";
import s from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

// Served with HTTP 404. Offers the whole map of the site, so a wrong turn is one click from anywhere.
export default function NotFound() {
  return (
    <Page>
      <div className={s.page}>
        <p className={s.code}>404</p>
        <h1 className={s.title}>This page isn’t on the map.</h1>
        <p className={s.lead}>
          The address may be mistyped, or the page may have moved. Try one of these:
        </p>
        <ul className={s.links}>
          {navItems.map(({ label, href }) => (
            <li key={href}>
              <PageLink href={href}>{label}</PageLink>
            </li>
          ))}
        </ul>
      </div>
    </Page>
  );
}
