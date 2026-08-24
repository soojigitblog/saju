import "server-only";

import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { getFreeResultById } from "@/lib/repositories/free-results";
import { getProfileById } from "@/lib/repositories/profiles";
import { getFortuneChartById } from "@/lib/repositories/fortune-charts";
import { listActiveProducts } from "@/lib/repositories/products";
import { generatePaidInterpretation } from "@/lib/ai/interpreters/free-interpreter";
import { MockFortuneInterpreter } from "@/lib/ai/interpreters/mock-interpreter";
import { AiEngineError } from "@/lib/ai/errors";
import { buildPaidProductInstruction } from "@/lib/ai/prompts/build-paid-prompt";
import { targetLengthForPaidProduct } from "@/lib/ai/schemas/paid-report";
import type { FortuneChart } from "@/lib/fortune-engine/types";
import {
  toPaidReportPreviewDTO,
  type PaidReportPreviewDTO,
} from "@/lib/dto/paid-report-preview";

/** Owner/QA only — never enable for public users. Requires explicit env. */
export function isPaidPreviewAllowed(): boolean {
  return process.env.ALLOW_PAID_PREVIEW === "1";
}

export async function generatePaidReportPreviewForOwner(input: {
  guestSessionId: string;
  freeResultId: string;
  productSlug?: string | null;
}): Promise<PaidReportPreviewDTO> {
  if (!isPaidPreviewAllowed()) {
    throw new FreeFlowError(
      "FORBIDDEN",
      "유료 리포트 미리보기는 현재 환경에서 사용할 수 없습니다.",
      403
    );
  }

  const free = await getFreeResultById(input.freeResultId);
  if (!free || free.generation_status !== "COMPLETED") {
    throw new FreeFlowError("NOT_FOUND", "사주 결과를 찾을 수 없습니다.", 404);
  }

  const profile = await getProfileById(free.profile_id);
  if (!profile || profile.guest_session_id !== input.guestSessionId) {
    throw new FreeFlowError("FORBIDDEN", "접근 권한이 없습니다.", 403);
  }

  const chartRow = await getFortuneChartById(free.chart_id);
  const chart = (chartRow?.chart ??
    (chartRow?.raw_chart_json as unknown as FortuneChart | undefined)) as
    | FortuneChart
    | undefined;
  if (!chart) {
    throw new FreeFlowError("NOT_FOUND", "사주 명식을 찾을 수 없습니다.", 404);
  }

  const products = await listActiveProducts();
  const product =
    products.find((p) => p.slug === input.productSlug) ?? products[0] ?? null;
  const productName = product?.name ?? "종합 사주 리포트";
  const productSlug = product?.slug ?? "2026-total";

  const paidPromptVersion = {
    promptDefinitionId: "11111111-1111-1111-1111-111111111101",
    promptVersionId: "22222222-2222-2222-2222-222222222201",
    promptVersionNumber: 1,
    productInstruction: buildPaidProductInstruction({
      slug: productSlug,
      name: productName,
    }),
  };

  const productArg = {
    slug: productSlug,
    name: productName,
    targetLengthChars: targetLengthForPaidProduct(productSlug),
  };
  const presentation = {
    presentation: {
      nickname: profile.nickname,
      maritalStatus: profile.marital_status ?? undefined,
      hasChildren: profile.has_children ?? null,
    },
  };

  let generated;
  try {
    generated = await generatePaidInterpretation(
      chart,
      productArg,
      paidPromptVersion,
      presentation
    );
  } catch (error) {
    // QA preview: fall back to mock so owner can still inspect layout/content shape
    if (error instanceof AiEngineError || process.env.NODE_ENV === "development") {
      generated = await generatePaidInterpretation(
        chart,
        productArg,
        paidPromptVersion,
        { ...presentation, interpreter: new MockFortuneInterpreter() }
      );
    } else {
      throw error;
    }
  }

  const { meta, ...report } = generated;

  return toPaidReportPreviewDTO({
    report,
    nickname: profile.nickname,
    productName,
    previewId: free.id,
    provider: meta.provider,
    model: meta.model,
  });
}
