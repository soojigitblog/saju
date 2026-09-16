/**
 * Cost-bearing paid OpenAI cohort QA.
 *
 * Run deliberately:
 *   OPENAI_PAID_LIVE_QA=1 node --env-file=.env.local --import tsx \
 *     --require ./scripts/shim-server-only.cjs scripts/paid-openai-cohort-qa.ts
 *
 * It makes 12 paid-model calls: 3 charts × money/career/love/total.
 * The JSON artifact contains customer-safe excerpts and token counts only.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fortuneEngine } from "@/lib/fortune-engine";
import { generatePaidInterpretation } from "@/lib/ai/interpreters/free-interpreter";
import { evaluateConsultingDepth, evaluatePaidQualityV2 } from "@/lib/ai/validators/paid-quality-v2";

if (process.env.OPENAI_PAID_LIVE_QA !== "1") {
  throw new Error("Refusing paid AI calls. Set OPENAI_PAID_LIVE_QA=1 deliberately.");
}
if ((process.env.AI_PROVIDER_PAID ?? "").toLowerCase() !== "openai") {
  throw new Error("This QA requires AI_PROVIDER_PAID=openai.");
}

const charts = [
  { id: "a", birthDate: "1990-05-15", birthTime: "10:30" },
  { id: "b", birthDate: "1985-01-08", birthTime: "09:00" },
  { id: "c", birthDate: "2001-12-25", birthTime: "14:20" },
] as const;

const chartFilter = (process.env.PAID_OPENAI_COHORT_CHARTS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const selectedCharts = charts.filter(
  (chart) => chartFilter.length === 0 || chartFilter.includes(chart.id)
);
if (selectedCharts.length === 0) {
  throw new Error("No paid QA charts selected.");
}

const products = [
  { slug: "2026-money", name: "나의 재물 사용설명서", targetLengthChars: 4200 },
  { slug: "2026-career", name: "나의 일 사용설명서", targetLengthChars: 4200 },
  { slug: "2026-love", name: "나의 연애 사용설명서", targetLengthChars: 4200 },
  { slug: "2026-total", name: "나의 사주 사용설명서", targetLengthChars: 6200 },
] as const;

const productFilter = (process.env.PAID_OPENAI_COHORT_PRODUCTS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const selectedProducts = products.filter(
  (product) => productFilter.length === 0 || productFilter.includes(product.slug)
);
if (selectedProducts.length === 0) {
  throw new Error("No paid QA products selected.");
}

type CohortRow = {
  chart: string;
  product: string;
  signature: string;
  firstCore: string;
  firstShareable: string;
  firstAction: string;
  quality: ReturnType<typeof evaluatePaidQualityV2>;
  consultingDepth: ReturnType<typeof evaluateConsultingDepth>;
  usage: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null } | undefined;
};

async function main() {
const rows: CohortRow[] = [];
for (const sample of selectedCharts) {
  const chart = fortuneEngine.calculate({
    gender: "female",
    calendarType: "solar",
    birthDate: sample.birthDate,
    birthTime: sample.birthTime,
    birthTimeUnknown: false,
    lunarLeapMonth: false,
    timezone: "Asia/Seoul",
    countryCode: "KR",
  });

  for (const product of selectedProducts) {
    process.stdout.write(`Generating ${sample.id}/${product.slug}…\n`);
    const report = await generatePaidInterpretation(chart, product, {
      promptDefinitionId: "00000000-0000-0000-0000-000000000001",
      promptVersionId: "00000000-0000-0000-0000-000000000002",
      promptVersionNumber: 1,
      productInstruction: `${product.name}: 개인 명식 근거와 행동 장면을 연결한 유료 리포트.`,
    });
    const first = report.sections[0];
    if (!first) throw new Error(`No sections for ${sample.id}/${product.slug}`);
    rows.push({
      chart: sample.id,
      product: product.slug,
      signature: report.signatureStatement,
      firstCore: first.coreInsight,
      firstShareable: first.shareableLine ?? "",
      firstAction: report.actionItems[0]?.what ?? "",
      quality: evaluatePaidQualityV2(report),
      consultingDepth: evaluateConsultingDepth(report),
      usage: report.meta.usage,
    });
  }
}

const duplicateErrors: string[] = [];
for (const product of selectedProducts) {
  const set = rows.filter((row) => row.product === product.slug);
  for (const field of ["signature", "firstCore", "firstShareable", "firstAction"] as const) {
    const values = set.map((row) => row[field]).filter(Boolean);
    if (new Set(values).size !== values.length) {
      duplicateErrors.push(`${product.slug}: duplicate ${field}`);
    }
  }
}

const failedRows = rows.filter(
  (row) =>
    row.quality.genericAdvice !== "NONE" ||
    row.quality.insightDiversity !== "PASS" ||
    row.quality.evidenceDiversity !== "PASS" ||
    !row.consultingDepth.pass
);
const result = {
  generatedAt: new Date().toISOString(),
  provider: "openai",
  rows,
  duplicateErrors,
  failedRows: failedRows.map((row) => ({ chart: row.chart, product: row.product })),
  pass: duplicateErrors.length === 0 && failedRows.length === 0,
};

const artifactDir = join(process.cwd(), "artifacts", "paid-openai-cohort-qa");
await mkdir(artifactDir, { recursive: true });
await writeFile(join(artifactDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ pass: result.pass, duplicateErrors, failedRows: result.failedRows }, null, 2));
if (!result.pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
