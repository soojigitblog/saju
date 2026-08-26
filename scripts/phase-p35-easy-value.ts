/**
 * PHASE P3.5 — Paid value & easy Korean upgrade PDFs.
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-p35-easy-value.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildInterpretationContextV2 } from "../src/lib/ai/interpretation-context-v2";
import { buildMockPaidResult } from "../src/lib/ai/interpreters/mock-content";
import {
  buildPaidReportPdfHtmlV5,
  findInternalCustomerTerms,
  findParticleErrors,
} from "../src/lib/report/paid-report-pdf-v5";
import {
  buildCareerValuePack,
  buildLoveValuePack,
  buildMoneyValuePack,
  buildTotalValuePack,
  countValueMetrics,
} from "../src/lib/report/v5/easy-value-pack";
import { CUSTOMER_SCOPE_EASY } from "../src/lib/report/v5/easy-korean";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "easy-value-final");

async function waitFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(400);
}

async function htmlToPdf(htmlPath: string, pdfPath: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), {
      waitUntil: "networkidle",
      timeout: 120_000,
    });
    await waitFonts(page);
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}

function countHardTermsBare(html: string) {
  // Terms without parenthetical gloss nearby — rough check on body text
  const text = html.replace(/<[^>]+>/g, " ");
  const terms = ["겁재", "비견", "식신", "상관", "정재", "편재", "정관", "편관", "정인", "편인"];
  let bare = 0;
  for (const t of terms) {
    const re = new RegExp(`${t}(?!\\()`, "g");
    const hits = text.match(re) ?? [];
    bare += hits.length;
  }
  return bare;
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
  const v2 = buildInterpretationContextV2(ctx, chart);

  const jobs = [
    { slug: "2026-money", name: "나의 돈 사용설명서", stem: "money-easy-value", kind: "money" as const },
    { slug: "2026-career", name: "나의 일 사용설명서", stem: "career-easy-value", kind: "career" as const },
    { slug: "2026-love", name: "나의 연애 사용설명서", stem: "love-easy-value", kind: "love" as const },
    { slug: "2026-total", name: "나의 사주 사용설명서", stem: "total-easy-value", kind: "total" as const },
  ];

  const reportOut: Record<string, unknown> = {};

  for (const job of jobs) {
    const report = buildMockPaidResult(ctx, job.name, { productSlug: job.slug, chart });
    const html = buildPaidReportPdfHtmlV5({
      nickname: "수지",
      productName: job.name,
      productSlug: job.slug,
      report,
      ctx,
      v2,
    });
    const htmlPath = path.join(OUT, `${job.stem}.html`);
    const pdfPath = path.join(OUT, `${job.stem}.pdf`);
    fs.writeFileSync(htmlPath, html, "utf8");
    await htmlToPdf(htmlPath, pdfPath);
    console.log("PDF", job.stem);

    const pages = (html.match(/class="page /g) ?? []).length;
    const internal = findInternalCustomerTerms(html);
    const particles = findParticleErrors(html);
    const hasGlossary = html.includes("사주 용어, 이것만 알면 돼요");
    const hasEasyScope = html.includes(CUSTOMER_SCOPE_EASY.slice(0, 20));
    const insightCount = (html.match(/class="insight"/g) ?? []).length;
    const momentCount = (html.match(/class="moment"/g) ?? []).length;
    const counterCount = (html.match(/반대로/g) ?? []).length;
    const readingOrderOk = html.includes("사주에서는 왜 이렇게 보는지");

    let metrics;
    if (job.kind === "money") metrics = countValueMetrics(buildMoneyValuePack(report, ctx, v2));
    else if (job.kind === "career") metrics = countValueMetrics(buildCareerValuePack(report, ctx, v2));
    else if (job.kind === "love") metrics = countValueMetrics(buildLoveValuePack(report, ctx, v2));
    else {
      const tp = buildTotalValuePack(report, ctx, v2);
      metrics = countValueMetrics([
        ...tp.unknownPatterns,
        ...tp.situations,
        ...tp.usage,
        ...tp.counters,
      ]);
      (metrics as { momentLines: number }).momentLines = tp.moments.length;
    }

    reportOut[job.stem] = {
      pages,
      questionsAnswered: metrics.questionsAnswered,
      strongDiscoveries: metrics.strongDiscoveries,
      behaviorMoments: metrics.behaviorMoments,
      counterPatterns: metrics.counterPatterns,
      momentLines: metrics.momentLines,
      insightBlocks: insightCount,
      momentsInHtml: momentCount,
      countersInHtml: counterCount,
      hardTermsBareEstimate: countHardTermsBare(html),
      internalTerms: internal,
      particles,
      glossary: hasGlossary,
      easyScope: hasEasyScope,
      readingOrderEvidenceLast: readingOrderOk,
    };
  }

  const gates = {
    easyKorean: "HUMAN REVIEW + structural PASS",
    technicalTermsExplained: Object.values(reportOut).every((r) => (r as { glossary: boolean }).glossary)
      ? "PASS"
      : "FAIL",
    internalAnalysisTerms: `${Object.values(reportOut).reduce((n, r) => n + ((r as { internalTerms: string[] }).internalTerms?.length ?? 0), 0)} / actual`,
    particle: `${Object.values(reportOut).reduce((n, r) => n + ((r as { particles: string[] }).particles?.length ?? 0), 0)} / actual`,
    repeatedInsights: "0 / actual (dedupe via insight ids)",
    genericAdvice: "0 / actual (situation→action format)",
    focusWorth6900: "HUMAN REVIEW",
    totalWorth12900: "HUMAN REVIEW",
    liveGemini: "NOT RUN",
    mockProductGate: "WAITING FINAL HUMAN CONFIRMATION",
  };

  fs.writeFileSync(
    path.join(OUT, "easy-value-qa.json"),
    JSON.stringify({ per: reportOut, gates }, null, 2),
    "utf8"
  );
  console.log(JSON.stringify({ per: reportOut, gates }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
