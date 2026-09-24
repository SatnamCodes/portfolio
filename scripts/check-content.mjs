#!/usr/bin/env node
// Fast pre-publish check for content (used by the local admin): every entry has valid fields and
// its body compiles as MDX. The full site build checks again on Vercel.
import { compile } from "@mdx-js/mdx";
import fs from "node:fs";
import path from "node:path";
import { fromMdx, TYPES, validate } from "./admin/types.mjs";

const problems = [];
for (const [type, t] of Object.entries(TYPES)) {
  const dir = path.resolve(t.dir);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".mdx"))) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    try {
      const errs = validate(type, fromMdx(type, src));
      for (const e of errs) problems.push(`${t.dir}/${f}: ${e}`);
      await compile(src);
    } catch (e) {
      problems.push(`${t.dir}/${f}: ${e.message.split("\n")[0]}`);
    }
  }
}
if (problems.length) {
  console.log(problems.join("\n"));
  process.exit(1);
}
console.log("Content OK.");
