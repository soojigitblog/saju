import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "v3");

async function capture(htmlName: string, prefix: string, shots: string[]) {
  const htmlPath = path.join(OUT, htmlName);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), {
      waitUntil: "networkidle",
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    for (const shot of shots) {
      const el = page.locator(`[data-shot="${shot}"]`).first();
      const n = await el.count();
      if (n === 0) {
        console.warn("missing", prefix, shot);
        continue;
      }
      const out = path.join(OUT, `${prefix}-${shot}.png`);
      await el.screenshot({ path: out });
      console.log("OK", out);
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  await capture("money-6900-v3-mock.html", "money-6900-v3-mock", [
    "cover",
    "profile",
    "middle",
    "final",
  ]);
  await capture("total-12900-v3-mock.html", "total-12900-v3-mock", [
    "cover",
    "profile",
    "contradiction",
    "shadow",
    "middle",
    "final",
  ]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
