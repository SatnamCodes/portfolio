import "server-only";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const photoSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  src: z.string().startsWith("/"),
  // A short muted clip (an Instagram reel); `src` is then its poster frame.
  video: z.string().startsWith("/").endsWith(".mp4").optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().min(10, "alt text must describe the photograph"),
  caption: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  camera: z.string().min(1).optional(),
  lens: z.string().min(1).optional(),
  exposure: z.string().min(1).optional(),
  draft: z.boolean().optional(),
});

const fileSchema = z.object({ photos: z.array(photoSchema) });

export type Photo = z.infer<typeof photoSchema>;

export function getPhotos(): Photo[] {
  const file = path.join(process.cwd(), "content/traces/traces.json");
  if (!fs.existsSync(file)) return [];
  const result = fileSchema.safeParse(JSON.parse(fs.readFileSync(file, "utf8")));
  if (!result.success)
    throw new Error(`Invalid content/traces/traces.json:\n${z.prettifyError(result.error)}`);
  const ids = new Set<string>();
  for (const p of result.data.photos) {
    if (ids.has(p.id)) throw new Error(`content/traces/traces.json: duplicate id "${p.id}"`);
    ids.add(p.id);
  }
  const drafts = process.env.NODE_ENV !== "production" || process.env.INCLUDE_DRAFTS === "1";
  return result.data.photos.filter((p) => drafts || !p.draft);
}
