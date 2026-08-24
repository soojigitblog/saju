/**
 * P1.4 PDF visual QA — blank page & coverage
 * npx tsx scripts/phase-p14-pdf-qa.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const OUT = path.join(process.cwd(), "tmp", "quality-review", "v4");

type PageReport = {
  page: number;
  coverageRatio: number;
  blank: boolean;
  largeEmpty: boolean;
};

async function analyzePdf(pdfPath: string): Promise<PageReport[]> {
  const browser = await chromium.launch({ headless: true });
  const reports: PageReport[] = [];
  try {
    const page = await browser.newPage();
    const buf = fs.readFileSync(pdfPath);
    const b64 = buf.toString("base64");
    await page.setContent(`
      <html><body style="margin:0"><embed id="pdf" type="application/pdf" width="100%" height="100%" src="data:application/pdf;base64,${b64}"/></body></html>
    `);
    // Fallback: render HTML source sibling if embed fails
    const htmlPath = pdfPath.replace(/\.pdf$/, ".html");
    if (fs.existsSync(htmlPath)) {
      await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), {
        waitUntil: "networkidle",
      });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      const pages = page.locator(".page");
      const count = await pages.count();
      for (let i = 0; i < count; i++) {
        const el = pages.nth(i);
        const stats = await el.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.floor(rect.width));
          canvas.height = Math.max(1, Math.floor(rect.height));
          const ctx = canvas.getContext("2d");
          if (!ctx) return { ratio: 1 };
          ctx.fillStyle = "#faf7f2";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const text = (node as HTMLElement).innerText.trim();
          const ratio = Math.min(1, text.length / 800);
          return { ratio };
        });
        const ratio = stats.ratio as number;
        const isCover = i === 0;
        reports.push({
          page: i + 1,
          coverageRatio: ratio,
          blank: !isCover && ratio < 0.05,
          largeEmpty: !isCover && ratio < 0.12,
        });
      }
    }
  } finally {
    await browser.close();
  }
  return reports;
}

async function main() {
  const files = ["money-6900-v4-mock.pdf", "total-12900-v4-mock.pdf"];
  const result: Record<string, unknown> = {};
  for (const f of files) {
    const p = path.join(OUT, f);
    if (!fs.existsSync(p)) {
      result[f] = { error: "missing" };
      continue;
    }
    const pages = await analyzePdf(p);
    result[f] = {
      pageCount: pages.length,
      blankPages: pages.filter((x) => x.blank).map((x) => x.page),
      largeEmptyPages: pages.filter((x) => x.largeEmpty).map((x) => x.page),
      pages,
    };
  }
  fs.writeFileSync(path.join(OUT, "pdf-visual-qa.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
