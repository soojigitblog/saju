/**
 * One-off printable reports for 정수지 (no Next server-only imports).
 * npx tsx scripts/generate-suji-reports.ts
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildMockPaidResult } from "../src/lib/ai/interpreters/mock-content";
import { mockProducts } from "../src/lib/mock-data";

const OUT = join(process.cwd(), "tmp", "reports-jeong-suji-19930126");
const products = mockProducts.filter((p) => p.productType !== "tarot");

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toHtml(input: {
  nickname: string;
  productName: string;
  report: ReturnType<typeof buildMockPaidResult>;
}): string {
  const body = input.report;
  const sections = body.sections
    .map(
      (s, i) => `
    <section class="chapter">
      <p class="num">${String(i + 1).padStart(2, "0")}</p>
      <h2>${escapeHtml(s.title)}</h2>
      <p class="sum">${escapeHtml(s.summary)}</p>
      <p class="body">${escapeHtml(s.detail)}</p>
      ${
        s.evidence?.length
          ? `<p class="ev">근거: ${s.evidence.map(escapeHtml).join(" · ")}</p>`
          : ""
      }
    </section>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(input.productName)} — ${escapeHtml(input.nickname)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; color: #1a1a1a; line-height: 1.65; max-width: 720px; margin: 0 auto; padding: 24px; }
  .badge { font-size: 11px; letter-spacing: .2em; color: #8a6a2f; }
  h1 { font-size: 28px; margin: 8px 0 4px; }
  .meta { color: #666; font-size: 13px; }
  .headline { font-size: 20px; margin-top: 28px; }
  .summary { color: #333; }
  .keywords span { display: inline-block; border: 1px solid #c9b07a; padding: 2px 10px; margin: 4px 4px 0 0; font-size: 12px; }
  .chapter { border-top: 1px solid #e5e0d6; padding-top: 18px; margin-top: 22px; page-break-inside: avoid; }
  .num { font-size: 11px; color: #999; letter-spacing: .15em; }
  h2 { font-size: 18px; margin: 4px 0; }
  .sum { font-weight: 600; }
  .ev, .disclaimer { font-size: 12px; color: #777; }
  .actions { margin-top: 20px; }
  .actions li { margin: 4px 0; }
  .foot { margin-top: 36px; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 12px; }
</style>
</head>
<body>
  <p class="badge">運의結 · PAID REPORT</p>
  <h1>${escapeHtml(input.nickname)}님</h1>
  <p class="meta">${escapeHtml(input.productName)} · mock / mock-paid</p>
  <p class="meta">생년월일 1993-01-26 양력 · 출생시각 19:31 (술시) · 여성</p>
  <h2 class="headline">${escapeHtml(body.title)}</h2>
  <p class="summary">${escapeHtml(body.executiveSummary)}</p>
  <p class="keywords">${body.keywords.map((k) => `<span>${escapeHtml(k)}</span>`).join("")}</p>
  ${sections}
  ${
    body.monthlyOutlook?.length
      ? `<section class="chapter"><p class="badge">월별 운세</p><h2>1월 ~ 12월</h2>${body.monthlyOutlook
          .map(
            (m) => `<article style="margin:14px 0;padding:12px 0;border-top:1px solid #eee">
        <p class="num">${m.month}월</p>
        <h2 style="font-size:16px">${escapeHtml(m.title)}</h2>
        <p class="sum">${escapeHtml(m.summary)}</p>
        <p class="body">${escapeHtml(m.detail)}</p>
      </article>`
          )
          .join("")}</section>`
      : ""
  }
  ${
    body.actionGuide?.length
      ? `<div class="actions"><p class="badge">행동 가이드</p><ul>${body.actionGuide
          .map((a) => `<li>${escapeHtml(a)}</li>`)
          .join("")}</ul></div>`
      : ""
  }
  <p class="disclaimer">${escapeHtml(body.disclaimer)}</p>
  <p class="foot">결제 후 웹 리포트와 동일 스키마(Mock AI). 서비스 내 PDF 다운로드는 아직 Mock 버튼만 있습니다.</p>
</body>
</html>`;
}

function tryPrintPdf(htmlPath: string, pdfPath: string): boolean {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const bin of candidates) {
    if (!existsSync(bin)) continue;
    const r = spawnSync(
      bin,
      [
        "--headless=new",
        "--disable-gpu",
        `--print-to-pdf=${pdfPath}`,
        "--no-pdf-header-footer",
        pathToFileURL(htmlPath).href,
      ],
      { encoding: "utf8", timeout: 90_000 }
    );
    if (r.status === 0 && existsSync(pdfPath)) return true;
  }
  return false;
}

function main() {
  mkdirSync(OUT, { recursive: true });

  const chart = fortuneEngine.calculate({
    gender: "female",
    calendarType: "solar",
    birthDate: "1993-01-26",
    birthTime: "19:31",
    birthTimeUnknown: false,
    timezone: "Asia/Seoul",
    countryCode: "KR",
  });
  const ctx = buildFortuneAiContext(chart);
  console.log(
    `dayMaster=${ctx.dayMaster.stem}${ctx.dayMaster.branch} Y${chart.pillars.year.stem}${chart.pillars.year.branch} M${chart.pillars.month.stem}${chart.pillars.month.branch} D${chart.pillars.day.stem}${chart.pillars.day.branch} H${chart.pillars.hour?.stem ?? "?"}${chart.pillars.hour?.branch ?? "?"}`
  );

  const indexRows: string[] = [];
  for (const product of products) {
    const report = buildMockPaidResult(ctx, product.name, {
      productSlug: product.slug,
    });
    const base = `jeong-suji-${product.slug}`;
    const htmlPath = join(OUT, `${base}.html`);
    const pdfPath = join(OUT, `${base}.pdf`);
    writeFileSync(
      htmlPath,
      toHtml({
        nickname: "정수지",
        productName: product.name,
        report,
      }),
      "utf8"
    );
    const pdfOk = tryPrintPdf(htmlPath, pdfPath);
    console.log(`${product.slug}: html${pdfOk ? "+pdf" : " only"}`);
    indexRows.push(
      `<li><a href="./${base}.html">${product.name}</a>${
        pdfOk ? ` · <a href="./${base}.pdf">PDF</a>` : ""
      }</li>`
    );
  }

  writeFileSync(
    join(OUT, "index.html"),
    `<!DOCTYPE html><html lang="ko"><meta charset="utf-8"/><title>정수지 리포트</title>
<body style="font-family:sans-serif;padding:24px">
<h1>정수지 · 1993-01-26 양력 19:31</h1>
<ul>${indexRows.join("\n")}</ul>
</body></html>`,
    "utf8"
  );
  console.log(`OUT=${OUT}`);
}

main();
