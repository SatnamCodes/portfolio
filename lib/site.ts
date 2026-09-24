export const site = {
  owner: "Satnam",
} as const;

// Names are deliberate metaphors (Roads = blogs, Shelves = notes, Wanderings = thoughts,
// Traces = photography, New Beginnings = about). Do not rename.
export const navItems = [
  { label: "Home", href: "/" },
  { label: "Roads", href: "/roads" },
  { label: "Research", href: "/research" },
  { label: "Projects", href: "/projects" },
  { label: "Shelves", href: "/shelves" },
  { label: "Wanderings", href: "/wanderings" },
  { label: "Traces", href: "/traces" },
  { label: "New Beginnings", href: "/new-beginnings" },
  { label: "Post", href: "/post" },
] as const;

export const PAGE_TRANSITION = "page";

// Moving right along the nav slides the page left, and vice versa; globals.css reads these types.
export function pageDirection(from: string, to: string): "page-forward" | "page-back" {
  const index = (path: string) =>
    navItems.findLastIndex(
      ({ href }) => path === href || (href !== "/" && path.startsWith(`${href}/`)),
    );
  return index(to) < index(from) ? "page-back" : "page-forward";
}
