/**
 * PHASE P1.1 — Real Paid Product Acceptance (Live Gemini)
 *
 * Usage:
 *   npx tsx --env-file=.env.local --require ./scripts/shim-server-only.cjs scripts/phase-p11-live-acceptance.ts
 *
 * Requires:
 *   GEMINI_API_KEY_FREE (or GEMINI_API_KEY) for FREE
 *   GEMINI_API_KEY_PAID for 6,900 / 12,900 — NO free-key fallback
 *
 * Outputs under tmp/quality-review/ (gitignored via /tmp/)
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { fortuneEngine } from "../src/lib/fortune-engine";
import { ProviderFortuneInterpreter } from "../src/lib/ai/interpreters/provider-interpreter";
import {
  buildPaidProductInstruction,
} from "../src/lib/ai/prompts/build-paid-prompt";
import {
  targetLengthForPaidProduct,
} from "../src/lib/ai/schemas/paid-report";
import { scorePaidReportQuality } from "../src/lib/ai/validators/paid-quality";
import { formatFortuneEvidenceForDisplay } from "../src/lib/presentation/format-evidence-label";
import type { FreeFortuneResult } from "../src/lib/ai/schemas/free-result";
import type { PaidFortuneReport } from "../src/lib/ai/schemas/paid-report";

const OUT = path.join(process.cwd(), "tmp", "quality-review");
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

function ensureOut() {
  fs.mkdirSync(OUT, { recursive: true });
}

function writeJson(name: string, data: unknown) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2), "utf8");
}

function collectText(parts: string[]): string {
  return parts.filter(Boolean).join("\n");
}

function freeBlob(f: FreeFortuneResult): string {
  return collectText([
    f.hookLine,
    f.headline,
    f.summary,
    f.outerVsInner.outer,
    f.outerVsInner.inner,
    f.hiddenSelf.body,
    f.personality.summary,
    ...f.strengths,
    ...f.cautionPatterns,
    f.stressPattern,
    f.currentFlow.summary,
    f.signatureClosing,
  ]);
}

function paidBlob(p: PaidFortuneReport): string {
  return collectText([
    p.title,
    p.signatureStatement,
    p.freeBridge ?? "",
    p.executiveSummary,
    ...p.coreTraits,
    ...p.keywords,
    ...p.sections.flatMap((s) => [
      s.title,
      s.summary,
      s.detail,
      s.whyReading ?? "",
      ...(s.cautions ?? []),
      s.pullQuote ?? "",
    ]),
    ...(p.contradictions ?? []).flatMap((c) => [c.poleA, c.poleB, c.reading]),
    ...p.actionGuide,
    ...p.finalSummary.core,
    ...p.finalSummary.cautions,
    ...p.finalSummary.leverage,
    p.finalSummary.closingLine,
  ]);
}

/** Exact + near-exact overlap via long chunks from free appearing in paid. */
function measureOverlap(freeText: string, paidText: string) {
  const chunks = freeText
    .split(/[.。!?\n]/)
    .map((x) => x.replace(/\s+/g, " ").trim())
    .filter((x) => [...x].length >= 20);
  if (chunks.length === 0) {
    return { freeChunks: 0, hits: 0, overlapPct: 0, newInsightPct: 100 };
  }
  let hits = 0;
  for (const c of chunks) {
    if (paidText.includes(c)) hits += 1;
  }
  const overlapPct = Math.round((hits / chunks.length) * 100);
  return {
    freeChunks: chunks.length,
    hits,
    overlapPct,
    newInsightPct: 100 - overlapPct,
  };
}

function estimateReadingMinutes(charCount: number): number {
  return Math.max(1, Math.round(charCount / 450));
}

function estimatePages(charCount: number, kind: "money" | "total"): number {
  const pages = Math.round(charCount / 850);
  if (kind === "money") return Math.min(12, Math.max(5, pages));
  return Math.min(20, Math.max(10, pages));
}

function paidToHtml(input: {
  nickname: string;
  productName: string;
  orderNo: string;
  report: PaidFortuneReport;
}): string {
  const r = input.report;
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

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
      const max = Math.max(1, ...(r.fiveElementsSnapshot ?? []).map((x) => x.count));
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
  body { margin: 0; font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; color: #0b1c2c; background: #f7f1e6; font-size: 11pt; line-height: 1.65; }
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
    await page.goto("file://" + htmlPath.replace(/\\/g, "/"), {
      waitUntil: "networkidle",
    });
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

async function listProducts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secret) {
    return { ok: false as const, error: "missing supabase env", products: [] };
  }
  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin
    .from("products")
    .select(
      "id, name, slug, short_description, description, sale_price, status, sort_order, prompt_version_id"
    )
    .order("sort_order", { ascending: true });
  if (error) return { ok: false as const, error: error.message, products: [] };
  return { ok: true as const, products: data ?? [] };
}

async function main() {
  ensureOut();
  const report: Record<string, unknown> = {
    phase: "P1.1",
    at: new Date().toISOString(),
    paidKeyPresent: Boolean(process.env.GEMINI_API_KEY_PAID?.trim()),
    freeKeyPresent: Boolean(
      process.env.GEMINI_API_KEY_FREE?.trim() ||
        process.env.GEMINI_API_KEY?.trim()
    ),
  };

  console.log("## PHASE P1.1 Live Acceptance\n");
  console.log(
    `GEMINI_API_KEY_PAID: ${report.paidKeyPresent ? "SET" : "MISSING"}`
  );
  console.log(
    `FREE key: ${report.freeKeyPresent ? "SET" : "MISSING"}`
  );

  const products = await listProducts();
  writeJson("active-products.json", products);
  console.log(
    `\nProducts: ${products.ok ? products.products.length : products.error}`
  );
  if (products.ok) {
    for (const p of products.products) {
      console.log(
        `  [${p.status}] ${p.slug} | ${p.name} | ₩${p.sale_price}`
      );
    }
  }

  const chart = fortuneEngine.calculate(CHART_INPUT);
  writeJson("chart.json", {
    birthDate: CHART_INPUT.birthDate,
    dayMaster: chart.dayMaster,
    fiveElements: chart.fiveElements,
  });

  // --- FREE (live) ---
  let free: FreeFortuneResult | null = null;
  if (!report.freeKeyPresent) {
    console.log("\nFREE: FAIL — no free Gemini key");
    report.free = { gemini: "FAIL", reason: "NO_FREE_KEY" };
  } else {
    console.log("\nGenerating FREE (live gemini)...");
    const freeInterp = new ProviderFortuneInterpreter("gemini", undefined, "free");
    try {
      const out = await freeInterp.generateFree({
        chart,
        promptVersion: {
          ...PROMPT,
          productInstruction: "무료 미리보기 결과를 작성하십시오.",
        },
        presentation: { nickname: NICKNAME },
        product: { slug: "free-default", name: "무료 사주" },
      });
      free = out;
      writeJson("live-free.json", out);
      const chars = [...freeBlob(out)].length;
      report.free = {
        gemini: "PASS",
        provider: out.meta.provider,
        model: out.meta.model,
        usage: out.meta.usage,
        readingMinutes: estimateReadingMinutes(chars),
        hookLine: out.hookLine,
        chars,
      };
      console.log(
        `FREE: PASS model=${out.meta.model} chars≈${chars} ~${report.free.readingMinutes}min`
      );
    } catch (e) {
      report.free = {
        gemini: "FAIL",
        error: e instanceof Error ? e.message : String(e),
      };
      console.log("FREE: FAIL", report.free);
    }
  }

  // --- PAID gate ---
  if (!report.paidKeyPresent) {
    report.money = {
      gemini: "FAIL",
      reason: "GEMINI_API_KEY_PAID missing — live paid forbidden",
    };
    report.total = {
      gemini: "FAIL",
      reason: "GEMINI_API_KEY_PAID missing — live paid forbidden",
    };
    report.gate = "NOT READY";
    report.blocker =
      "Set GEMINI_API_KEY_PAID in .env.local (do not reuse free key silently), then re-run this script.";
    writeJson("acceptance-summary.json", report);
    console.log("\nGATE: NOT READY — GEMINI_API_KEY_PAID missing");
    process.exitCode = 2;
    return;
  }

  const paidInterp = new ProviderFortuneInterpreter("gemini", undefined, "paid");

  async function genPaid(slug: string, name: string, price: number) {
    console.log(`\nGenerating PAID ${name} (₩${price})...`);
    const out = await paidInterp.generatePaid({
      chart,
      product: {
        slug,
        name,
        targetLengthChars: targetLengthForPaidProduct(slug),
      },
      promptVersion: {
        ...PROMPT,
        productInstruction: buildPaidProductInstruction({ slug, name }),
      },
      presentation: { nickname: NICKNAME, maritalStatus: "unmarried" },
    });
    return out;
  }

  // money
  try {
    const money = await genPaid("2026-money", "재물운 집중분석", 6900);
    writeJson("live-money-6900.json", money);
    const quality = scorePaidReportQuality(money, { productSlug: "2026-money" });
    const blob = paidBlob(money);
    const chars = [...blob].length;
    const overlap = free
      ? measureOverlap(freeBlob(free), blob)
      : { overlapPct: null, newInsightPct: null };
    const html = paidToHtml({
      nickname: NICKNAME,
      productName: "재물운 집중분석",
      orderNo: "QA-6900",
      report: money,
    });
    const htmlPath = path.join(OUT, "money-6900.html");
    const pdfPath = path.join(OUT, "money-6900.pdf");
    fs.writeFileSync(htmlPath, html, "utf8");
    await htmlToPdf(htmlPath, pdfPath);
    report.money = {
      gemini: "PASS",
      provider: money.meta.provider,
      model: money.meta.model,
      usage: money.meta.usage,
      chapters: money.sections.length,
      qualityPass: quality.pass,
      qualityScore: quality.score,
      chars,
      readingMinutes: estimateReadingMinutes(chars),
      pagesEst: estimatePages(chars, "money"),
      overlap,
      pdf: "money-6900.pdf",
      signature: money.signatureStatement,
      samplePulls: money.sections.slice(0, 3).map((s) => s.pullQuote ?? s.summary),
    };
    console.log(
      `MONEY: PASS chapters=${money.sections.length} quality=${quality.score} overlap=${overlap.overlapPct}%`
    );
  } catch (e) {
    report.money = {
      gemini: "FAIL",
      error: e instanceof Error ? e.message : String(e),
    };
    console.log("MONEY: FAIL", report.money);
  }

  // total
  try {
    const total = await genPaid("2026-total", "종합 사주 리포트", 12900);
    writeJson("live-total-12900.json", total);
    const quality = scorePaidReportQuality(total, {
      productSlug: "2026-total",
    });
    const blob = paidBlob(total);
    const chars = [...blob].length;
    const overlap = free
      ? measureOverlap(freeBlob(free), blob)
      : { overlapPct: null, newInsightPct: null };
    const html = paidToHtml({
      nickname: NICKNAME,
      productName: "종합 사주 리포트",
      orderNo: "QA-12900",
      report: total,
    });
    const htmlPath = path.join(OUT, "total-12900.html");
    const pdfPath = path.join(OUT, "total-12900.pdf");
    fs.writeFileSync(htmlPath, html, "utf8");
    await htmlToPdf(htmlPath, pdfPath);
    report.total = {
      gemini: "PASS",
      provider: total.meta.provider,
      model: total.meta.model,
      usage: total.meta.usage,
      chapters: total.sections.length,
      qualityPass: quality.pass,
      qualityScore: quality.score,
      chars,
      readingMinutes: estimateReadingMinutes(chars),
      pagesEst: estimatePages(chars, "total"),
      overlap,
      pdf: "total-12900.pdf",
      signature: total.signatureStatement,
      samplePulls: total.sections.slice(0, 3).map((s) => s.pullQuote ?? s.summary),
      hasContradiction: (total.contradictions?.length ?? 0) > 0,
    };
    console.log(
      `TOTAL: PASS chapters=${total.sections.length} quality=${quality.score} overlap=${overlap.overlapPct}%`
    );
  } catch (e) {
    report.total = {
      gemini: "FAIL",
      error: e instanceof Error ? e.message : String(e),
    };
    console.log("TOTAL: FAIL", report.total);
  }

  const moneyOk = (report.money as { gemini?: string })?.gemini === "PASS";
  const totalOk = (report.total as { gemini?: string })?.gemini === "PASS";
  const freeOk = (report.free as { gemini?: string })?.gemini === "PASS";
  report.gate =
    freeOk && moneyOk && totalOk ? "PENDING_HUMAN_SCORE" : "NOT READY";
  writeJson("acceptance-summary.json", report);
  console.log(`\nWrote artifacts to ${OUT}`);
  console.log(`GATE (auto): ${report.gate}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
