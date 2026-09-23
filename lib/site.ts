export const site = {
  owner: "Satnam",
} as const;

// Names are deliberate metaphors (Roads = essays, Shelves = notes, Wanderings = thoughts,
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
