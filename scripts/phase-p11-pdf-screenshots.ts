/**
 * Screenshot mock PDF HTML at key QA points.
 *   npx tsx scripts/phase-p11-pdf-screenshots.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT = path.join(process.cwd(), "tmp", "quality-review");

async function shoot(stem: string) {
  const htmlPath = path.join(OUT, `${stem}.html`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), {
    waitUntil: "networkidle",
  });

  // Cover
  await page.locator(".cover").screenshot({
    path: path.join(OUT, `${stem}-p1-cover.png`),
  });

  // Signature (page 2 area)
  await page.locator(".sig").screenshot({
    path: path.join(OUT, `${stem}-p2-signature.png`),
  });

  // First chapter
  const ch = page.locator(".chapter").first();
  await ch.screenshot({ path: path.join(OUT, `${stem}-chapter.png`) });

  // WHY if present
  const why = page.locator(".why").first();
  if ((await why.count()) > 0) {
    await why.screenshot({ path: path.join(OUT, `${stem}-why.png`) });
  }

  // Final
  await page.locator(".final").screenshot({
    path: path.join(OUT, `${stem}-final.png`),
  });

  await browser.close();
  console.log("shots:", stem);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await shoot("money-6900-mock");
  await shoot("total-12900-mock");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
