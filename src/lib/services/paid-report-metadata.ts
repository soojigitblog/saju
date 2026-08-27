import "server-only";

import type { Report } from "@/lib/repositories/reports";

/** Server-side truth for mock vs live — never trust result_json from client/AI alone. */
export function deriveReportGenerationMode(
  report: Pick<Report, "model" | "result_json">
): "mock" | "live" {
  if (report.model === "mock") return "mock";
  const json = report.result_json as { generationMode?: string } | null;
  if (json?.generationMode === "live" && report.model && report.model !== "mock") {
    return "live";
  }
  return report.model ? "live" : "mock";
}

/** Strip client/AI-spoofable metadata before persisting paid report JSON. */
export function stampServerPaidReportMetadata(input: {
  body: Record<string, unknown>;
  generationMode: "mock" | "live";
  interpretationVersion: string;
  reportRenderVersion: string;
}): Record<string, unknown> {
  const {
    generationMode: _g,
    provider: _p,
    reportRenderVersion: _r,
    interpretationVersion: _i,
    ...rest
  } = input.body;
  return {
    ...rest,
    interpretationVersion: input.interpretationVersion,
    reportRenderVersion: input.reportRenderVersion,
    generationMode: input.generationMode,
  };
}
