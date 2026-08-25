/**
 * PHASE P3.2 — Final human candidate mock PDFs.
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-p32-final-mock.ts
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium, type Page } from "playwright";
import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildInterpretationContextV2 } from "../src/lib/ai/interpretation-context-v2";
import { buildMockPaidResult } from "../src/lib/ai/interpreters/mock-content";
import { buildPaidReportPdfHtmlV5 } from "../src/lib/report/paid-report-pdf-v5";
import { KNOWN_PARTICLE_ERRORS } from "../src/lib/report/v5/tokens";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "final");
const NICKNAME = "수지";

async function waitFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(600);
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
    const fontLog: string[] = [];
    page.on("console", (msg) => {
      if (/font|type 3|glyph/i.test(msg.text())) fontLog.push(msg.text());
    });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
      preferCSSPageSize: true,
    });
    return fontLog;
  } finally {
    await browser.close();
  }
}

async function captureAllPages(htmlPath: string, prefix: string) {
  const browser = await chromium.launch({ headless: true });
  const files: string[] = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 794, height: 1123 },
    });
    await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), {
      waitUntil: "networkidle",
      timeout: 120_000,
    });
    await waitFonts(page);
    const pages = page.locator(".page");
    const count = await pages.count();
    for (let i = 0; i < count; i++) {
      const file = `${prefix}-p${String(i + 1).padStart(2, "0")}.png`;
      await pages.nth(i).screenshot({ path: path.join(OUT, file) });
      files.push(path.join(OUT, file));
    }
  } finally {
    await browser.close();
  }
  return files;
}

async function contactSheet(pageFiles: string[], outPath: string, cols = 3) {
  const browser = await chromium.launch({ headless: true });
  try {
    const existing = pageFiles.filter((f) => fs.existsSync(f));
    if (!existing.length) return;
    const page = await browser.newPage({
      viewport: { width: 1400, height: 2000 },
    });
    const cells = existing
      .map((f) => {
        const b64 = fs.readFileSync(f).toString("base64");
        return `<img src="data:image/png;base64,${b64}" style="width:100%;display:block;border:1px solid #333"/>`;
      })
      .join("");
    await page.setContent(`<html><body style="margin:0;background:#111;padding:10px">
      <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px">${cells}</div>
    </body></html>`);
    await page.screenshot({ path: outPath, fullPage: true });
  } finally {
    await browser.close();
  }
}

function auditPdfFonts(pdfPath: string): {
  available: boolean;
  raw?: string;
  hasMalgun?: boolean;
  hasType3?: boolean;
  type3Count?: number;
  fonts?: string[];
  notoEmbedded?: boolean;
  source: "pdffonts" | "binary-scan";
  note: string;
  gateHint: "READY" | "WARNING" | "FAIL";
} {
  try {
    const raw = execFileSync("pdffonts", [pdfPath], {
      encoding: "utf8",
      timeout: 15_000,
    });
    const hasMalgun = /Malgun|맑은/i.test(raw);
    const hasType3 = /Type\s*3|Type3/i.test(raw);
    return {
      available: true,
      raw,
      hasMalgun,
      hasType3,
      source: "pdffonts",
      note: "pdffonts audit",
      gateHint: hasMalgun || hasType3 ? "WARNING" : "READY",
    };
  } catch {
    const buf = fs.readFileSync(pdfPath);
    const text = buf.toString("latin1");
    const fontNames = [
      ...text.matchAll(/\/FontName\s*\/([^\s\/]+)/g),
    ].map((m) => m[1]!);
    const unique = [...new Set(fontNames)];
    const type3Count = (text.match(/\/Subtype\s*\/Type3\b/g) ?? []).length;
    const hasType3 = type3Count > 0;
    const hasMalgun = /Malgun|맑은/i.test(text);
    const notoEmbedded = unique.some((n) => /Noto(Sans|Serif)KR/i.test(n));
    return {
      available: true,
      fonts: unique,
      type3Count,
      hasMalgun,
      hasType3,
      notoEmbedded,
      source: "binary-scan",
      note: hasType3
        ? `Chromium PDF still contains ${type3Count} Type3 subtypes despite local Noto OTF FontName embed — TECHNICAL WARNING (no false PASS)`
        : "Local Noto OTF FontName embedded; no Type3/Malgun detected",
      gateHint: hasMalgun ? "FAIL" : hasType3 ? "WARNING" : "READY",
    };
  }
}

function analyzeHtml(html: string, nickname: string) {
  const pageCount = (html.match(/class="page /g) ?? []).length;
  const blob = html.replace(/<[^>]+>/g, " ");
  const languageIssues: string[] = [];
  for (const re of KNOWN_PARTICLE_ERRORS) {
    if (re.test(blob)) languageIssues.push(`particle:${re}`);
  }
  if (/양\s*metal|음\s*metal/i.test(blob)) languageIssues.push("mixed-language");
  if (/단일 성격 문장이 아니라|같은 단어로 덮지 않고/.test(blob)) {
    languageIssues.push("saju-map-meta-copy");
  }
  if (/이 장은[^.]*예언하지/.test(blob)) languageIssues.push("customer-meta");
  if (blob.includes(`${nickname}님의 나의`)) languageIssues.push("cover-grammar");

  const shareLabels = (html.match(/저장해 두고 싶은 한 문장/g) ?? []).length;
  const pullQuotes = (html.match(/class="pull /g) ?? []).length;

  // Stress share bug: relationship line on stress page
  const stressBug =
    /스트레스[\s\S]{0,1200}처음의 나와 가까워진 뒤의 내가/.test(html);

  // Semantic dup rough: same 20-char phrase appears 3+ times
  const phrases = blob.match(/[가-힣]{12,28}/g) ?? [];
  const counts = new Map<string, number>();
  for (const p of phrases) counts.set(p, (counts.get(p) ?? 0) + 1);
  const heavyDupes = [...counts.entries()]
    .filter(([, n]) => n >= 3)
    .map(([p]) => p)
    .slice(0, 5);

  return {
    pageCount,
    languageIssues,
    shareLabels,
    pullQuotes,
    stressShareBug: stressBug,
    heavySemanticDupes: heavyDupes,
    pageOccupancy: "HUMAN REVIEW — check PNG bottom-half occupancy 55–80%",
    layouts: [...new Set([...html.matchAll(/data-layout="([^"]+)"/g)].map((m) => m[1]))],
  };
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
    { slug: "2026-money", name: "나의 돈 사용설명서", stem: "money-6900-final-mock" },
    { slug: "2026-career", name: "나의 일 사용설명서", stem: "career-6900-final-mock" },
    { slug: "2026-love", name: "나의 연애 사용설명서", stem: "love-6900-final-mock" },
    { slug: "2026-total", name: "나의 사주 사용설명서", stem: "total-12900-final-mock" },
  ];

  const summary: Record<string, unknown> = {};
  const fontWarnings: string[] = [];

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
    const consoleFonts = await htmlToPdf(htmlPath, pdfPath);
    console.log("PDF", job.stem);
    if (consoleFonts.length) fontWarnings.push(...consoleFonts.map((x) => `${job.stem}: ${x}`));

    const shots = await captureAllPages(
      htmlPath,
      job.stem.replace("-final-mock", "")
    );
    const contactName = job.stem.replace("-final-mock", "-final-contact.jpg");
    await contactSheet(
      shots,
      path.join(OUT, contactName),
      job.slug.includes("total") ? 4 : 3
    );
    console.log("CONTACT", contactName);

    const fonts = auditPdfFonts(pdfPath);
    summary[job.stem] = {
      ...analyzeHtml(html, NICKNAME),
      fonts,
    };
  }

  summary.fontConsoleWarnings = fontWarnings;
  summary.technicalNote =
    "Static Noto KR OTF (Regular/Bold) via local @font-face. Malgun removed from stack. Chromium may still emit Type3 glyph ops — report WARNING, never false Font PASS.";

  const gates = Object.values(summary)
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null && "fonts" in v)
    .map((v) => (v.fonts as { gateHint?: string }).gateHint);
  summary.technicalGate = gates.includes("FAIL")
    ? "FAIL"
    : gates.includes("WARNING")
      ? "WARNING"
      : "READY";
  summary.humanGate = "WAITING_FOR_USER";
  summary.premiumLaunch = "NOT READY";
  summary.status = "FINAL HUMAN CANDIDATE";

  fs.writeFileSync(
    path.join(OUT, "final-qa-summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );
  console.log("DONE", OUT);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
