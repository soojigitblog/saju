/**
 * RELEASE RENDER FIX — Chromium PDF + last-page QA.
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-release-render-final.ts
 *
 * CONTENT / ENGINE / LIVE GEMINI unchanged.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium, type Page } from "playwright";
import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildInterpretationContextV2 } from "../src/lib/ai/interpretation-context-v2";
import { buildMockPaidResult } from "../src/lib/ai/interpreters/mock-content";
import { enrichConsultingGrade } from "../src/lib/ai/interpreters/mock-consulting-grade";
import {
  buildPaidReportPdfHtmlConsulting,
  findConsultingGarbledText,
  snapshotFields,
} from "../src/lib/report/paid-report-pdf-consulting";
import { buildConsultingPack } from "../src/lib/report/v5/consulting-value-pack";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "release-render-final");

const ACTION_PHRASE: Record<string, string> = {
  money: "반복되는 지출",
  career: "지금은 정리 중",
  love: "바로 추궁",
  total: "관심 없음을 부정",
};

async function waitFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(400);
}

function extractPdfText(pdfPath: string): { text: string; method: string } {
  try {
    const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
      encoding: "utf8",
      timeout: 30_000,
    });
    return { text, method: "pdftotext" };
  } catch {
    return { text: "", method: "unavailable" };
  }
}

function pdfPageCount(pdfPath: string): number {
  try {
    const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8", timeout: 15_000 });
    const m = info.match(/Pages:\s+(\d+)/);
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
}

async function chromiumRenderAndQa(htmlPath: string, pdfPath: string, pngPath: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), {
      waitUntil: "load",
      timeout: 120_000,
    });
    await waitFonts(page);

    const printSourceText = await page.evaluate(() => document.body.innerText);
    const last = page.locator(".page.page-final").last();
    await last.waitFor({ state: "visible", timeout: 60_000 });
    await last.screenshot({ path: pngPath });
    const lastPageText = await last.evaluate((node) => (node as HTMLElement).innerText);
    const dom = await last.evaluate((node) => {
      const pageEl = node as HTMLElement;
      const body = pageEl.querySelector(".page-body") as HTMLElement | null;
      const footer = pageEl.querySelector(".footer") as HTMLElement | null;
      const bodyRect = body?.getBoundingClientRect();
      const footerRect = footer?.getBoundingClientRect();
      const overflow =
        body && body.scrollHeight > body.clientHeight + 2 ? body.scrollHeight - body.clientHeight : 0;
      const gap = bodyRect && footerRect ? footerRect.top - bodyRect.bottom : null;
      return {
        bodyScrollHeight: body?.scrollHeight ?? 0,
        bodyClientHeight: body?.clientHeight ?? 0,
        overflowPx: overflow,
        footerGapPx: gap,
        footerCollision: gap !== null && gap < 8,
      };
    });

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
      preferCSSPageSize: true,
    });

    return { printSourceText, lastPageText, dom };
  } finally {
    await browser.close();
  }
}

function snapshotMappingPass(kind: "career" | "love" | "money", pack: ReturnType<typeof buildConsultingPack>) {
  const f = snapshotFields(pack, kind);
  if (kind === "career") {
    const sameStrengthCaution = f.strength.value === f.caution.value;
    const misreadIsConflict =
      f.misread.includes("갈등") && f.misread.includes("단호") && f.strength.label !== "갈등 패턴";
    return (
      f.strength.label === "잘 맞는 구조" &&
      f.caution.label === "지치는 구조" &&
      !sameStrengthCaution &&
      !misreadIsConflict &&
      f.misread.length > 0
    );
  }
  if (kind === "love") {
    const misreadSameAsCaution = f.misread === f.caution.value;
    return f.caution.label !== "확신 후" && f.caution.value === "관찰 기간이 길어짐" && f.misread.length > 0;
  }
  return f.strength.label.length > 0 && f.caution.label.length > 0;
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
  let clippedTotal = 0;
  let garbledTotal = 0;
  let footerCollisionTotal = 0;

  for (const job of jobs) {
    const raw = enrichConsultingGrade(
      buildMockPaidResult(ctx, job.name, { productSlug: job.slug, chart })
    );
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
    const pngPath = path.join(OUT, `${job.stem}-last.png`);
    fs.writeFileSync(htmlPath, html, "utf8");

    const { printSourceText, lastPageText, dom } = await chromiumRenderAndQa(htmlPath, pdfPath, pngPath);
    const pdfExtract = extractPdfText(pdfPath);
    const textForQa = pdfExtract.text.length > 40 ? pdfExtract.text : printSourceText;
    const textMethod =
      pdfExtract.text.length > 40 ? pdfExtract.method : "chromium-print-source-innerText";

    const garbled = findConsultingGarbledText(textForQa);
    const lastGarbled = findConsultingGarbledText(lastPageText);
    const actionOk = printSourceText.includes(ACTION_PHRASE[job.kind]!);
    const pages = (html.match(/class="page /g) ?? []).length;
    const pdfPages = pdfPageCount(pdfPath) || pages;

    const lastPagePass =
      garbled.length === 0 &&
      lastGarbled.length === 0 &&
      actionOk &&
      dom.overflowPx <= 2 &&
      !dom.footerCollision &&
      lastPageText.includes("기억해 두면 좋은 문장");

    if (garbled.length) garbledTotal += garbled.length;
    if (dom.overflowPx > 2) clippedTotal += 1;
    if (dom.footerCollision) footerCollisionTotal += 1;

    console.log("PDF", job.stem, { dom, actionOk, garbled, lastGarbled, textMethod });

    per[job.kind] = {
      htmlPages: pages,
      pdfPages,
      lastPagePass,
      textMethod,
      garbled,
      lastGarbled,
      actionPhrase: ACTION_PHRASE[job.kind],
      actionOk,
      dom,
      snapshotMapping:
        job.kind === "total" ? "N/A" : snapshotMappingPass(job.kind, pack) ? "PASS" : "FAIL",
    };
  }

  const report = {
    per,
    finalReport: {
      careerLastPage: (per.career as { lastPagePass: boolean }).lastPagePass ? "PASS" : "FAIL",
      loveLastPage: (per.love as { lastPagePass: boolean }).lastPagePass ? "PASS" : "FAIL",
      moneyLastPage: (per.money as { lastPagePass: boolean }).lastPagePass ? "PASS" : "FAIL",
      totalLastPage: (per.total as { lastPagePass: boolean }).lastPagePass ? "PASS" : "FAIL",
      clippedContent: `${clippedTotal} / actual`,
      garbledText: `${garbledTotal} / actual`,
      footerCollision: `${footerCollisionTotal} / actual`,
      careerSnapshotMapping: (per.career as { snapshotMapping: string }).snapshotMapping,
      loveSnapshotMapping: (per.love as { snapshotMapping: string }).snapshotMapping,
      moneySnapshotRegression: (per.money as { snapshotMapping: string }).snapshotMapping,
      content: "UNCHANGED",
      engine: "UNCHANGED",
      liveGemini: "NOT RUN",
      humanValueGate: "WAITING FINAL PDF CONFIRMATION",
    },
  };

  fs.writeFileSync(path.join(OUT, "release-render-final-qa.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report.finalReport, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
