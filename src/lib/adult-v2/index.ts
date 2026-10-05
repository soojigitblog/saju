import type { FortuneChart } from "@/lib/fortune-engine/types";
import { calculateAnnualFortune } from "./annual-fortune";
import { calculateDaeun, daeunForYear } from "./daeun";
import { buildFortuneEvidence } from "./evidence";
import { calculateChangePressure, calculateDomainActivation, calculateEvidenceCoverage } from "./scoring";
import type { AdultReportV2, CalculatedFortuneData } from "./types";

export * from "./types";
export * from "./annual-fortune";
export * from "./daeun";
export * from "./evidence";
export * from "./scoring";

export function calculateAdultV2Data(chart: FortuneChart, year: number): CalculatedFortuneData {
  const daeun = calculateDaeun(chart);
  const annual = calculateAnnualFortune(year);
  const selectedDaeun = daeunForYear(daeun, year);
  const evidence = buildFortuneEvidence({ chart, annual, daeun: selectedDaeun });
  return {
    natal: chart,
    daeun,
    annual,
    selectedDaeun,
    evidence,
    activation: calculateDomainActivation(evidence),
    changePressure: calculateChangePressure(evidence),
    confidence: calculateEvidenceCoverage({
      birthTimeKnown: !chart.input.birthTimeUnknown,
      hasDaeun: selectedDaeun !== null,
    }),
  };
}

export function buildAdultReportV2(chart: FortuneChart, year: number): AdultReportV2 {
  return {
    reportVersion: "adult-v2",
    engineVersion: `${chart.engine.name}@${chart.engine.version}`,
    calculated: calculateAdultV2Data(chart, year),
  };
}
