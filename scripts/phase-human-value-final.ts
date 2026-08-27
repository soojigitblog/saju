/**
 * HUMAN VALUE FINAL — packaging pass PDF output.
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-human-value-final.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildInterpretationContextV2 } from "../src/lib/ai/interpretation-context-v2";
import { buildMockPaidResult } from "../src/lib/ai/interpreters/mock-content";
import { enrichConsultingGrade } from "../src/lib/ai/interpreters/mock-consulting-grade";
import { generatePaidReportPdf } from "../src/lib/report/generate-paid-report-pdf";
import {
  findConsultingGarbledText,
  snapshotFields,
} from "../src/lib/report/paid-report-pdf-consulting";
import { buildConsultingPack } from "../src/lib/report/v5/consulting-value-pack";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "human-value-final");

async function waitFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(400);
}

async function renderPdf(htmlPath: string, pdfPath: string) {
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

function snapshotPass(kind: "money" | "career" | "love", pack: ReturnType<typeof buildConsultingPack>) {
  const f = snapshotFields(pack, kind);
  if (kind === "love") {
    return f.caution.label !== "확신 후" && f.caution.value === "관찰 기간이 길어짐" && f.misread.length > 0;
  }
  if (kind === "career") {
    return f.strength.label === "잘 맞는 구조" && f.caution.label === "지치는 구조";
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

  for (const job of jobs) {
    const raw = enrichConsultingGrade(
      buildMockPaidResult(ctx, job.name, { productSlug: job.slug, chart })
    );
    const pack = buildConsultingPack(job.kind, raw);
    const html = generatePaidReportPdf({
      nickname: "수지",
      productName: job.name,
      productSlug: job.slug,
      report: raw,
      chart,
      live: false,
    }).html;
    const htmlPath = path.join(OUT, `${job.stem}.html`);
    const pdfPath = path.join(OUT, `${job.stem}.pdf`);
    fs.writeFileSync(htmlPath, html, "utf8");
    await renderPdf(htmlPath, pdfPath);
    console.log("PDF", job.stem);

    const text = html.replace(/<[^>]+>/g, " ");
    per[job.kind] = {
      pages: (html.match(/class="page /g) ?? []).length,
      capstonePage: html.includes("page-playbook-capstone"),
      noContinuationArtifact: !html.includes(">이어서<"),
      moneyTriggerFixed: job.kind !== "money" || text.includes("결정을 계속 미루며"),
      noArbitraryDayTrigger: !text.includes("사흘 이상"),
      stackedSignature: job.kind !== "total" || html.includes("sig-vertical-stack"),
      garbled: findConsultingGarbledText(text),
      snapshot: job.kind === "total" ? "N/A" : snapshotPass(job.kind, pack) ? "PASS" : "FAIL",
    };
  }

  const report = {
    per,
    finalGate: {
      render: "PASS",
      careerSnapshot: (per.career as { snapshot: string }).snapshot,
      moneySnapshot: (per.money as { snapshot: string }).snapshot,
      loveSnapshot: (per.love as { snapshot: string }).snapshot,
      playbookPackaging: "HUMAN REVIEW",
      totalSignaturePage: "HUMAN REVIEW",
      content: "FROZEN",
      liveGemini: "NOT RUN",
      humanValueGate: "WAITING FINAL USER",
    },
  };

  fs.writeFileSync(path.join(OUT, "human-value-final-qa.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report.finalGate, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
