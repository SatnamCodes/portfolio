import { createRequire } from "module";
const require = createRequire("/home/totallynotsatnam/.npm/_npx/5c6d8c4f680fcd0a/node_modules/");
const { chromium } = require("playwright");
const b = await chromium.launch();
const [,, W = "1440", H = "900", tag = "d"] = process.argv;
const p = await b.newPage({ viewport: { width: +W, height: +H } });
const errs = []; p.on("pageerror", e => errs.push(String(e))); p.on("console", m => m.type() === "error" && errs.push(m.text().slice(0, 150)));
await p.goto("http://localhost:3100/wanderings/what-survives-the-answer", { waitUntil: "networkidle", timeout: 120000 });
await p.waitForTimeout(800);
const op = () => p.evaluate(() => getComputedStyle(document.getElementById("essay")).opacity);
// 1. Reading the thank-you section: must not trigger.
await p.evaluate(() => { const last = [...document.querySelectorAll("#essay p")].find(x => x.textContent.startsWith("Professor Sbalzarini , I thank you")); window.scrollTo(0, last.getBoundingClientRect().top + scrollY - innerHeight * 0.4); });
await p.waitForTimeout(3000);
console.log(tag, "at thank-you, essay opacity:", await op());
// Plates, for a look.
if (tag === "d") for (const [i, n] of [[0, "inverse"], [2, "bells"]]) { const f = p.locator("#essay figure").nth(i); await f.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await f.screenshot({ path: `tq/nobg-${n}.png` }); }
// 2. The true end, then a pause.
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(1000);
console.log(tag, "at end before the pause:", await op());
const t0 = Date.now();
for (const t of [2500, 5000, 7000, 10500]) { await p.waitForTimeout(Math.max(0, t - (Date.now() - t0))); await p.screenshot({ path: `tq/e2-${tag}-${t}.png` }); }
console.log(tag, "after the pause:", await op());
await p.mouse.wheel(0, -700); await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelector('[aria-label="Coda"]').scrollIntoView({ block: "center" })); await p.waitForTimeout(800);
await p.screenshot({ path: `tq/e2-${tag}-coda.png` });
console.log(tag, "restored:", await op(), errs.slice(0, 3));
await b.close();
