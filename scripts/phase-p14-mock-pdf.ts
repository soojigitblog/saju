/**
 * P1.4 mock PDF V4
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-p14-mock-pdf.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildMockPaidResult } from "../src/lib/ai/interpreters/mock-content";
import { buildPaidReportPdfHtmlV4 } from "../src/lib/report/paid-report-pdf-v4";
import { scorePaidReportQuality } from "../src/lib/ai/validators/paid-quality";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "v4");

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
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
  } finally {
    await browser.close();
  }
}

async function captureShots(htmlPath: string, shots: { id: string; file: string }[]) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), {
      waitUntil: "networkidle",
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    for (const s of shots) {
      const el = page.locator(`[data-shot="${s.id}"]`).first();
      if ((await el.count()) === 0) {
        console.warn("missing shot", s.id);
        continue;
      }
      await el.screenshot({ path: path.join(OUT, s.file) });
      console.log("PNG", s.file);
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
  const dateLabel = "2026-08-24";

  const jobs = [
    {
      slug: "2026-money",
      name: "재물운 집중분석",
      stem: "money-6900-v4-mock",
      shots: [
        { id: "cover", file: "6900-01-cover.png" },
        { id: "profile", file: "6900-02-money-profile.png" },
        { id: "structure", file: "6900-03-money-structure.png" },
        { id: "earn-spend", file: "6900-04-earn-spend.png" },
        { id: "blindspot", file: "6900-05-blindspot.png" },
        { id: "playbook", file: "6900-06-playbook.png" },
        { id: "playbook", file: "6900-07-final.png" },
      ],
    },
    {
      slug: "2026-total",
      name: "종합 사주 리포트",
      stem: "total-12900-v4-mock",
      shots: [
        { id: "cover", file: "12900-01-cover.png" },
        { id: "profile", file: "12900-02-core-profile.png" },
        { id: "saju-map", file: "12900-03-saju-map.png" },
        { id: "decision", file: "12900-04-decision.png" },
        { id: "relationship", file: "12900-05-relationship.png" },
        { id: "work", file: "12900-06-work.png" },
        { id: "money", file: "12900-07-money.png" },
        { id: "love", file: "12900-08-love.png" },
        { id: "stress", file: "12900-09-stress.png" },
        { id: "contradiction", file: "12900-10-contradiction.png" },
        { id: "shadow", file: "12900-11-strength-shadow.png" },
        { id: "playbook", file: "12900-12-playbook.png" },
        { id: "final", file: "12900-13-final.png" },
      ],
    },
  ] as const;

  const summary: Record<string, unknown> = { generatedAt: new Date().toISOString() };

  for (const job of jobs) {
    const report = buildMockPaidResult(ctx, job.name, { productSlug: job.slug });
    const quality = scorePaidReportQuality(report, { productSlug: job.slug });
    summary[job.stem] = { qualityPass: quality.pass, score: quality.score, metrics: quality.metrics };

    const html = buildPaidReportPdfHtmlV4({
      nickname: "수지",
      productName: job.name,
      report,
      ctx,
      dateLabel,
    });
    const htmlPath = path.join(OUT, `${job.stem}.html`);
    const pdfPath = path.join(OUT, `${job.stem}.pdf`);
    fs.writeFileSync(htmlPath, html, "utf8");
    fs.writeFileSync(path.join(OUT, `${job.stem}.json`), JSON.stringify(report, null, 2));
    await htmlToPdf(htmlPath, pdfPath);
    await captureShots(htmlPath, [...job.shots]);
    console.log("OK", pdfPath);
  }

  fs.writeFileSync(path.join(OUT, "generation-summary.json"), JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
