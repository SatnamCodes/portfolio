#!/usr/bin/env node
// Local admin for the site: write, edit and publish content through forms. Runs only on this
// machine (bound to 127.0.0.1, never deployed, not part of the Next.js build). Publishing commits
// the files and pushes; Vercel and GitHub Pages then rebuild the live site.
//
//   npm run admin      → opens http://127.0.0.1:4321/?token=…
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import { fromMdx, RESEARCH_FIELDS, slugify, toMdx, TYPES, validate } from "./types.mjs";

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const PORT = Number(process.env.ADMIN_PORT ?? 4321);
// A fresh secret per run: other websites open in your browser can't talk to this server.
const TOKEN = crypto.randomBytes(18).toString("base64url");
const page = fs.readFileSync(path.join(ROOT, "scripts/admin/index.html"), "utf8");

const fileOf = (type, slug) => {
  if (!TYPES[type] || !/^[a-z0-9-]+$/.test(slug)) throw new Error("Bad type or slug");
  return path.join(ROOT, TYPES[type].dir, `${slug}.mdx`);
};

async function git(...args) {
  const { stdout, stderr } = await run("git", args, { cwd: ROOT });
  return (stdout + stderr).trim();
}

const api = {
  async types() {
    return { types: TYPES, researchFields: RESEARCH_FIELDS };
  },
  async list({ type }) {
    const dir = path.join(ROOT, TYPES[type].dir);
    const items = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx")).map((f) => {
      const slug = f.slice(0, -4);
      const v = fromMdx(type, fs.readFileSync(path.join(dir, f), "utf8"));
      return { slug, title: v.title ?? "(untitled)", date: v.date ?? v.year ?? "", draft: Boolean(v.draft) };
    });
    return { items: items.sort((a, b) => String(b.date).localeCompare(String(a.date))) };
  },
  async get({ type, slug }) {
    return { values: fromMdx(type, fs.readFileSync(fileOf(type, slug), "utf8")) };
  },
  async save({ type, slug, values }) {
    const errors = validate(type, values);
    if (errors.length) return { ok: false, errors };
    const s = slug || slugify(values.title || `${values.date}-thought`);
    if (!s) return { ok: false, errors: ["Give it a title so it has an address."] };
    const file = fileOf(type, s);
    if (!slug && fs.existsSync(file)) return { ok: false, errors: [`Something already lives at ${TYPES[type].dir}/${s}.mdx. Change the title.`] };
    fs.writeFileSync(file, toMdx(type, values));
    return { ok: true, slug: s, path: path.relative(ROOT, file) };
  },
  async remove({ type, slug }) {
    fs.rmSync(fileOf(type, slug));
    return { ok: true };
  },
  // ---- Site text: homepage, New Beginnings, résumés ----
  async site() {
    const home = JSON.parse(fs.readFileSync(path.join(ROOT, "content/home.json"), "utf8"));
    const nb = fs.readFileSync(path.join(ROOT, "content/new-beginnings.mdx"), "utf8");
    const nbMeta = nb.match(/export const metadata = \{[\s\S]*?\n\};\n?/);
    const resumes = JSON.parse(fs.readFileSync(path.join(ROOT, "content/resumes.json"), "utf8"));
    return {
      home,
      newBeginnings: { isPlaceholder: /isPlaceholder:\s*true/.test(nbMeta?.[0] ?? ""), body: nb.slice(nbMeta ? nbMeta[0].length : 0).trim() },
      resumes,
    };
  },
  async saveHome({ home }) {
    const errors = [];
    if (!home.heading?.trim()) errors.push("The homepage heading is required.");
    if (!Array.isArray(home.interests) || home.interests.length !== 7) errors.push("Interests: exactly seven, one per band of the spectrum (red → violet).");
    if (errors.length) return { ok: false, errors };
    fs.writeFileSync(path.join(ROOT, "content/home.json"), JSON.stringify(home, null, 2) + "\n");
    return { ok: true, path: "content/home.json" };
  },
  async saveNewBeginnings({ isPlaceholder, body }) {
    const head = `export const metadata = {\n  isPlaceholder: ${Boolean(isPlaceholder)},\n};\n\n`;
    fs.writeFileSync(path.join(ROOT, "content/new-beginnings.mdx"), head + String(body).trim() + "\n");
    return { ok: true, path: "content/new-beginnings.mdx" };
  },
  async saveResumes({ resumes }) {
    const dir = path.join(ROOT, "public/resumes");
    const errors = [];
    const out = [];
    for (const r of resumes) {
      if (!r.role?.trim()) errors.push("Every résumé needs a role.");
      const file = r.file || slugify(`Satnam Singh ${r.role}`).replace(/-/g, "_");
      if (r.pdf) {
        // A new PDF, sent from the form as base64.
        fs.writeFileSync(path.join(dir, `${file}.pdf`), Buffer.from(r.pdf, "base64"));
        await run("pdftoppm", ["-png", "-r", "90", "-singlefile", path.join(dir, `${file}.pdf`), path.join(dir, file)]);
      }
      if (!fs.existsSync(path.join(dir, `${file}.pdf`))) errors.push(`${r.role || "A résumé"} has no PDF yet: choose one.`);
      out.push({ file, role: r.role.trim(), note: (r.note ?? "").trim() });
    }
    if (errors.length) return { ok: false, errors };
    fs.writeFileSync(path.join(ROOT, "content/resumes.json"), JSON.stringify(out, null, 2) + "\n");
    return { ok: true, path: "content/resumes.json" };
  },
  async status() {
    return { changes: await git("status", "--short", "--", "content", "public/resumes") };
  },
  async publish({ message }) {
    const changes = await git("status", "--porcelain", "--", "content", "public/resumes");
    if (!changes) return { ok: false, log: "Nothing to publish." };
    let log = "";
    try {
      // The same checks the site's build runs: a broken entry never reaches the live site.
      const check = await run("node", ["scripts/check-content.mjs"], { cwd: ROOT }).catch((e) => ({ failed: true, stdout: e.stdout, stderr: e.stderr }));
      if (check.failed) return { ok: false, log: `Content check failed:\n${check.stdout}${check.stderr}` };
      log += await git("add", "--", "content", "public/resumes");
      log += "\n" + (await git("commit", "-m", message || "Update content", "-m", "Published from the local admin."));
      log += "\n" + (await git("push"));
      return { ok: true, log };
    } catch (e) {
      return { ok: false, log: `${log}\n${e.stdout ?? ""}${e.stderr ?? e.message}` };
    }
  },
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (req.method === "GET" && url.pathname === "/") {
    if (url.searchParams.get("token") !== TOKEN) {
      res.writeHead(403).end("Open the link printed in the terminal.");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(page.replace("__TOKEN__", TOKEN));
    return;
  }
  if (req.method === "POST" && url.pathname.startsWith("/api/")) {
    if (req.headers["x-admin-token"] !== TOKEN || !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)) {
      res.writeHead(403).end();
      return;
    }
    const name = url.pathname.slice(5);
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const out = await api[name](JSON.parse(body || "{}"));
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(out));
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: false, errors: [e.message] }));
    }
    return;
  }
  res.writeHead(404).end();
});

server.listen(PORT, "127.0.0.1", () => {
  const link = `http://127.0.0.1:${PORT}/?token=${TOKEN}`;
  console.log(`\n  Admin (this machine only): ${link}\n`);
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  execFile(opener, [link], () => {});
});
