import type { Metadata } from "next";
import { Page } from "@/components/Page";
import { EmptyState, SectionIntro } from "@/components/SectionIntro";
import { Gallery } from "@/components/traces/Gallery";
import { arrange } from "@/components/traces/layout";
import { formatDate } from "@/lib/content";
import { getPhotos } from "@/lib/traces";
import s from "./traces.module.css";

export const metadata: Metadata = { title: "Traces" };

function RouteAnimation() {
  return (
    <section className={s.route} aria-label="Bathinda to Bengaluru">
      <svg className={s.routeSvg} viewBox="0 0 960 210" role="img" aria-labelledby="route-title">
        <title id="route-title">Bathinda to Bengaluru travel route</title>
        <defs>
          <path
            id="trace-route"
            d="M68 142 C172 86 258 82 352 118 S518 154 604 104 S742 35 892 74"
          />
        </defs>
        <path className={s.routeGuide} d="M68 142 C172 86 258 82 352 118 S518 154 604 104 S742 35 892 74" />
        <path className={s.routeLine} d="M68 142 C172 86 258 82 352 118 S518 154 604 104 S742 35 892 74" />

        <g className={s.stop} transform="translate(68 142)">
          <circle r="5" />
          <text x="-2" y="34" textAnchor="start">
            Bathinda
          </text>
        </g>
        <g className={s.stop} transform="translate(604 104)">
          <circle r="5" />
          <text x="-72" y="46" textAnchor="start">
            Bengaluru
          </text>
        </g>
        <g className={s.pin} transform="translate(352 118)" aria-hidden="true">
          <path d="M0-28c-13 0-23 10-23 22 0 17 23 42 23 42S23 11 23-6c0-12-10-22-23-22Z" />
          <circle r="7" cy="-6" />
        </g>

        <g className={`${s.vehicle} ${s.car}`} aria-hidden="true">
          <animateMotion dur="9s" repeatCount="indefinite" rotate="auto" keyPoints="0;0.34" keyTimes="0;1" calcMode="linear">
            <mpath href="#trace-route" />
          </animateMotion>
          <rect x="-20" y="-10" width="40" height="18" rx="5" />
          <path d="M-11-10h22l8 9h-38Z" />
          <circle cx="-12" cy="11" r="5" />
          <circle cx="12" cy="11" r="5" />
        </g>
        <g className={`${s.vehicle} ${s.train}`} aria-hidden="true">
          <animateMotion dur="9s" repeatCount="indefinite" rotate="auto" keyPoints="0.34;0.61" keyTimes="0;1" calcMode="linear">
            <mpath href="#trace-route" />
          </animateMotion>
          <rect x="-28" y="-12" width="56" height="23" rx="4" />
          <path d="M-18-4h11M1-4h11M19-4h4" />
          <circle cx="-16" cy="14" r="4" />
          <circle cx="16" cy="14" r="4" />
        </g>
        <g className={`${s.vehicle} ${s.plane}`} aria-hidden="true">
          <animateMotion dur="9s" repeatCount="indefinite" rotate="auto" keyPoints="0.61;1" keyTimes="0;1" calcMode="linear">
            <mpath href="#trace-route" />
          </animateMotion>
          <path d="M27 0-26-17l9 17-9 17Z" />
          <path d="M-4 0-19 28l15-6 12-22-12-22-15-6Z" />
        </g>
      </svg>
    </section>
  );
}

export default function TracesPage() {
  const photos = getPhotos().map((p) => ({
    id: p.id,
    src: p.src,
    width: p.width,
    height: p.height,
    alt: p.alt,
    caption: p.caption,
    place: [p.location, p.date && formatDate(p.date)].filter(Boolean).join(" · ") || undefined,
    kit: [p.camera, p.lens, p.exposure].filter(Boolean).join(" · ") || undefined,
  }));

  return (
    <Page>
      <div className={s.page}>
        <SectionIntro title="Traces" meta="Things witnessed" />
        <RouteAnimation />
        {photos.length === 0 ? (
          <EmptyState>No traces yet.</EmptyState>
        ) : (
          <Gallery photos={photos} slots={arrange(photos)} />
        )}
      </div>
    </Page>
  );
}
