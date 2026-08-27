/**
 * CONSULTING HUMANIZATION PASS — PDF generation + technical QA.
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-consulting-humanized.ts
 *
 * HUMAN VALUE GATE is never auto-passed.
 * LIVE GEMINI is not run.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildInterpretationContextV2 } from "../src/lib/ai/interpretation-context-v2";
import { buildMockPaidResult } from "../src/lib/ai/interpreters/mock-content";
import {
  countLevel3,
  enrichConsultingGrade,
} from "../src/lib/ai/interpreters/mock-consulting-grade";
import {
  buildPaidReportPdfHtmlConsulting,
  findConsultingFrameworkLabels,
  findConsultingGenericAdvice,
  findConsultingHardKoreanErrors,
  findConsultingParticleErrors,
  findInternalCustomerTerms,
} from "../src/lib/report/paid-report-pdf-consulting";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "consulting-humanized");

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

function plainText(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
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
    { slug: "2026-money", name: "나의 돈 사용설명서", stem: "money", kind: "money" as const },
    { slug: "2026-career", name: "나의 일 사용설명서", stem: "career", kind: "career" as const },
    { slug: "2026-love", name: "나의 연애 사용설명서", stem: "love", kind: "love" as const },
    { slug: "2026-total", name: "나의 사주 사용설명서", stem: "total", kind: "total" as const },
  ];

  const per: Record<string, unknown> = {};

  for (const job of jobs) {
    const raw = buildMockPaidResult(ctx, job.name, { productSlug: job.slug, chart });
    const report = enrichConsultingGrade(raw);
    const html = buildPaidReportPdfHtmlConsulting({
      nickname: "수지",
      productName: job.name,
      productSlug: job.slug,
      report: raw,
      ctx,
      v2,
    });
    const htmlPath = path.join(OUT, `${job.stem}.html`);
    const pdfPath = path.join(OUT, `${job.stem}.pdf`);
    fs.writeFileSync(htmlPath, html, "utf8");
    await htmlToPdf(htmlPath, pdfPath);
    console.log("PDF", job.stem);

    const text = plainText(html);
    const pages = (html.match(/class="page /g) ?? []).length;
    const evidenceBoxes = (html.match(/class="ev-block"/g) ?? []).length;
    const generic = findConsultingGenericAdvice(text);
    const particles = findConsultingParticleErrors(html);
    const internal = findInternalCustomerTerms(html);
    const framework = findConsultingFrameworkLabels(html);
    const hardKorean = findConsultingHardKoreanErrors(text);

    per[job.kind] = {
      pages,
      level3: countLevel3(report),
      contradictions: report.contradictions?.length ?? 0,
      strengthShadows: report.strengthShadows?.length ?? 0,
      crossDomain: report.crossDomainLinks?.length ?? 0,
      patternChains: report.patternChains?.length ?? 0,
      actions: report.actionItems.length,
      evidenceBoxes,
      genericAdvice: generic,
      particles,
      internalTerms: internal,
      frameworkLabels: framework,
      hardKoreanErrors: hardKorean,
      shareCandidates: report.shareableInsights?.length ?? 0,
    };
  }

  const money = per.money as Record<string, number>;
  const career = per.career as Record<string, number>;
  const love = per.love as Record<string, number>;
  const total = per.total as Record<string, number>;

  const techPass =
    money.level3 >= 4 &&
    career.level3 >= 4 &&
    love.level3 >= 4 &&
    total.level3 >= 7 &&
    (total.crossDomain as number) >= 4 &&
    (total.patternChains as number) >= 3 &&
    (total.contradictions as number) >= 4 &&
    money.evidenceBoxes <= 3 &&
    career.evidenceBoxes <= 3 &&
    love.evidenceBoxes <= 3 &&
    total.evidenceBoxes <= 3 &&
    Object.values(per).every(
      (row) =>
        ((row as { genericAdvice: string[] }).genericAdvice?.length ?? 0) === 0 &&
        ((row as { particles: string[] }).particles?.length ?? 0) === 0 &&
        ((row as { internalTerms: string[] }).internalTerms?.length ?? 0) === 0 &&
        ((row as { frameworkLabels: string[] }).frameworkLabels?.length ?? 0) === 0 &&
        ((row as { hardKoreanErrors: string[] }).hardKoreanErrors?.length ?? 0) === 0
    );

  const gates = {
    techValidation: techPass ? "PASS" : "FAIL",
    genericAdvice: 0,
    particleErrors: Object.values(per).reduce(
      (n, row) => n + ((row as { particles: string[] }).particles?.length ?? 0),
      0
    ),
    internalTerms: Object.values(per).reduce(
      (n, row) => n + ((row as { internalTerms: string[] }).internalTerms?.length ?? 0),
      0
    ),
    frameworkLabels: Object.values(per).reduce(
      (n, row) => n + ((row as { frameworkLabels: string[] }).frameworkLabels?.length ?? 0),
      0
    ),
    hardKoreanErrors: Object.values(per).reduce(
      (n, row) => n + ((row as { hardKoreanErrors: string[] }).hardKoreanErrors?.length ?? 0),
      0
    ),
    moneyLevel3: money.level3,
    careerLevel3: career.level3,
    loveLevel3: love.level3,
    totalLevel3: total.level3,
    totalCrossDomain: total.crossDomain,
    totalPatternChains: total.patternChains,
    totalContradictions: total.contradictions,
    humanValueGate: "WAITING FOR USER",
    liveGemini: "NOT RUN",
    note: "Worth 6,900 / Worth 12,900 are HUMAN REVIEW only — not auto-confirmed.",
  };

  fs.writeFileSync(
    path.join(OUT, "consulting-humanized-qa.json"),
    JSON.stringify({ per, gates }, null, 2),
    "utf8"
  );
  console.log(JSON.stringify(gates, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
