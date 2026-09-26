// Share cards for individual writings: a still of the piece's main animation, framed at 1200×630
// with its title, saved to public/share/. Section pages (Traces, Shelves, Wanderings…) keep the
// site banner; only a writing gets its own card.
//
// Share previews (WhatsApp, X, LinkedIn, iMessage) show one still image, so the card is the
// animation's most telling frame, not the animation itself.
//
// Usage: build and start the site (`npm run build && npx next start -p 3123`), then
//   node scripts/share-cards.mjs [base-url]
// Needs Playwright's Chromium: `npx playwright install chromium` once.

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3123";
const OUT = path.join(process.cwd(), "public/share");

// One entry per writing that has a main animation. `grab` is the element to photograph;
// `reveal` shows a finished state the page only reaches at the very end of the piece.
const CARDS = [
  {
    file: "wanderings-what-survives-the-answer.jpg",
    path: "/wanderings/what-survives-the-answer",
    grab: '[class*="Unravel-module"][class*="coda"]',
    // The coda (Feynman's portrait and line) only appears once the essay has unravelled; show its
    // finished state directly.
    reveal: true,
  },
  {
    file: "roads-achieving-cublas-level-performance-with-cuda-matmul.jpg",
    path: "/roads/achieving-cublas-level-performance-with-cuda-matmul",
    grab: '[class*="KernelAnimation-module"][class*="canvas"]',
    wait: 6000, // let the naive kernel get a few tiles into the output
  },
];

const cardHtml = (shot, title) => `<!doctype html>
<html><head><style>
  html, body { margin: 0; width: 1200px; height: 630px; background: #fdf3e5; }
  body { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 48px;
         padding: 56px 64px; box-sizing: border-box; font-family: Georgia, "Times New Roman", serif;
         color: #3b2621; }
  .art { height: 518px; display: grid; place-items: center; }
  .art img { max-width: 100%; max-height: 100%; border-radius: 10px; }
  h1 { margin: 0 0 20px; font-weight: 400; font-size: 52px; line-height: 1.1; }
  p { margin: 0; font: 15px/1.4 system-ui, sans-serif; letter-spacing: 0.16em;
      text-transform: uppercase; color: #7a5f55; }
</style></head>
<body><div class="art"><img src="data:image/png;base64,${shot}"></div>
<div><h1>${title}</h1><p>Satnam</p></div></body></html>`;

const browser = await chromium.launch();
fs.mkdirSync(OUT, { recursive: true });
for (const card of CARDS) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.goto(BASE + card.path, { waitUntil: "networkidle" });
  const el = page.locator(card.grab).first();
  if (card.reveal) await el.evaluate((e) => e.setAttribute("data-shown", ""));
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(card.wait ?? 1500);
  const shot = (await el.screenshot()).toString("base64");
  const title = (await page.locator("h1").first().textContent())?.trim() ?? "";
  await page.close();
  // The card itself at 1200×630, the size share previews expect.
  const cardPage = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await cardPage.setContent(cardHtml(shot, title));
  await cardPage.screenshot({ path: path.join(OUT, card.file), type: "jpeg", quality: 88 });
  await cardPage.close();
  console.log(`✓ public/share/${card.file}`);
}
await browser.close();
