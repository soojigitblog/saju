/**
 * PHASE P3.1 — V5.1 human-review corrections mock output.
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-p31-v5-mock.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildMockPaidResult } from "../src/lib/ai/interpreters/mock-content";
import { buildPaidReportPdfHtmlV5 } from "../src/lib/report/paid-report-pdf-v5";
import { KNOWN_PARTICLE_ERRORS } from "../src/lib/report/v5/tokens";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "v5.1");
const NICKNAME = "수지";

async function waitFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(350);
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
    });
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

async function contactSheet(pageFiles: string[], outPath: string, cols = 4) {
  const browser = await chromium.launch({ headless: true });
  try {
    const existing = pageFiles.filter((f) => fs.existsSync(f));
    if (!existing.length) return;
    const page = await browser.newPage({
      viewport: { width: 1600, height: 2200 },
    });
    const cells = existing
      .map((f) => {
        const b64 = fs.readFileSync(f).toString("base64");
        return `<img src="data:image/png;base64,${b64}" style="width:100%;display:block;border:1px solid #ddd"/>`;
      })
      .join("");
    await page.setContent(`<html><body style="margin:0;background:#1a1a1a;padding:12px">
      <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px">${cells}</div>
    </body></html>`);
    await page.screenshot({ path: outPath, fullPage: true });
  } finally {
    await browser.close();
  }
}

function analyzeHtmlHonest(html: string, nickname: string) {
  const chunks = html.split(/<div class="page/);
  const pages: Array<{
    page: number;
    textLen: number;
    isCover: boolean;
    sparseSuspect: boolean;
    sparseVerdict: "PASS" | "WARN" | "HUMAN REVIEW";
  }> = [];
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i] ?? "";
    const text = chunk.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const isCover = /\bcover\b/.test(chunk.split(">")[0] ?? "");
    // Heuristic only — cannot measure true bottom-half whitespace from HTML.
    // < 280 chars on non-cover ≈ sparse; still requires HUMAN visual check.
    const sparseSuspect = !isCover && text.length < 280;
    pages.push({
      page: i,
      textLen: text.length,
      isCover,
      sparseSuspect,
      sparseVerdict: isCover
        ? "PASS"
        : sparseSuspect
          ? "WARN"
          : "HUMAN REVIEW",
    });
  }

  const blob = html.replace(/<[^>]+>/g, " ");
  const languageIssues: string[] = [];
  for (const re of KNOWN_PARTICLE_ERRORS) {
    if (re.test(blob)) languageIssues.push(`particle:${re}`);
  }
  if (/양\s*metal|음\s*metal|yang\s*metal|음\s*wood|양\s*fire/i.test(blob)) {
    languageIssues.push("mixed-language-element");
  }
  if (/PILL\s+ARS|FOUR\s+PILL\s/i.test(blob.replace(/&nbsp;/g, " "))) {
    languageIssues.push("cover-en-split");
  }
  if (blob.includes(`${nickname}님의 나의`)) {
    languageIssues.push("awkward-cover-grammar");
  }
  if (/이 장은[^.]*예언하지 않습니다/.test(blob)) {
    languageIssues.push("customer-meta-prophecy-disclaimer");
  }
  if (/focused\s*report/i.test(blob)) {
    languageIssues.push("customer-meta-focused-report");
  }

  // Earn/spend duplication check for money HTML
  const earnSpendBug =
    /쓸 때의 나[\s\S]{0,400}수입\s*:/.test(html) ||
    /쓸 때의 나[\s\S]{0,400}기준이 보이는 보상/.test(html) &&
      /벌 때의 나[\s\S]{0,400}기준이 보이는 보상/.test(html) &&
      html.includes("money");

  const shareCount = (html.match(/저장해 두고 싶은 한 문장/g) ?? []).length;

  return {
    pageCount: pages.length,
    pages,
    sparseSuspectCount: pages.filter((p) => p.sparseSuspect).length,
    largeEmptyPages: "HUMAN REVIEW — visual PNG bottom-half check required",
    languageIssues,
    earnSpendPossibleBug: Boolean(earnSpendBug),
    sharePhraseCount: shareCount,
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

  const jobs = [
    {
      slug: "2026-money",
      name: "나의 돈 사용설명서",
      stem: "money-6900-v5.1-mock",
      contact: "money-v5.1-contact.jpg",
    },
    {
      slug: "2026-career",
      name: "나의 일 사용설명서",
      stem: "career-6900-v5.1-mock",
      contact: "career-v5.1-contact.jpg",
    },
    {
      slug: "2026-love",
      name: "나의 연애 사용설명서",
      stem: "love-6900-v5.1-mock",
      contact: "love-v5.1-contact.jpg",
    },
    {
      slug: "2026-total",
      name: "나의 사주 사용설명서",
      stem: "total-12900-v5.1-mock",
      contact: "total-v5.1-contact.jpg",
    },
  ];

  const summary: Record<string, unknown> = {};

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
    });
    const htmlPath = path.join(OUT, `${job.stem}.html`);
    const pdfPath = path.join(OUT, `${job.stem}.pdf`);
    fs.writeFileSync(htmlPath, html, "utf8");
    await htmlToPdf(htmlPath, pdfPath);
    console.log("PDF", job.stem);

    const shots = await captureAllPages(htmlPath, job.stem.replace("-mock", ""));
    await contactSheet(shots, path.join(OUT, job.contact), job.slug.includes("total") ? 4 : 3);
    console.log("CONTACT", job.contact);

    const analysis = analyzeHtmlHonest(html, NICKNAME);
    // Money earn/spend specific assert
    if (job.slug.includes("money")) {
      const hasEarn = /벌 때의 나[\s\S]*?기준이 보이는 보상|수입/.test(html);
      const spendHasEarnLine =
        /쓸 때의 나[\s\S]{0,500}기준이 보이는 보상 구조에서는 힘을/.test(html);
      analysis.earnSpendPossibleBug = spendHasEarnLine;
      (analysis as { earnSpendCheck: string }).earnSpendCheck = spendHasEarnLine
        ? "FAIL — spend column still has earn copy"
        : "PASS — spend column distinct";
      void hasEarn;
    }

    summary[job.stem] = analysis;
  }

  fs.writeFileSync(
    path.join(OUT, "v5.1-qa-summary.json"),
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
