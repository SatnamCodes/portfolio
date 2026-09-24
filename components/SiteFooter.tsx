"use client";

import { usePathname } from "next/navigation";
import { roadScene } from "./sketch/RoadNotTaken";
import { labScene, readingScene } from "./sketch/scenes";
import { studyScene } from "./sketch/Study";
import { type Sketch, useSketch } from "./sketch/useSketch";
import { PageLink } from "./PageLink";
import s from "./SiteFooter.module.css";

// Sections whose footer carries a small scene standing on the footer's line.
// `exact` keeps a scene on the section's index page only, off its individual entries.
const SCENES: {
  prefix: string;
  exact?: boolean;
  draw: Sketch;
  still: number;
  tall?: boolean;
  label: string;
}[] = [
  {
    prefix: "/roads",
    exact: true,
    draw: roadScene,
    still: 6.6,
    tall: true,
    label: "A road forking in a wood; a schoolboy looks down each and takes the grassy one.",
  },
  {
    prefix: "/wanderings",
    draw: studyScene,
    still: 5.5,
    label: "A boy with messy hair at his desk under a lamp, writing and stopping to think.",
  },
  {
    prefix: "/research",
    draw: labScene,
    still: 10,
    label: "A boy at a chalkboard full of working, stepping back until he sees it.",
  },
  {
    prefix: "/shelves",
    draw: readingScene,
    still: 3,
    label: "A boy sitting on a stack of books, reading.",
  },
];

// The footer: full width, always at the bottom of the window (see body in globals.css), with
// contact and résumé. The homepage ends in "The Questions", which carries these links itself.
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  const scene = SCENES.find(
    (x) => pathname === x.prefix || (!x.exact && pathname.startsWith(`${x.prefix}/`)),
  );
  return (
    <footer className={s.footer}>
      {scene && (
        <Scene
          key={scene.prefix}
          draw={scene.draw}
          still={scene.still}
          tall={scene.tall}
          label={scene.label}
        />
      )}
      <FooterLinks className={s.bar} />
    </footer>
  );
}

function Scene({
  draw,
  still,
  tall,
  label,
}: {
  draw: Sketch;
  still: number;
  tall?: boolean;
  label: string;
}) {
  const ref = useSketch(draw, still);
  return (
    <figure className={s.scene} data-tall={tall || undefined}>
      <canvas ref={ref} aria-hidden="true" />
      <figcaption className="visually-hidden">{label}</figcaption>
    </figure>
  );
}

export function FooterLinks({ className }: { className?: string }) {
  return (
    <nav className={`${s.links} ${className ?? ""}`} aria-label="Contact">
      <PageLink href="/post">Contact</PageLink>
      <span aria-hidden="true">·</span>
      <PageLink href="/projects#resumes">Résumé</PageLink>
    </nav>
  );
}
