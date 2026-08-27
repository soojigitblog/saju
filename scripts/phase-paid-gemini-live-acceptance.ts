/**
 * PAID GEMINI LIVE ACCEPTANCE
 *
 * Human Value Gate PASSED → Live Gemini allowed.
 * MOCK CLOSED — no enrichConsultingGrade overlay.
 * PDF DESIGN FROZEN — consulting HTML assembler only.
 *
 * Usage:
 *   npx tsx --env-file=.env.local --require ./scripts/shim-server-only.cjs scripts/phase-paid-gemini-live-acceptance.ts
 *
 * Requires: GEMINI_API_KEY_PAID (no free-key fallback)
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildInterpretationContextV2 } from "../src/lib/ai/interpretation-context-v2";
import { ProviderFortuneInterpreter } from "../src/lib/ai/interpreters/provider-interpreter";
import { buildPaidProductInstruction } from "../src/lib/ai/prompts/build-paid-prompt";
import { targetLengthForPaidProduct } from "../src/lib/ai/schemas/paid-report";
import { scorePaidReportQuality } from "../src/lib/ai/validators/paid-quality";
import { countLevel3 } from "../src/lib/ai/interpreters/mock-consulting-grade";
import {
  buildPaidReportPdfHtmlConsulting,
  findConsultingFrameworkLabels,
  findConsultingGarbledText,
  findConsultingGenericAdvice,
  findConsultingParticleErrors,
  findInternalCustomerTerms,
} from "../src/lib/report/paid-report-pdf-consulting";
import { buildConsultingPack } from "../src/lib/report/v5/consulting-value-pack";
import { validateEvidenceMappings } from "../src/lib/report/v5/consulting-evidence";
import type { PaidFortuneReport } from "../src/lib/ai/schemas/paid-report";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "paid-gemini-live");
const NICKNAME = "수지";
const CHART_INPUT = {
  gender: "female" as const,
  calendarType: "solar" as const,
  birthDate: "1990-05-15",
  birthTime: "10:30",
  birthTimeUnknown: false,
  lunarLeapMonth: false,
  timezone: "Asia/Seoul",
  countryCode: "KR",
};

const PROMPT = {
  promptDefinitionId: "11111111-1111-1111-1111-111111111101",
  promptVersionId: "22222222-2222-2222-2222-222222222201",
  promptVersionNumber: 1,
};

const ONLY = (process.env.LIVE_ONLY ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const JOBS_ALL = [
  { slug: "2026-money", name: "나의 돈 사용설명서", stem: "money", kind: "money" as const, price: 6900 },
  { slug: "2026-career", name: "나의 일 사용설명서", stem: "career", kind: "career" as const, price: 6900 },
  { slug: "2026-love", name: "나의 연애 사용설명서", stem: "love", kind: "love" as const, price: 6900 },
  { slug: "2026-total", name: "나의 사주 사용설명서", stem: "total", kind: "total" as const, price: 12900 },
];

const JOBS = ONLY.length ? JOBS_ALL.filter((j) => ONLY.includes(j.stem)) : JOBS_ALL;

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
      waitUntil: "load",
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

function liveQa(report: PaidFortuneReport, kind: (typeof JOBS)[number]["kind"], html: string) {
  const pack = buildConsultingPack(kind, report, { live: true });
  const text = plainText(html);
  const quality = scorePaidReportQuality(report, {
    productSlug: kind === "money" ? "2026-money" : kind === "career" ? "2026-career" : kind === "love" ? "2026-love" : "2026-total",
  });
  const level3 = countLevel3(report);
  const level3Target = kind === "total" ? 7 : 4;
  const pages = (html.match(/class="page /g) ?? []).length;
  const garbled = findConsultingGarbledText(text);
  const generic = findConsultingGenericAdvice(text);
  const particles = findConsultingParticleErrors(html);
  const internal = findInternalCustomerTerms(html);
  const framework = findConsultingFrameworkLabels(html);
  const hasCapstone = html.includes("page-playbook-capstone") || pages <= 8;
  const hasFinal = html.includes("page-final");
  const discoveries = pack.discoveries.length;
  const chains = pack.discoveries.filter((d) => d.chain.length >= 4).length;
  const misreads = pack.discoveries.filter((d) => d.outsideView || d.selfMisread).length;

  const autoPass =
    quality.pass &&
    level3 >= level3Target &&
    discoveries >= (kind === "total" ? 6 : 4) &&
    garbled.length === 0 &&
    generic.length === 0 &&
    particles.length === 0 &&
    framework.length === 0 &&
    hasFinal &&
    (report.actionItems?.length ?? 0) >= (kind === "total" ? 8 : 5);

  return {
    gemini: "PASS" as const,
    model: report.meta?.model,
    provider: report.meta?.provider,
    usage: report.meta?.usage,
    qualityPass: quality.pass,
    qualityScore: quality.score,
    level3,
    level3Target,
    discoveries,
    chains,
    misreads,
    actions: report.actionItems?.length ?? 0,
    contradictions: report.contradictions?.length ?? 0,
    crossDomain: report.crossDomainLinks?.length ?? 0,
    patternChains: report.patternChains?.length ?? 0,
    pages,
    hasCapstone,
    hasFinal,
    garbled,
    generic,
    particles,
    internal,
    framework,
    autoPass,
    humanReview: "WAITING",
  };
}

async function main() {
  // Large structured paid reports: headroom + fewer stacked retries.
  process.env.AI_TIMEOUT_MS = process.env.AI_TIMEOUT_MS?.trim() || "300000";
  process.env.AI_MAX_RETRIES = process.env.AI_MAX_RETRIES?.trim() || "1";
  fs.mkdirSync(OUT, { recursive: true });
  const paidKey = Boolean(process.env.GEMINI_API_KEY_PAID?.trim());
  const summary: Record<string, unknown> = {
    phase: "PAID_GEMINI_LIVE_ACCEPTANCE",
    at: new Date().toISOString(),
    humanValueGate: "READY",
    mock: "CLOSED",
    pdfDesign: "FROZEN",
    contentFrozen: true,
    paidKeyPresent: paidKey,
    timeoutMs: process.env.AI_TIMEOUT_MS,
    maxRetries: process.env.AI_MAX_RETRIES,
  };

  console.log("## PAID GEMINI LIVE ACCEPTANCE\n");
  console.log(`GEMINI_API_KEY_PAID: ${paidKey ? "SET" : "MISSING"}`);
  console.log(`GEMINI_MODEL_PAID: ${process.env.GEMINI_MODEL_PAID ?? "(default)"}`);

  if (!paidKey) {
    summary.gate = "BLOCKED";
    summary.blocker =
      "GEMINI_API_KEY_PAID missing in .env.local — free/legacy key fallback is forbidden for paid live.";
    fs.writeFileSync(path.join(OUT, "live-acceptance-summary.json"), JSON.stringify(summary, null, 2), "utf8");
    console.log("\nGATE: BLOCKED — set GEMINI_API_KEY_PAID then re-run.");
    process.exitCode = 2;
    return;
  }

  const chart = fortuneEngine.calculate(CHART_INPUT);
  const ctx = buildFortuneAiContext(chart);
  const v2 = buildInterpretationContextV2(ctx, chart);
  const paidInterp = new ProviderFortuneInterpreter("gemini", undefined, "paid");

  const per: Record<string, unknown> = {};

  for (const job of JOBS) {
    console.log(`\nGenerating LIVE ${job.name} (₩${job.price})...`);
    try {
      const report = await paidInterp.generatePaid({
        chart,
        product: {
          slug: job.slug,
          name: job.name,
          targetLengthChars: targetLengthForPaidProduct(job.slug),
        },
        promptVersion: {
          ...PROMPT,
          productInstruction: buildPaidProductInstruction({ slug: job.slug, name: job.name }),
        },
        presentation: { nickname: NICKNAME, maritalStatus: "unmarried" },
      });

      fs.writeFileSync(
        path.join(OUT, `live-${job.stem}.json`),
        JSON.stringify(report, null, 2),
        "utf8"
      );

      const pack = buildConsultingPack(job.kind, report, { live: true });
      const evMap = validateEvidenceMappings(
        pack.discoveries.map((d) => ({ id: d.id, evidenceSources: d.evidenceSources })),
        v2
      );

      const html = buildPaidReportPdfHtmlConsulting({
        nickname: NICKNAME,
        productName: job.name,
        productSlug: job.slug,
        report,
        ctx,
        v2,
        live: true,
      });
      const htmlPath = path.join(OUT, `${job.stem}.html`);
      const pdfPath = path.join(OUT, `${job.stem}.pdf`);
      fs.writeFileSync(htmlPath, html, "utf8");
      await htmlToPdf(htmlPath, pdfPath);

      const qa = liveQa(report, job.kind, html);
      per[job.kind] = {
        ...qa,
        evidenceMappingRows: evMap.rows.length,
        evidenceMappingOk: evMap.ok,
        pdf: `${job.stem}.pdf`,
        signature: report.signatureStatement,
      };
      console.log(
        `${job.stem.toUpperCase()}: ${qa.autoPass ? "AUTO_PASS" : "NEEDS_REVIEW"} model=${qa.model} L3=${qa.level3}/${qa.level3Target} pages=${qa.pages}`
      );
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      per[job.kind] = { gemini: "FAIL", error: err, autoPass: false };
      console.log(`${job.stem.toUpperCase()}: FAIL`, err);
    }
  }

  const kinds = JOBS.map((j) => j.kind);
  const allGenerated = kinds.every((k) => (per[k] as { gemini?: string })?.gemini === "PASS");
  const allAuto = kinds.every((k) => (per[k] as { autoPass?: boolean })?.autoPass === true);

  summary.per = per;
  summary.gate = !allGenerated
    ? "FAIL"
    : allAuto
      ? "AUTO_PASS — HUMAN REVIEW recommended"
      : "GENERATED — HUMAN REVIEW required";
  summary.finalReport = {
    money6900: (per.money as { autoPass?: boolean; gemini?: string })?.gemini === "PASS"
      ? (per.money as { autoPass: boolean }).autoPass
        ? "AUTO_PASS"
        : "HUMAN REVIEW"
      : "FAIL",
    career6900: (per.career as { autoPass?: boolean; gemini?: string })?.gemini === "PASS"
      ? (per.career as { autoPass: boolean }).autoPass
        ? "AUTO_PASS"
        : "HUMAN REVIEW"
      : "FAIL",
    love6900: (per.love as { autoPass?: boolean; gemini?: string })?.gemini === "PASS"
      ? (per.love as { autoPass: boolean }).autoPass
        ? "AUTO_PASS"
        : "HUMAN REVIEW"
      : "FAIL",
    total12900: (per.total as { autoPass?: boolean; gemini?: string })?.gemini === "PASS"
      ? (per.total as { autoPass: boolean }).autoPass
        ? "AUTO_PASS"
        : "HUMAN REVIEW"
      : "FAIL",
    mock: "CLOSED",
    liveGemini: "RUN",
    pdfDesign: "FROZEN",
    humanValueGate: "READY",
  };

  fs.writeFileSync(path.join(OUT, "live-acceptance-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log("\n" + JSON.stringify(summary.finalReport, null, 2));
  console.log(`\nGATE: ${summary.gate}`);
  console.log(`Output: ${OUT}`);

  if (!allGenerated) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
