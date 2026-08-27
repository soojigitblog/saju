/**
 * PREMIUM VALUE FINAL — PDF generation + evidence fidelity QA.
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-premium-value-final.ts
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
import { enrichConsultingGrade } from "../src/lib/ai/interpreters/mock-consulting-grade";
import {
  buildPaidReportPdfHtmlConsulting,
  findConsultingFrameworkLabels,
  findConsultingGenericAdvice,
  findConsultingGenericCoaching,
  findConsultingHardKoreanErrors,
  findConsultingParticleErrors,
  findInternalCustomerTerms,
} from "../src/lib/report/paid-report-pdf-consulting";
import { buildConsultingPack } from "../src/lib/report/v5/consulting-value-pack";
import { validateEvidenceMappings } from "../src/lib/report/v5/consulting-evidence";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "premium-value-final");

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

function principleCoachingHits(html: string): string[] {
  const blocks = [...html.matchAll(/class="action-do"[^>]*>([^<]+)</g)].map((m) => m[1] ?? "");
  const hits: string[] = [];
  for (const block of blocks) {
    hits.push(...findConsultingGenericCoaching(block));
  }
  return [...new Set(hits)];
}

function hasSpecificEvidence(html: string, ctxStem: string): boolean {
  return (
    html.includes("사주에서 확인한 부분") &&
    html.includes("일간") &&
    (html.includes(ctxStem) || html.includes("십성") || html.includes("기운"))
  );
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
  const evidencePass: Record<string, string> = {};

  for (const job of jobs) {
    const raw = buildMockPaidResult(ctx, job.name, { productSlug: job.slug, chart });
    enrichConsultingGrade(raw);
    const pack = buildConsultingPack(job.kind, raw);
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
    const evMap = validateEvidenceMappings(
      pack.discoveries.map((d) => ({ id: d.id, evidenceSources: d.evidenceSources })),
      v2
    );
    const specificVisible = hasSpecificEvidence(html, ctx.dayMaster.stem);
    evidencePass[job.kind] = specificVisible && evMap.rows.length > 0 ? "PASS" : "FAIL";

    per[job.kind] = {
      pages: (html.match(/class="page /g) ?? []).length,
      evidenceBoxes: (html.match(/class="ev-block"/g) ?? []).length,
      premiumSnapshot: html.includes("premium-snapshot"),
      signatureVisual: html.includes("sig-vertical-stage"),
      actionExamples: (html.match(/class="action-example"/g) ?? []).length,
      specificEvidenceVisible: specificVisible,
      evidenceMappingRows: evMap.rows.length,
      evidenceMappingOk: evMap.ok,
      genericAdvice: findConsultingGenericAdvice(text),
      genericCoachingPrinciple: principleCoachingHits(html),
      particles: findConsultingParticleErrors(html),
      internalTerms: findInternalCustomerTerms(html),
      frameworkLabels: findConsultingFrameworkLabels(html),
      hardKoreanErrors: findConsultingHardKoreanErrors(text),
    };
  }

  const easyKoreanPass =
    Object.values(per).every(
      (row) =>
        ((row as { hardKoreanErrors: string[] }).hardKoreanErrors?.length ?? 0) === 0 &&
        ((row as { particles: string[] }).particles?.length ?? 0) === 0
    ) ? "PASS" : "FAIL";

  const genericCoachingCount = Object.values(per).reduce(
    (n, row) => n + ((row as { genericCoachingPrinciple: string[] }).genericCoachingPrinciple?.length ?? 0),
    0
  );

  const report = {
    per,
    finalReport: {
      specificEvidenceVisible: {
        Money: evidencePass.money,
        Career: evidencePass.career,
        Love: evidencePass.love,
        Total: evidencePass.total,
      },
      easyKorean: easyKoreanPass,
      genericCoaching: `${genericCoachingCount} / actual`,
      hardKorean: Object.values(per).reduce(
        (n, row) => n + ((row as { hardKoreanErrors: string[] }).hardKoreanErrors?.length ?? 0),
        0
      ),
      focusPage2PremiumDensity: "HUMAN REVIEW",
      totalSignatureVisual: "HUMAN REVIEW",
      humanValueGate: "WAITING FOR USER",
      liveGemini: "NOT RUN",
    },
  };

  fs.writeFileSync(path.join(OUT, "premium-value-final-qa.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report.finalReport, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
