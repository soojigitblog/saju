import "server-only";

import { getFreeResultById } from "@/lib/repositories/free-results";
import { getProfileById } from "@/lib/repositories/profiles";
import { getFortuneChartById } from "@/lib/repositories/fortune-charts";
import { listActiveProducts } from "@/lib/repositories/products";
import { toFreeResultPublicDTO } from "@/lib/dto/free-result-public";
import type { FreeResultPageModel } from "@/lib/dto/free-result-public";
import type { FreeInterpretationOutput } from "@/lib/ai/types";
import type { FortuneChart } from "@/lib/fortune-engine/types";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

export async function getFreeResultStatusForOwner(input: {
  freeResultId: string;
  guestSessionId: string;
}): Promise<{
  status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
  redirectTo?: string;
  errorCode?: string | null;
}> {
  const row = await getFreeResultById(input.freeResultId);
  if (!row) {
    throw new FreeFlowError("NOT_FOUND", "결과를 찾을 수 없습니다.", 404);
  }

  const profile = await getProfileById(row.profile_id);
  if (!profile || profile.guest_session_id !== input.guestSessionId) {
    throw new FreeFlowError("FORBIDDEN", "접근 권한이 없습니다.", 403);
  }

  if (row.generation_status === "COMPLETED") {
    return {
      status: "COMPLETED",
      redirectTo: `/result/${row.id}`,
    };
  }

  return {
    status: row.generation_status,
    errorCode: row.error_code,
  };
}

export async function getFreeResultPageForOwner(input: {
  freeResultId: string;
  guestSessionId: string;
}): Promise<FreeResultPageModel> {
  const row = await getFreeResultById(input.freeResultId);
  if (!row) {
    throw new FreeFlowError("NOT_FOUND", "결과를 찾을 수 없습니다.", 404);
  }

  const profile = await getProfileById(row.profile_id);
  if (!profile || profile.guest_session_id !== input.guestSessionId) {
    throw new FreeFlowError("FORBIDDEN", "접근 권한이 없습니다.", 403);
  }

  if (row.generation_status !== "COMPLETED" || !row.result_json) {
    throw new FreeFlowError(
      "NOT_READY",
      "아직 결과가 준비되지 않았습니다.",
      409
    );
  }

  const interpretation = row.result_json as unknown as FreeInterpretationOutput;
  const birthYear = Number(String(profile.birth_date).slice(0, 4));

  const products = await listActiveProducts();
  const fortuneProducts = products.filter(
    (p) => (p.productType ?? "fortune") === "fortune"
  );

  let dayMaster: FreeResultPageModel["result"]["dayMaster"] = null;
  let fiveElements: FreeResultPageModel["result"]["fiveElements"] = null;
  try {
    const chartRow = await getFortuneChartById(row.chart_id);
    const chart = (chartRow?.chart ??
      (chartRow?.raw_chart_json as unknown as FortuneChart | undefined)) as
      | FortuneChart
      | undefined;
    if (chart?.dayMaster && chart.fiveElements) {
      dayMaster = {
        hanja: chart.dayMaster.hanja,
        hangul: chart.dayMaster.hangul,
        element: chart.dayMaster.element,
      };
      fiveElements = {
        wood: chart.fiveElements.wood,
        fire: chart.fiveElements.fire,
        earth: chart.fiveElements.earth,
        metal: chart.fiveElements.metal,
        water: chart.fiveElements.water,
      };
    }
  } catch {
    /* presentation optional */
  }

  return {
    result: toFreeResultPublicDTO({
      id: row.id,
      nickname: profile.nickname,
      birthYear: Number.isFinite(birthYear) ? birthYear : null,
      result: interpretation,
      dayMaster,
      fiveElements,
    }),
    products: fortuneProducts,
  };
}
