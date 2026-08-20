import type { FortuneChart } from "../types";

export function assertValidChart(chart: FortuneChart): void {
  if (!chart.pillars.year || !chart.pillars.month || !chart.pillars.day) {
    throw new Error("Chart missing required pillars");
  }
  if (chart.input.birthTimeUnknown && chart.pillars.hour !== null) {
    throw new Error("Hour pillar must be null when birth time unknown");
  }
  if (!chart.input.birthTimeUnknown && chart.pillars.hour === null) {
    throw new Error("Hour pillar required when birth time known");
  }
  if (chart.dayMaster.hanja !== chart.pillars.day.stem.hanja) {
    throw new Error("dayMaster must match day pillar stem");
  }
  if (chart.fiveElements.method !== "visible_stems_branches_count") {
    throw new Error("Unexpected fiveElements method");
  }
}
