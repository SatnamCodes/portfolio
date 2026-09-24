// The GitHub Pages copy is served from /portfolio; Vercel serves from the root. next/link and the
// router add the prefix themselves; raw <img>/<video> URLs go through asset(). next/image uses the
// custom loader in lib/image-loader.ts on Pages.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (path: string) => (path.startsWith("/") ? `${BASE_PATH}${path}` : path);
