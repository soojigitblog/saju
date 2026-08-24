/**
 * PDF visual QA from mock premium reports (no Gemini).
 * Same HTML/PDF pipeline as phase-p11-live-acceptance.ts
 *
 *   npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-p11-mock-pdf.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildMockPaidResult } from "../src/lib/ai/interpreters/mock-content";
import { formatFortuneEvidenceForDisplay } from "../src/lib/presentation/format-evidence-label";
import type { PaidFortuneReport } from "../src/lib/ai/schemas/paid-report";

const OUT = path.join(process.cwd(), "tmp", "quality-review");
const NICKNAME = "수지";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paidToHtml(input: {
  nickname: string;
  productName: string;
  orderNo: string;
  report: PaidFortuneReport;
}): string {
  const r = input.report;
  const chapters = r.sections
    .map((s, i) => {
      const n = String(i + 1).padStart(2, "0");
      const evidence = formatFortuneEvidenceForDisplay(s.evidence).join(" · ");
      return `
      <section class="chapter">
        <p class="muted">${n}</p>
        <h2>${esc(s.title)}</h2>
        ${s.pullQuote ? `<blockquote>${esc(s.pullQuote)}</blockquote>` : ""}
        <p class="lead">${esc(s.summary)}</p>
        <p>${esc(s.detail)}</p>
        ${
          s.whyReading
            ? `<div class="why"><p class="why-label">WHY · 왜 이렇게 읽었나요?</p><p>${esc(s.whyReading)}</p><p class="evidence">Evidence · ${esc(evidence)}</p></div>`
            : ""
        }
      </section>`;
    })
    .join("\n");

  const traits = (r.coreTraits ?? [])
    .map((t) => `<li>${esc(t)}</li>`)
    .join("");
  const fe = (r.fiveElementsSnapshot ?? [])
    .map((el) => {
      const max = Math.max(
        1,
        ...(r.fiveElementsSnapshot ?? []).map((x) => x.count)
      );
      const pct = Math.round((el.count / max) * 100);
      return `<div class="el"><div class="bar-wrap"><div class="bar" style="height:${Math.max(8, pct)}%"></div></div><div>${esc(el.label)}</div><div class="muted">${el.count}</div></div>`;
    })
    .join("");

  const contradictions = (r.contradictions ?? [])
    .map(
      (c) =>
        `<article class="card"><p class="gold">${esc(c.poleA)} × ${esc(c.poleB)}</p><p>${esc(c.reading)}</p></article>`
    )
    .join("");

  const actions = r.actionGuide.map((a) => `<li>${esc(a)}</li>`).join("");
  const core = r.finalSummary.core.map((x) => `<li>${esc(x)}</li>`).join("");
  const cautions = r.finalSummary.cautions
    .map((x) => `<li>${esc(x)}</li>`)
    .join("");
  const leverage = r.finalSummary.leverage
    .map((x) => `<li>${esc(x)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>${esc(input.productName)} — ${esc(input.nickname)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; color: #0b1c2c; background: #f7f1e6; font-size: 11pt; line-height: 1.65; }
  .cover { page-break-after: always; background: #06101c; color: #f3ebdd; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px; }
  .cover .brand { letter-spacing: 0.35em; color: #c9a227; font-size: 12px; }
  .cover h1 { font-size: 28px; font-weight: 600; margin: 24px 0 12px; line-height: 1.35; }
  .cover .meta { color: #b8b0a0; font-size: 12px; }
  .body { padding: 8px 4px 40px; }
  h2 { font-size: 16px; margin: 0 0 8px; color: #06101c; }
  .muted { color: #6b6458; font-size: 10px; letter-spacing: 0.15em; }
  .gold { color: #8a7020; }
  .sig { border: 1px solid rgba(201,162,39,0.45); padding: 20px; margin-bottom: 24px; background: #fffdf8; page-break-after: always; }
  .sig h2 { font-size: 18px; line-height: 1.5; }
  .traits { margin: 12px 0; padding-left: 18px; }
  .els { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 16px; text-align: center; }
  .bar-wrap { height: 56px; background: rgba(201,162,39,0.1); display: flex; align-items: flex-end; padding: 2px; }
  .bar { width: 100%; background: #c9a227; }
  .chapter { border-top: 1px solid #ddd4c4; padding-top: 18px; margin-top: 22px; break-inside: avoid; page-break-inside: avoid; }
  blockquote { border-left: 3px solid #c9a227; margin: 10px 0; padding-left: 12px; color: #8a7020; font-style: italic; }
  .lead { font-weight: 600; }
  .why { margin-top: 12px; border: 1px solid rgba(201,162,39,0.35); background: rgba(201,162,39,0.08); padding: 12px; }
  .why-label { color: #8a7020; font-size: 10px; letter-spacing: 0.15em; margin: 0 0 6px; }
  .evidence { font-size: 10px; color: #6b6458; }
  .card { border: 1px solid #ddd4c4; padding: 12px; margin: 8px 0; background: #fffdf8; }
  .final { margin-top: 28px; border: 1px solid rgba(201,162,39,0.45); padding: 20px; background: #fffdf8; page-break-before: always; }
  .closing { font-size: 15px; color: #8a7020; margin-top: 16px; }
</style>
</head>
<body>
  <header class="cover">
    <p class="brand">運의結</p>
    <h1>${esc(input.nickname)}님의<br/>사주 리포트</h1>
    <p class="meta">${esc(input.productName)}</p>
    <p class="meta" style="margin-top:28px;letter-spacing:0.25em">四柱 · 命式</p>
    <p class="meta" style="margin-top:12px">주문번호 ${esc(input.orderNo)}</p>
  </header>
  <div class="body">
    <section class="sig">
      <p class="muted">이 사주에서 가장 먼저 보이는 것</p>
      <h2>${esc(r.signatureStatement)}</h2>
      <ul class="traits">${traits}</ul>
      <div class="els">${fe}</div>
    </section>
    ${r.freeBridge ? `<p class="muted">${esc(r.freeBridge)}</p>` : ""}
    <p>${esc(r.executiveSummary)}</p>
    ${chapters}
    ${
      contradictions
        ? `<section style="margin-top:28px"><p class="muted">CONTRADICTION</p><h2>한 사람 안의 긴장</h2>${contradictions}</section>`
        : ""
    }
    <section style="margin-top:28px">
      <p class="muted">ACTION</p>
      <h2>현실적인 행동 가이드</h2>
      <ul>${actions}</ul>
    </section>
    <section class="final">
      <p class="muted">運의結</p>
      <h2>이 사주를 잘 살아가는 방식</h2>
      <p class="muted">핵심 3</p><ul>${core}</ul>
      <p class="muted">주의 2</p><ul>${cautions}</ul>
      <p class="muted">활용 2</p><ul>${leverage}</ul>
      <p class="closing">${esc(r.finalSummary.closingLine)}</p>
    </section>
  </div>
</body>
</html>`;
}

async function htmlToPdf(htmlPath: string, pdfPath: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");
    await page.goto(fileUrl, { waitUntil: "networkidle" });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
    });
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
      orderNo: "QA-MOCK-6900",
      stem: "money-6900-mock",
    },
    {
      slug: "2026-total",
      name: "종합 사주 리포트",
      orderNo: "QA-MOCK-12900",
      stem: "total-12900-mock",
    },
  ] as const;

  for (const job of jobs) {
    const report = buildMockPaidResult(ctx, job.name, {
      productSlug: job.slug,
    });
    const html = paidToHtml({
      nickname: NICKNAME,
      productName: job.name,
      orderNo: job.orderNo,
      report,
    });
    const htmlPath = path.join(OUT, `${job.stem}.html`);
    const pdfPath = path.join(OUT, `${job.stem}.pdf`);
    fs.writeFileSync(htmlPath, html, "utf8");
    await htmlToPdf(htmlPath, pdfPath);
    console.log("OK", pdfPath);
  }

  console.log("\nOpen:");
  console.log(" ", path.join(OUT, "money-6900-mock.pdf"));
  console.log(" ", path.join(OUT, "total-12900-mock.pdf"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
