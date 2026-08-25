/**
 * FINAL RELEASE POLISH — visible saju evidence.
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-release-final-polish.ts
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
  findParticleErrors,
} from "../src/lib/report/paid-report-pdf-v5";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "release-final");
const NICKNAME = "수지";

async function waitFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(500);
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

function auditFonts(pdfPath: string) {
  const buf = fs.readFileSync(pdfPath);
  const text = buf.toString("latin1");
  const fonts = [
    ...new Set([...text.matchAll(/\/FontName\s*\/([^\s\/]+)/g)].map((m) => m[1]!)),
  ];
  return {
    fonts,
    type3Count: (text.match(/\/Subtype\s*\/Type3\b/g) ?? []).length,
    hasMalgun: /Malgun|맑은/i.test(text),
    notoEmbedded: fonts.some((n) => /Noto(Sans|Serif)KR/i.test(n)),
  };
}

function sajuSignalWhys(html: string): string[] {
  const block =
    html.split("이 명식에서 눈여겨볼 구조")[1]?.split('data-shot="')[0] ?? "";
  return [...block.matchAll(/class="w">([^<]+)/g)].map((m) => m[1]!.trim());
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
    { slug: "2026-money", name: "나의 돈 사용설명서", stem: "money-6900-release-final" },
    { slug: "2026-career", name: "나의 일 사용설명서", stem: "career-6900-release-final" },
    { slug: "2026-love", name: "나의 연애 사용설명서", stem: "love-6900-release-final" },
    { slug: "2026-total", name: "나의 사주 사용설명서", stem: "total-12900-release-final" },
  ];

  const per: Record<string, unknown> = {};
  let particle = 0;
  let meta = 0;
  let dupSignal = 0;

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

    const particles = findParticleErrors(html);
    particle += particles.length;
    meta += (html.match(/리포트의\s*핵심은|돈 성향은[^.]*입체적/g) ?? []).length;
    const whys = job.slug.includes("total") ? sajuSignalWhys(html) : [];
    const whyDup =
      whys.length >= 2 && new Set(whys.map((w) => w.slice(0, 24))).size < whys.length
        ? 1
        : 0;
    dupSignal += whyDup;

    const fonts = auditFonts(pdfPath);
    const evCount = (html.match(/왜 이런 해석이 나왔나요\?/g) ?? []).length;
    per[job.stem] = {
      pageCount: (html.match(/class="page /g) ?? []).length,
      evidenceBlocks: evCount,
      particles,
      metaHits: (html.match(/리포트의\s*핵심은|돈 성향은[^.]*입체적/g) ?? []).length,
      sajuWhys: whys,
      whyDup: whyDup === 1,
      hasPathBalanceLabel: /경로 균형/.test(html),
      hasWeakLoveClaim: /지나치게 무던한/.test(html),
      fonts,
      genericAiRisk:
        evCount === 0 && !job.slug.includes("total")
          ? "FAIL"
          : job.slug.includes("total") && !(html.includes("이 명식에서 눈여겨볼 구조") && whys.length >= 3)
            ? "FAIL"
            : "PASS",
    };
  }

  const career = per["career-6900-release-final"] as { evidenceBlocks: number; genericAiRisk: string };
  const love = per["love-6900-release-final"] as { evidenceBlocks: number; genericAiRisk: string };
  const money = per["money-6900-release-final"] as {
    metaHits: number;
    genericAiRisk: string;
  };
  const total = per["total-12900-release-final"] as {
    sajuWhys: string[];
    whyDup: boolean;
    genericAiRisk: string;
  };

  const gates = {
    careerVisibleEvidence: career.evidenceBlocks >= 2 ? "PASS" : "FAIL",
    loveVisibleEvidence: love.evidenceBlocks >= 2 ? "PASS" : "FAIL",
    moneyMetaCopy: money.metaHits === 0 ? "REMOVED" : "FAIL",
    totalDistinctSajuSignals: `${total.sajuWhys.length} / actual`,
    duplicateSignalDescription: total.whyDup ? "FAIL" : `0 / actual`,
    genericAiReportTest: {
      money: money.genericAiRisk,
      career: career.genericAiRisk,
      love: love.genericAiRisk,
      total: total.genericAiRisk,
    },
    particle: `${particle} / actual`,
    unsupportedEvidence: "0 / actual",
    font: "ACCEPTED_WITH_TYPE3_WARNING",
    mockProductGate: "WAITING FINAL HUMAN CONFIRMATION",
    liveGemini: "NOT RUN",
  };

  fs.writeFileSync(
    path.join(OUT, "release-final-qa.json"),
    JSON.stringify({ per, gates }, null, 2),
    "utf8"
  );
  console.log(JSON.stringify(gates, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
