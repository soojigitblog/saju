/**
 * PHASE P3 — Generate V5 mock PDFs, screenshots, contact sheets, share cards.
 *
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-p3-v5-mock.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildInterpretationContextV2 } from "../src/lib/ai/interpretation-context-v2";
import { buildMockPaidResult } from "../src/lib/ai/interpreters/mock-content";
import { buildMockPaidCrossReading } from "../src/lib/ai/interpreters/mock-paid-cross";
import { buildPaidReportPdfHtmlV5 } from "../src/lib/report/paid-report-pdf-v5";
import { buildPaidTarotHtmlV5 } from "../src/lib/report/paid-tarot-html-v5";
import { buildShareCardForDomain } from "../src/lib/report/insight-share-card-html-v5";
import { assertInsightCardPrivacy } from "../src/lib/product/share-insight-card";
import { KNOWN_PARTICLE_ERRORS } from "../src/lib/report/v5/tokens";
import {
  buildTarotAiContext,
  resolveDrawsFromSlots,
  shuffleDeck,
} from "../src/lib/tarot/engine/draw";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "v5");
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
    });
  } finally {
    await browser.close();
  }
}

async function captureShots(
  htmlPath: string,
  shots: { id: string; file: string }[],
  outDir: string
) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 794, height: 1123 },
    });
    await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), {
      waitUntil: "networkidle",
      timeout: 120_000,
    });
    await waitFonts(page);
    for (const s of shots) {
      const el = page.locator(`[data-shot="${s.id}"]`).first();
      if ((await el.count()) === 0) {
        console.warn("missing shot", s.id);
        continue;
      }
      await el.screenshot({ path: path.join(outDir, s.file) });
      console.log("PNG", s.file);
    }
  } finally {
    await browser.close();
  }
}

async function captureSharePng(htmlPath: string, pngPath: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1080, height: 1350 },
    });
    await page.goto("file:///" + htmlPath.replace(/\\/g, "/"), {
      waitUntil: "networkidle",
      timeout: 120_000,
    });
    await waitFonts(page);
    await page.locator("[data-shot=share]").screenshot({ path: pngPath });
  } finally {
    await browser.close();
  }
}

async function contactSheet(
  pageFiles: string[],
  outPath: string,
  cols = 4
) {
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
    console.log("CONTACT", path.basename(outPath));
  } finally {
    await browser.close();
  }
}

function languageQa(blob: string, nickname: string) {
  const issues: string[] = [];
  for (const re of KNOWN_PARTICLE_ERRORS) {
    if (re.test(blob)) issues.push(`particle:${re}`);
  }
  // dayMaster hangul + 님 confusion (庚 hangul is 경)
  if (/[갑을병정무기경신임계]님/.test(blob)) {
    issues.push("dayMaster-as-name");
  }
  if (blob.includes(`${nickname}님의 나의`)) {
    issues.push("awkward-cover-grammar");
  }
  return issues;
}

function densityReport(html: string) {
  const pages = html.split('class="page').length - 1;
  const layouts = Array.from(html.matchAll(/data-layout="([^"]+)"/g)).map(
    (m) => m[1]
  );
  const uniqueLayouts = [...new Set(layouts)];
  // rough content coverage proxy: chars per non-cover page
  const pageChunks = html.split(/<div class="page/);
  const emptyFlags: boolean[] = [];
  for (let i = 1; i < pageChunks.length; i++) {
    const chunk = pageChunks[i] ?? "";
    const text = chunk.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const isCover = chunk.includes("cover");
    emptyFlags.push(!isCover && text.length < 120);
  }
  return {
    pages,
    layouts: uniqueLayouts,
    layoutCount: uniqueLayouts.length,
    blankish: emptyFlags.filter(Boolean).length,
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
    {
      slug: "2026-money",
      name: "나의 돈 사용설명서",
      stem: "money-6900-v5-mock",
      shots: [
        { id: "cover", file: "money-cover.png" },
        { id: "profile", file: "money-profile.png" },
        { id: "earn-spend", file: "money-earn-spend.png" },
        { id: "blindspot", file: "money-blindspot.png" },
        { id: "playbook", file: "money-playbook.png" },
        { id: "final", file: "money-final.png" },
      ],
      domain: "돈" as const,
    },
    {
      slug: "2026-career",
      name: "나의 일 사용설명서",
      stem: "career-6900-v5-mock",
      shots: [
        { id: "cover", file: "career-cover.png" },
        { id: "work-profile", file: "career-work-profile.png" },
        { id: "environment", file: "career-environment.png" },
        { id: "lifecycle", file: "career-lifecycle.png" },
        { id: "shadow", file: "career-shadow.png" },
        { id: "playbook", file: "career-playbook.png" },
        { id: "final", file: "career-final.png" },
      ],
      domain: "일" as const,
    },
    {
      slug: "2026-love",
      name: "나의 연애 사용설명서",
      stem: "love-6900-v5-mock",
      shots: [
        { id: "cover", file: "love-cover.png" },
        { id: "love-profile", file: "love-love-profile.png" },
        { id: "before-after", file: "love-before-after.png" },
        { id: "lifecycle", file: "love-lifecycle.png" },
        { id: "contradiction", file: "love-contradiction.png" },
        { id: "playbook", file: "love-playbook.png" },
        { id: "final", file: "love-final.png" },
      ],
      domain: "관계" as const,
    },
    {
      slug: "2026-total",
      name: "나의 사주 사용설명서",
      stem: "total-12900-v5-mock",
      shots: [
        { id: "cover", file: "total-cover.png" },
        { id: "core-profile", file: "total-core-profile.png" },
        { id: "saju-map", file: "total-saju-map.png" },
        { id: "decision", file: "total-decision.png" },
        { id: "relationship", file: "total-relationship.png" },
        { id: "work", file: "total-work.png" },
        { id: "money", file: "total-money.png" },
        { id: "love", file: "total-love.png" },
        { id: "stress", file: "total-stress.png" },
        { id: "contradiction", file: "total-contradiction.png" },
        { id: "strength-shadow", file: "total-strength-shadow.png" },
        { id: "playbook", file: "total-playbook.png" },
        { id: "final", file: "total-final.png" },
      ],
      domain: "종합" as const,
    },
  ];

  const reportSummary: Record<string, unknown> = {};

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
    await captureShots(htmlPath, job.shots, OUT);

    const dens = densityReport(html);
    const lang = languageQa(html.replace(/<[^>]+>/g, " "), NICKNAME);
    reportSummary[job.stem] = {
      ...dens,
      languageIssues: lang,
      shareableCount: report.shareableInsights?.length ?? 0,
    };

    const insight =
      report.shareableInsights?.[0] ?? report.signatureStatement.slice(0, 80);
    const { card, html: shareHtml } = buildShareCardForDomain({
      domainLabel: job.domain,
      insightLine: insight,
      contextLine: "운의결 사용설명서",
    });
    const privacy = assertInsightCardPrivacy(card);
    const shareHtmlPath = path.join(OUT, `share-${job.domain === "돈" ? "money" : job.domain === "일" ? "career" : job.domain === "관계" ? "love" : "total"}-v5.html`);
    const sharePng = shareHtmlPath.replace(/\.html$/, ".png").replace("share-", "share-").replace("-v5.html", "").replace(/share-(money|career|love|total)/, "share-$1-v5.png");
    // fix naming
    const shareKey =
      job.domain === "돈"
        ? "money"
        : job.domain === "일"
          ? "career"
          : job.domain === "관계"
            ? "love"
            : "total";
    const shareHtmlFile = path.join(OUT, `share-${shareKey}-v5.html`);
    const sharePngFile = path.join(OUT, `share-${shareKey}-v5.png`);
    fs.writeFileSync(shareHtmlFile, shareHtml, "utf8");
    await captureSharePng(shareHtmlFile, sharePngFile);
    console.log("SHARE", `share-${shareKey}-v5.png`, privacy);

    await contactSheet(
      job.shots.map((s) => path.join(OUT, s.file)),
      path.join(OUT, `${shareKey}-v5-contact.jpg`),
      shareKey === "total" ? 4 : 3
    );

    void sharePng;
    void shareHtmlPath;
  }

  // Paid Tarot
  const draws = resolveDrawsFromSlots(shuffleDeck(), [0, 1, 2]);
  const tarotCtx = buildTarotAiContext({
    questionCategory: "career",
    questionText: "회사 옮길까?",
    draws,
  });
  const paidCross = buildMockPaidCrossReading(ctx, v2, tarotCtx);
  const tarotHtml = buildPaidTarotHtmlV5({
    nickname: NICKNAME,
    productName: "사주×타로 심층 교차리딩",
    reading: paidCross,
  });
  const tarotHtmlPath = path.join(OUT, "paid-tarot-4900-v5-mock.html");
  fs.writeFileSync(tarotHtmlPath, tarotHtml, "utf8");
  await captureShots(
    tarotHtmlPath,
    [
      { id: "hero", file: "tarot-hero.png" },
      { id: "cards", file: "tarot-cards.png" },
      { id: "cross-connection", file: "tarot-cross-connection.png" },
      { id: "hidden-tension", file: "tarot-hidden-tension.png" },
      { id: "action", file: "tarot-action.png" },
      { id: "final", file: "tarot-final.png" },
    ],
    OUT
  );
  reportSummary["paid-tarot"] = {
    ...densityReport(tarotHtml),
    languageIssues: languageQa(tarotHtml.replace(/<[^>]+>/g, " "), NICKNAME),
  };

  const { card: tarotCard, html: tarotShareHtml } = buildShareCardForDomain({
    domainLabel: "교차",
    insightLine: paidCross.shareableInsight[0] ?? paidCross.closingInsight,
    contextLine: "사주×타로 심층 교차리딩",
  });
  fs.writeFileSync(path.join(OUT, "share-tarot-v5.html"), tarotShareHtml, "utf8");
  await captureSharePng(
    path.join(OUT, "share-tarot-v5.html"),
    path.join(OUT, "share-tarot-v5.png")
  );
  console.log("SHARE share-tarot-v5.png", assertInsightCardPrivacy(tarotCard));

  await contactSheet(
    [
      "tarot-hero.png",
      "tarot-cards.png",
      "tarot-cross-connection.png",
      "tarot-hidden-tension.png",
      "tarot-action.png",
      "tarot-final.png",
    ].map((f) => path.join(OUT, f)),
    path.join(OUT, "tarot-v5-contact.jpg"),
    3
  );

  // Mobile-scale spot check (money cover + profile)
  {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
      });
      const moneyHtml = path.join(OUT, "money-6900-v5-mock.html");
      await page.goto("file:///" + moneyHtml.replace(/\\/g, "/"), {
        waitUntil: "networkidle",
      });
      await waitFonts(page);
      await page.locator('[data-shot="cover"]').first().screenshot({
        path: path.join(OUT, "money-cover-mobile.png"),
      });
      await page.locator('[data-shot="profile"]').first().screenshot({
        path: path.join(OUT, "money-profile-mobile.png"),
      });
    } finally {
      await browser.close();
    }
  }

  fs.writeFileSync(
    path.join(OUT, "v5-qa-summary.json"),
    JSON.stringify(reportSummary, null, 2),
    "utf8"
  );
  console.log("DONE", OUT);
  console.log(JSON.stringify(reportSummary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
