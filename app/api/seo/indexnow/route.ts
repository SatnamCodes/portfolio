import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { submitToIndexNow } from "@/lib/indexnow";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/seo/indexnow  { "paths": ["/projects/x", ...] }
// Private: requires `Authorization: Bearer $SEO_ADMIN_TOKEN`, and is rate limited, so nobody else
// can make the site spam search engines. Called by scripts/seo/indexnow.mjs after a deploy.
const body = z.object({ paths: z.array(z.string().startsWith("/").max(500)).min(1).max(1000) });

function authorised(header: string | null) {
  const token = process.env.SEO_ADMIN_TOKEN;
  if (!token || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorised(req.headers.get("authorization")))
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  const limited = rateLimit("seo-indexnow", { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!limited.ok)
    return Response.json(
      { error: "Too many submissions" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "Expected { paths: string[] }" }, { status: 400 });
  const result = await submitToIndexNow(parsed.data.paths);
  // Recorded in the platform's function logs; the local agent keeps its own event history.
  console.info("indexnow", JSON.stringify({ at: new Date().toISOString(), ...result }));
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
