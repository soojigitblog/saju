/**
 * PHASE P3.6 — Easy Value editorial cut PDFs.
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-p36-easy-value-polished.ts
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
  findAwkwardTeaserPatterns,
  findInternalCustomerTerms,
  findParticleErrors,
} from "../src/lib/report/paid-report-pdf-v5";

const OUT = path.join(process.cwd(), "tmp", "quality-review", "easy-value-polished");

const INTERNAL_RE =
  /십성\s*축|오행\s*관계\s*축|오행\s*희소\s*축|오행\s*우세\s*축|Evidence\s*Axis|일간\s*축|일주\s*축|강점-그림자\s*축/g;
const QA_RE = {
  doubleContra: /반대로\s*반대로/g,
  contraDaman: /반대로\s*다만/g,
  doubleHamkke: /함께[^。.\n]{0,12}함께\s*보면/g,
};
const PROOF_RE = {
  goWa: /두드러지고와/g,
  doeWa: /되고와/g,
  contraComma: /반대로\s+,/g,
  relativeDup: /상대에게는\s*상대는/g,
  ilganGyeong: /일간\s*庚경/g,
  ilWa: /일와의/g,
  jeomBaechi: /점 배치를/g,
  durojemGwa: /두드러짐과\s*겁재/g,
  jaehyeon: /재현성/g,
  geomsuPoint: /검수\s*포인트/g,
  differentAxis: /서로\s*다른\s*축/g,
};

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
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}

function plainText(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function countDupSentences(text: string) {
  const sentences = text
    .split(/[.。!？?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 18);
  const seen = new Map<string, number>();
  for (const s of sentences) {
    const k = s.slice(0, 28);
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n >= 2).map(([k, n]) => `${n}× ${k}`);
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
    { slug: "2026-money", name: "나의 돈 사용설명서", stem: "money" },
    { slug: "2026-career", name: "나의 일 사용설명서", stem: "career" },
    { slug: "2026-love", name: "나의 연애 사용설명서", stem: "love" },
    { slug: "2026-total", name: "나의 사주 사용설명서", stem: "total" },
  ];

  const per: Record<string, unknown> = {};
  let internalTotal = 0;
  let qaHits = 0;

  for (const job of jobs) {
    const report = buildMockPaidResult(ctx, job.name, { productSlug: job.slug, chart });
    const html = buildPaidReportPdfHtmlV5({
      nickname: "수지",
      productName: job.name,
      productSlug: job.slug,
      report,
      ctx,
      v2,
    });
    fs.writeFileSync(path.join(OUT, `${job.stem}.html`), html, "utf8");
    await htmlToPdf(path.join(OUT, `${job.stem}.html`), path.join(OUT, `${job.stem}.pdf`));
    console.log("PDF", job.stem);

    const text = plainText(html);
    const internal = [
      ...findInternalCustomerTerms(html),
      ...(text.match(INTERNAL_RE) ?? []),
    ];
    internalTotal += internal.length;
    const qa = {
      doubleContra: (text.match(QA_RE.doubleContra) ?? []).length,
      contraDaman: (text.match(QA_RE.contraDaman) ?? []).length,
      doubleHamkke: (text.match(QA_RE.doubleHamkke) ?? []).length,
    };
    qaHits += qa.doubleContra + qa.contraDaman + qa.doubleHamkke;
    const dups = countDupSentences(text);
    const proof = Object.fromEntries(
      Object.entries(PROOF_RE).map(([k, re]) => [k, (text.match(re) ?? []).length])
    );
    const proofHits = Object.values(proof).reduce((a, b) => a + b, 0);
    const particles = findParticleErrors(html);
    const overviewShots =
      (html.match(
        /data-shot="(?:profile|environment|before-after|unknown-patterns)"[\s\S]*?(?=<div class="page |$)/g
      ) ?? []).join("\n");
    const awkwardTeasers = findAwkwardTeaserPatterns(overviewShots);
    const actualDedupe = {
      loveRecovery: (text.match(/다시 가까워질 때는 사과의 크기보다/g) ?? []).length,
      totalSlowJudge: (text.match(/판단이 느린 게 아니라/g) ?? []).length,
      totalTongbo: (text.match(/상대는 이미 결론이 끝난 뒤/g) ?? []).length,
      totalDelayDefault: (text.match(/결정 지연이 기본값/g) ?? []).length,
      moneyInsaek: (text.match(/인색/g) ?? []).length,
    };

    per[job.stem] = {
      pages: (html.match(/class="page /g) ?? []).length,
      internal,
      qa,
      proof,
      proofHits,
      actualDedupe,
      semanticDupSamples: dups.slice(0, 8),
      semanticDupCount: dups.length,
      particles,
      awkwardTeasers,
      hasGlossary: html.includes("사주 용어, 이것만 알면 돼요"),
      easyScope: html.includes("태어난 순간의 사주 구조"),
    };
  }

  const loveRecovery = (per.love as { actualDedupe: { loveRecovery: number } }).actualDedupe
    .loveRecovery;
  const totalSlow = (per.total as { actualDedupe: { totalSlowJudge: number } }).actualDedupe
    .totalSlowJudge;
  const totalTongbo = (per.total as { actualDedupe: { totalTongbo: number } }).actualDedupe
    .totalTongbo;
  const totalDelay = (per.total as { actualDedupe: { totalDelayDefault: number } }).actualDedupe
    .totalDelayDefault;
  const moneyPeopleInsaek = (() => {
    const html = fs.readFileSync(path.join(OUT, "money.html"), "utf8");
    const people =
      html.split('data-shot="income-people"')[1]?.split("data-shot=")[0] ?? "";
    return (people.replace(/<[^>]+>/g, " ").match(/인색/g) ?? []).length;
  })();
  const actualPass =
    loveRecovery <= 1 &&
    totalSlow <= 1 &&
    totalTongbo <= 1 &&
    totalDelay <= 1 &&
    moneyPeopleInsaek <= 1;

  const proofTotal = Object.values(per).reduce(
    (n, row) => n + ((row as { proofHits: number }).proofHits ?? 0),
    0
  );
  const particleTotal = Object.values(per).reduce(
    (n, row) => n + ((row as { particles: string[] }).particles?.length ?? 0),
    0
  );
  const awkwardTeaserTotal = Object.values(per).reduce(
    (n, row) => n + ((row as { awkwardTeasers: string[] }).awkwardTeasers?.length ?? 0),
    0
  );

  const gates = {
    particleErrors: particleTotal,
    awkwardKorean: proofTotal,
    awkwardTeaserLanguage: awkwardTeaserTotal,
    exactSentenceDuplicate: actualPass ? "0 / ACTUAL_PDF_TEXT" : "FAIL / ACTUAL_PDF_TEXT",
    loveRecoverySentence: loveRecovery,
    totalSlowJudge: totalSlow,
    totalTongbo,
    totalDelayDefault: totalDelay,
    moneyInsaekNearDup: moneyPeopleInsaek,
    moneySemanticRepetition: (per.money as { semanticDupCount: number }).semanticDupCount,
    careerSemanticRepetition: (per.career as { semanticDupCount: number }).semanticDupCount,
    loveSemanticRepetition: (per.love as { semanticDupCount: number }).semanticDupCount,
    totalSemanticRepetition: (per.total as { semanticDupCount: number }).semanticDupCount,
    internalTerms: `${internalTotal} / actual`,
    sentenceQa: `${qaHits} / actual`,
    easyKorean:
      qaHits === 0 &&
      internalTotal === 0 &&
      proofTotal === 0 &&
      particleTotal === 0 &&
      awkwardTeaserTotal === 0 &&
      actualPass
        ? "PASS"
        : "FAIL",
    uniqueCustomerValue: "HUMAN REVIEW",
    liveGemini: "NOT RUN",
    finalMockGate:
      actualPass && awkwardTeaserTotal === 0 ? "READY" : "BLOCKED",
    mockProductGate:
      actualPass && awkwardTeaserTotal === 0
        ? "READY — proceed to PAID GEMINI LIVE ACCEPTANCE"
        : "BLOCKED",
  };

  fs.writeFileSync(path.join(OUT, "p36-qa.json"), JSON.stringify({ per, gates }, null, 2), "utf8");
  console.log(JSON.stringify(gates, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
