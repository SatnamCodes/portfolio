import { ViewTransition } from "react";
import { PAGE_TRANSITION } from "@/lib/site";

// Must wrap each page.tsx, not the layout: layouts persist, so enter/exit never fire there.
// Only navigations tagged by the nav animate; deep links, back/forward and refreshes are instant.
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{ [PAGE_TRANSITION]: "paper-in", default: "none" }}
      exit={{ [PAGE_TRANSITION]: "paper-out", default: "none" }}
      default="none"
    >
      <div>{children}</div>
    </ViewTransition>
  );
}
