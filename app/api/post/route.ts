import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

// Validated again here, independently of the form: the browser is never trusted.
const letterSchema = z.object(
  {
    name: z
      .string({ error: "Add your name." })
      .trim()
      .min(1, "Add your name.")
      .max(100, "That name is longer than 100 characters."),
    email: z
      .email({
        error: (issue) =>
          issue.input === undefined || issue.input === ""
            ? "Add an email address, so a reply can find you."
            : "That email address doesn’t look complete.",
      })
      .max(200),
    message: z
      .string({ error: "Write a few more words first." })
      .trim()
      .min(10, "Write a few more words first.")
      .max(5000, "Letters are limited to 5,000 characters."),
    // Honeypot: people never see this field.
    website: z.string().max(200).optional(),
  },
  { error: "The letter arrived unreadable." },
);

const MAX_BODY_BYTES = 20_000;

function reply(
  status: number,
  body: { ok: true } | { ok: false; error: string },
  headers?: HeadersInit,
) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

// Plain text only; strip control characters except newlines and tabs.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
// Headers must never carry a newline (header injection).
const oneLine = (s: string) =>
  clean(s)
    .replace(/[\r\n]+/g, " ")
    .trim();

async function send(letter: { name: string; email: string; message: string }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.POST_TO_EMAIL;
  const from = process.env.POST_FROM_EMAIL;

  if (!key || !to || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[post] No mail provider configured; letter logged instead of sent:\n", letter);
      return { ok: true as const };
    }
    console.error("[post] RESEND_API_KEY, POST_TO_EMAIL or POST_FROM_EMAIL is missing.");
    return { ok: false as const, error: "The post box isn’t connected yet." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: oneLine(letter.email),
        subject: `A letter from ${oneLine(letter.name)}`,
        text: `${clean(letter.message)}\n\n— ${oneLine(letter.name)} <${oneLine(letter.email)}>`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true as const };
    console.error("[post] Provider refused:", res.status, await res.text().catch(() => ""));
    return { ok: false as const, error: "The mail service refused the letter." };
  } catch (err) {
    console.error("[post] Provider unreachable:", err);
    return { ok: false as const, error: "The mail service couldn’t be reached." };
  }
}

async function handle(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES)
    return reply(413, { ok: false, error: "That letter is too long to send." });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const limited = rateLimit(`post:${ip}`, { limit: 5, windowMs: 10 * 60_000 });
  if (!limited.ok) {
    return reply(
      429,
      {
        ok: false,
        error: "Several letters have already come from here. Try again in a few minutes.",
      },
      { "Retry-After": String(limited.retryAfter) },
    );
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES)
      return reply(413, { ok: false, error: "That letter is too long to send." });
    raw = JSON.parse(text);
  } catch {
    return reply(400, { ok: false, error: "The letter arrived unreadable." });
  }

  const parsed = letterSchema.safeParse(raw);
  if (!parsed.success) return reply(400, { ok: false, error: parsed.error.issues[0].message });

  // A filled honeypot is a bot: answer as if it worked, send nothing.
  if (parsed.data.website) return reply(200, { ok: true });

  const result = await send(parsed.data);
  return result.ok ? reply(200, { ok: true }) : reply(502, result);
}

// The GitHub Pages mirror posts here cross-origin. Only listed origins get CORS headers; everyone
// else stays same-origin only, exactly as before.
const ALLOWED_ORIGINS = (process.env.POST_ALLOWED_ORIGINS ?? "https://satnamcodes.github.io")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request) });
}

export async function POST(request: Request) {
  const res = await handle(request);
  for (const [k, v] of Object.entries(cors(request))) res.headers.set(k, v);
  return res;
}
