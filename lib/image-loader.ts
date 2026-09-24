// next/image loader for the static GitHub Pages export: no optimisation server there, so images are
// served as they are, under the base path. (The width parameter is ignored by Pages; it only keeps
// Next's loader contract.) Vercel keeps the default optimising loader.
import { asset } from "./base-path";

export default function pagesLoader({ src, width }: { src: string; width: number }) {
  return src.startsWith("/") ? `${asset(src)}?w=${width}` : src;
}
