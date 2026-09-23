import Link from "next/link";
import { PAGE_TRANSITION } from "@/lib/site";

// Internal navigation that plays the site's page transition (see components/Page.tsx).
export function PageLink(props: Omit<React.ComponentProps<typeof Link>, "transitionTypes">) {
  return <Link {...props} transitionTypes={[PAGE_TRANSITION]} />;
}
