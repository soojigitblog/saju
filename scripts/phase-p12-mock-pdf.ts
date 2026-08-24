/**
 * P1.2 mock PDF V2 — denser editorial HTML (no Gemini).
 *   npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-p12-mock-pdf.ts
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
  coverSubtitle: string;
}): string {
  const r = input.report;
  const profile = (r.profileDashboard ?? [])
    .map(
      (p) =>
        `<div class="row"><span>${esc(p.label)}</span><span>${esc(p.value)}</span></div>`
    )
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

  const chapters = r.sections
    .map((s, i) => {
      const n = String(i + 1).padStart(2, "0");
      const scenes = (s.behaviorScenes ?? [])
        .map((sc) => `<li class="scene">${esc(sc)}</li>`)
        .join("");
      const why = (s.evidenceExplanation ?? [])
        .map((w) => `<p>${esc(w)}</p>`)
        .join("");
      const evidence = formatFortuneEvidenceForDisplay(s.evidence).join(" · ");
      const sides =
        s.strengthSide || s.riskSide
          ? `<div class="sides">${
              s.strengthSide
                ? `<div><b>강점</b><p>${esc(s.strengthSide)}</p></div>`
                : ""
            }${
              s.riskSide
                ? `<div><b>주의</b><p>${esc(s.riskSide)}</p></div>`
                : ""
            }</div>`
          : "";
      return `<section class="chapter">
        <p class="muted">${n}</p>
        <h2>${esc(s.title)}</h2>
        ${s.question ? `<p class="q">Q. ${esc(s.question)}</p>` : ""}
        ${s.pullQuote ? `<blockquote>${esc(s.pullQuote)}</blockquote>` : ""}
        <p class="lead">${esc(s.coreInsight)}</p>
        <ul>${scenes}</ul>
        ${sides}
        <div class="why"><p class="why-label">WHY</p>${why}<p class="evidence">Evidence · ${esc(evidence)}</p></div>
        ${s.takeaway ? `<p class="take">→ ${esc(s.takeaway)}</p>` : ""}
      </section>`;
    })
    .join("\n");

  const contradictions = (r.contradictions ?? [])
    .map(
      (c) => `<article class="card">
      <p class="gold">${esc(c.poleA)} × ${esc(c.poleB)}</p>
      <p>${esc(c.howItShows)}</p>
      <div class="tri"><div><b>장점</b><p>${esc(c.upside)}</p></div><div><b>문제</b><p>${esc(c.downside)}</p></div><div><b>언제</b><p>${esc(c.whenStronger)}</p></div></div>
    </article>`
    )
    .join("");

  const shadows = (r.strengthShadows ?? [])
    .map(
      (s) =>
        `<div class="shadow"><p class="gold">${esc(s.strength)}</p><p>↓ ${esc(s.overuse)}</p><p>→ ${esc(s.problem)}</p></div>`
    )
    .join("");

  const actions = r.actionItems
    .map(
      (a) =>
        `<li><span class="muted">${esc(a.domain)}</span><b>${esc(a.what)}</b><br/>왜: ${esc(a.why)} / 어떻게: ${esc(a.how)}</li>`
    )
    .join("");

  const fs_ = r.finalSummary;
  const list = (xs: string[]) => xs.map((x) => `<li>${esc(x)}</li>`).join("");

  const blueprint = r.blueprint
    ? `<section class="bp"><p class="muted">사주 설계도</p><p class="gold">${esc(r.blueprint.dayMasterTerm)}</p><p>${esc(r.blueprint.dayMasterPlain)}</p><p class="muted">${esc(r.blueprint.fiveElementsNote)}</p><p class="muted">${esc(r.blueprint.tenGodsNote)}</p><p>${esc(r.blueprint.structurePlain)}</p><p>${esc(r.blueprint.lifePlain)}</p></section>`
    : "";

  const life = (r.lifeScenes ?? [])
    .map((s) => `<li>${esc(s)}</li>`)
    .join("");

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/>
<title>${esc(input.productName)}</title>
<style>
@page{size:A4;margin:14mm 12mm}
*{box-sizing:border-box}
body{margin:0;font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;color:#0b1c2c;background:#f7f1e6;font-size:10.5pt;line-height:1.55}
.cover{page-break-after:always;background:#06101c;color:#f3ebdd;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:36px}
.brand{letter-spacing:.35em;color:#c9a227;font-size:11px}
.cover h1{font-size:26px;margin:18px 0 10px;line-height:1.35}
.meta{color:#b8b0a0;font-size:11px}
.body{padding:4px 2px 28px}
.sig{border:1px solid rgba(201,162,39,.45);padding:16px;margin-bottom:14px;background:#fffdf8}
.row{display:grid;grid-template-columns:7.2rem 1fr;gap:6px;border-bottom:1px solid #e6ddcf;padding:6px 0;font-size:10pt}
.els{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px;text-align:center}
.bar-wrap{height:48px;background:rgba(201,162,39,.1);display:flex;align-items:flex-end;padding:2px}
.bar{width:100%;background:#c9a227}
.chapter{border-top:1px solid #ddd4c4;padding-top:12px;margin-top:14px;break-inside:avoid}
h2{font-size:14px;margin:0 0 4px;color:#06101c}
.q{color:#8a7020;font-size:9.5pt;margin:2px 0 6px}
.lead{font-weight:600;margin:4px 0}
.scene{background:rgba(201,162,39,.06);padding:6px 8px;margin:4px 0;list-style:none}
.sides{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0;font-size:9.5pt}
.why{border:1px solid rgba(201,162,39,.35);background:rgba(201,162,39,.07);padding:8px 10px;margin-top:8px}
.why-label{color:#8a7020;font-size:9px;letter-spacing:.12em;margin:0 0 4px}
.evidence,.muted{color:#6b6458;font-size:9px}
.gold{color:#8a7020}
.take{color:#8a7020;margin-top:6px}
.card,.shadow,.bp{border:1px solid #ddd4c4;padding:10px;margin:8px 0;background:#fffdf8}
.tri{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:9pt;margin-top:6px}
.final{border:1px solid rgba(201,162,39,.45);padding:14px;background:#fffdf8;margin-top:16px}
blockquote{border-left:3px solid #c9a227;margin:6px 0;padding-left:8px;color:#8a7020;font-style:italic}
ul{padding-left:0;margin:6px 0}
</style></head><body>
<header class="cover"><p class="brand">運의結</p><h1>${esc(input.nickname)}님의<br/>${esc(input.coverSubtitle)}</h1><p class="meta">${esc(input.productName)}</p><p class="meta" style="margin-top:22px;letter-spacing:.25em">四柱 · 命式</p><p class="meta" style="margin-top:8px">주문번호 ${esc(input.orderNo)}</p></header>
<div class="body">
<section class="sig"><p class="muted">${r.reportKind === "money" ? "MONEY PROFILE" : "CORE PROFILE"}</p><h2>${esc(r.signatureStatement)}</h2>${profile}<div class="els">${fe}</div></section>
${blueprint}
${r.freeBridge ? `<p class="muted">${esc(r.freeBridge)}</p>` : ""}
<p>${esc(r.executiveSummary)}</p>
${life ? `<section><p class="muted">LIFE SCENES</p><ul>${life}</ul></section>` : ""}
${chapters}
${contradictions ? `<section><p class="muted">CONTRADICTION MAP</p>${contradictions}</section>` : ""}
${shadows ? `<section><p class="muted">STRENGTH → SHADOW</p>${shadows}</section>` : ""}
<section><p class="muted">ACTION</p><ul>${actions}</ul></section>
<section class="final"><p class="muted">運의結 결론</p>
<p class="muted">강점</p><ul>${list(fs_.strengths)}</ul>
<p class="muted">주의</p><ul>${list(fs_.cautions)}</ul>
${fs_.changeHabits ? `<p class="muted">바꿀 습관</p><ul>${list(fs_.changeHabits)}</ul>` : ""}
${fs_.keepHabits ? `<p class="muted">유지할 방식</p><ul>${list(fs_.keepHabits)}</ul>` : ""}
<p class="gold" style="margin-top:10px;font-size:12pt">${esc(fs_.closingLine)}</p>
</section>
</div></body></html>`;
}

async function htmlToPdf(htmlPath: string, pdfPath: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), {
      waitUntil: "networkidle",
    });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
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
      orderNo: "QA-V2-6900",
      stem: "money-6900-v2-mock",
      cover: "재물 사주 리포트",
    },
    {
      slug: "2026-total",
      name: "종합 사주 리포트",
      orderNo: "QA-V2-12900",
      stem: "total-12900-v2-mock",
      cover: "사주 사용설명서",
    },
  ] as const;

  for (const job of jobs) {
    const report = buildMockPaidResult(ctx, job.name, {
      productSlug: job.slug,
    });
    const html = paidToHtml({
      nickname: "수지",
      productName: job.name,
      orderNo: job.orderNo,
      report,
      coverSubtitle: job.cover,
    });
    const htmlPath = path.join(OUT, `${job.stem}.html`);
    const pdfPath = path.join(OUT, `${job.stem}.pdf`);
    fs.writeFileSync(htmlPath, html, "utf8");
    fs.writeFileSync(
      path.join(OUT, `${job.stem}.json`),
      JSON.stringify(report, null, 2),
      "utf8"
    );
    await htmlToPdf(htmlPath, pdfPath);
    console.log("OK", pdfPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
