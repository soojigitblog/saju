/**
 * P1.3 mock PDF V3 + design screenshots.
 *   npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-p13-mock-pdf.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildMockPaidResult } from "../src/lib/ai/interpreters/mock-content";
import { buildPaidReportPdfHtmlV3 } from "../src/lib/report/paid-report-pdf-v3";
import { scorePaidReportQuality } from "../src/lib/ai/validators/paid-quality";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "v3");

async function htmlToPdf(htmlPath: string, pdfPath: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), {
      waitUntil: "networkidle",
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "8mm", bottom: "8mm", left: "8mm", right: "8mm" },
    });
  } finally {
    await browser.close();
  }
}

async function captureShots(htmlPath: string, prefix: string, shots: string[]) {
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
      if ((await el.count()) === 0) continue;
      await el.screenshot({
        path: path.join(OUT, `${prefix}-${shot}.png`),
      });
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chart = fortuneEngine.calculate({
    gender: "female",
    calendarType: "solar",
    birthDate: "1990-05-15",
    birthTime: "10:30",
    birthTimeUnknown: false,
    lunarLeapMonth: false,
    timezone: "Asia/Seoul",
    countryCode: "KR",
  });
  const ctx = buildFortuneAiContext(chart);

  const jobs = [
    {
      slug: "2026-money",
      name: "재물운 집중분석",
      orderNo: "QA-V3-6900",
      stem: "money-6900-v3-mock",
      cover: "재물 사용설명서",
      shots: ["cover", "profile", "middle", "final"],
    },
    {
      slug: "2026-total",
      name: "종합 사주 리포트",
      orderNo: "QA-V3-12900",
      stem: "total-12900-v3-mock",
      cover: "사주 사용설명서",
      shots: ["cover", "profile", "contradiction", "shadow", "middle", "final"],
    },
  ] as const;

  const summary: Record<string, unknown> = { generatedAt: new Date().toISOString() };

  for (const job of jobs) {
    const report = buildMockPaidResult(ctx, job.name, {
      productSlug: job.slug,
    });
    const quality = scorePaidReportQuality(report, { productSlug: job.slug });
    summary[job.stem] = { qualityPass: quality.pass, score: quality.score, metrics: quality.metrics };

    const html = buildPaidReportPdfHtmlV3({
      nickname: "수지",
      productName: job.name,
      orderNo: job.orderNo,
      report,
    });
    const htmlPath = path.join(OUT, `${job.stem}.html`);
    const pdfPath = path.join(OUT, `${job.stem}.pdf`);
    fs.writeFileSync(htmlPath, html, "utf8");
    fs.writeFileSync(
      path.join(OUT, `${job.stem}.json`),
      JSON.stringify(report, null, 2),
      "utf8"
    );
    await htmlToPdf(htmlPath, pdfPath);
    await captureShots(htmlPath, job.stem, [...job.shots]);
    console.log("OK", pdfPath);
  }

  fs.writeFileSync(
    path.join(OUT, "generation-summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
