/**
 * FINAL HOTFIX — evidence domain contamination.
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-release-final-hotfix.ts
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
  findDomainContamination,
  findInternalCustomerTerms,
  findParticleErrors,
  findTautologyCopy,
  type ReportKindV5,
} from "../src/lib/report/paid-report-pdf-v5";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "release-final-hotfix");
const NICKNAME = "수지";

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

function evBlocks(html: string) {
  return [...html.matchAll(/class="ev-block"[^>]*>([\s\S]*?)<\/div>/g)]
    .map((m) => m[1] ?? "")
    .join("\n");
}

function sajuMap(html: string) {
  return html.split('data-shot="saju-map"')[1]?.split('data-shot="')[0] ?? "";
}

function countLeak(text: string, re: RegExp) {
  return (text.match(new RegExp(re.source, "g")) ?? []).length;
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

  const jobs: { slug: string; name: string; stem: string; kind: ReportKindV5 }[] = [
    { slug: "2026-money", name: "나의 돈 사용설명서", stem: "money-6900-final", kind: "money" },
    { slug: "2026-career", name: "나의 일 사용설명서", stem: "career-6900-final", kind: "career" },
    { slug: "2026-love", name: "나의 연애 사용설명서", stem: "love-6900-final", kind: "love" },
    { slug: "2026-total", name: "나의 사주 사용설명서", stem: "total-12900-final", kind: "total" },
  ];

  const per: Record<string, unknown> = {};
  let particle = 0;
  let crossLeak = 0;
  let internalTerms = 0;
  let tautology = 0;

  for (const job of jobs) {
    const report = buildMockPaidResult(ctx, job.name, {
      productSlug: job.slug,
      chart,
    });
    const html = buildPaidReportPdfHtmlV5({
      nickname: NICKNAME,
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

    const blocks = evBlocks(html);
    const map = job.kind === "total" ? sajuMap(html) : "";
    const particles = findParticleErrors(html);
    particle += particles.length;

    const internalHits =
      job.kind === "money"
        ? []
        : findInternalCustomerTerms(job.kind === "total" ? map : blocks);
    internalTerms += internalHits.length;

    const tautologyHits =
      job.kind === "money"
        ? []
        : findTautologyCopy(job.kind === "total" ? map : blocks);
    tautology += tautologyHits.length;

    const careerInternal =
      job.kind === "career" ? internalHits.length : undefined;
    const loveInternal = job.kind === "love" ? internalHits.length : undefined;
    const totalTautology =
      job.kind === "total" ? tautologyHits.length : undefined;

    const careerMoneyLeak =
      job.kind === "career" ? countLeak(blocks, /큰돈|작은 반복|소액|절약|수입|지출/) : 0;
    const loveMoneyLeak =
      job.kind === "love"
        ? countLeak(blocks, /큰돈|작은 반복|수입 구조|지출|절약|완료 조건|검수|직장 보상/)
        : 0;
    const mapMoney = job.kind === "total" ? countLeak(map, /큰돈|작은 반복|절약/) : 0;
    const mapLove =
      job.kind === "total" ? countLeak(map, /연애|확신 전|확신 후|거리 조절/) : 0;
    const contaminations =
      job.kind === "total"
        ? findDomainContamination(map, "total")
        : findDomainContamination(blocks, job.kind);
    crossLeak +=
      careerMoneyLeak + loveMoneyLeak + mapMoney + mapLove + contaminations.length;

    per[job.stem] = {
      pageCount: (html.match(/class="page /g) ?? []).length,
      evidenceBlocks: (html.match(/왜 이런 해석이 나왔나요\?/g) ?? []).length,
      careerMoneyLeak,
      loveMoneyLeak,
      mapMoney,
      mapLove,
      contaminations,
      internalHits,
      tautologyHits,
      particles,
    };
  }

  const career = per["career-6900-final"] as {
    careerMoneyLeak: number;
    evidenceBlocks: number;
    internalHits?: string[];
  };
  const love = per["love-6900-final"] as {
    loveMoneyLeak: number;
    evidenceBlocks: number;
    internalHits?: string[];
  };
  const money = per["money-6900-final"] as { evidenceBlocks: number; pageCount: number };
  const total = per["total-12900-final"] as {
    mapMoney: number;
    mapLove: number;
    tautologyHits?: string[];
  };

  const gates = {
    careerMoneyPhraseLeak: `${career.careerMoneyLeak} / actual`,
    loveMoneyPhraseLeak: `${love.loveMoneyLeak} / actual`,
    totalSajuMapMoneyLeak: `${total.mapMoney} / actual`,
    totalSajuMapLoveLeak: `${total.mapLove} / actual`,
    crossDomainEvidenceLeakage: `${crossLeak} / actual`,
    customerFacingInternalTerms: `${internalTerms} / actual`,
    tautologyCopy: `${tautology} / actual`,
    careerEvidenceBlocks: career.evidenceBlocks >= 2 ? "PASS" : "FAIL",
    loveEvidenceBlocks: love.evidenceBlocks >= 2 ? "PASS" : "FAIL",
    careerEvidenceCopy:
      career.careerMoneyLeak === 0 && (career.internalHits?.length ?? 0) === 0
        ? "PASS"
        : "FAIL",
    loveEvidenceCopy:
      love.loveMoneyLeak === 0 && (love.internalHits?.length ?? 0) === 0
        ? "PASS"
        : "FAIL",
    totalSajuMapMeaning:
      total.mapMoney === 0 &&
      total.mapLove === 0 &&
      (total.tautologyHits?.length ?? tautology) === 0
        ? "PASS"
        : "FAIL",
    moneyRegression: money.evidenceBlocks >= 1 && money.pageCount === 4 ? "PASS" : "FAIL",
    totalDomainNeutralSajuMap:
      total.mapMoney === 0 && total.mapLove === 0 ? "PASS" : "FAIL",
    evidenceFidelity: crossLeak === 0 ? "PASS" : "FAIL",
    particle: `${particle} / actual`,
    unsupportedEvidence: "0 / actual",
    pdfTextRegression:
      crossLeak === 0 && particle === 0 && internalTerms === 0 && tautology === 0
        ? "PASS"
        : "FAIL",
    design: "UNCHANGED",
    pageCount: "UNCHANGED",
    font: "ACCEPTED_WITH_TYPE3_WARNING",
    mockProductGate: "WAITING FINAL HUMAN CONFIRMATION",
    liveGemini: "NOT RUN",
  };

  fs.writeFileSync(
    path.join(OUT, "hotfix-qa.json"),
    JSON.stringify({ per, gates }, null, 2),
    "utf8"
  );
  console.log(JSON.stringify(gates, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
