import { STEMS } from "../constants";
import type {
  ElementKey,
  Pillar,
  PillarTenGods,
  StemInfo,
  TenGodLabel,
  YinYang,
} from "../types";

const GENERATES: Record<ElementKey, ElementKey> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const CONTROLS: Record<ElementKey, ElementKey> = {
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
};

/**
 * Ten Gods relative to day master.
 * For branches: uses 본기(mainStemIndex) stem — method documented in chart.
 */
export function tenGodForTarget(
  dayMaster: StemInfo,
  target: StemInfo
): TenGodLabel {
  if (dayMaster.index === target.index) return "일간";

  const samePolarity = dayMaster.yinYang === target.yinYang;

  if (dayMaster.element === target.element) {
    return samePolarity ? "비견" : "겁재";
  }
  if (GENERATES[dayMaster.element] === target.element) {
    return samePolarity ? "식신" : "상관";
  }
  if (CONTROLS[dayMaster.element] === target.element) {
    return samePolarity ? "편재" : "정재";
  }
  if (CONTROLS[target.element] === dayMaster.element) {
    return samePolarity ? "편관" : "정관";
  }
  if (GENERATES[target.element] === dayMaster.element) {
    return samePolarity ? "편인" : "정인";
  }

  throw new Error("Unable to resolve ten god");
}

export function pillarTenGods(dayMaster: StemInfo, pillar: Pillar): PillarTenGods {
  const branchMainStem = STEMS[pillar.branch.mainStemIndex];
  return {
    stem: tenGodForTarget(dayMaster, pillar.stem),
    branch: tenGodForTarget(dayMaster, branchMainStem),
  };
}

export function buildTenGodsChart(
  dayMaster: StemInfo,
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar | null;
  }
) {
  return {
    method: "day_master_vs_stem_and_branch_main_qi" as const,
    year: pillarTenGods(dayMaster, pillars.year),
    month: pillarTenGods(dayMaster, pillars.month),
    day: {
      stem: "일간" as TenGodLabel,
      branch: tenGodForTarget(
        dayMaster,
        STEMS[pillars.day.branch.mainStemIndex]
      ),
    },
    hour: pillars.hour ? pillarTenGods(dayMaster, pillars.hour) : null,
  };
}

/** Exported for unit tests */
export function polarityLabel(a: YinYang, b: YinYang): "same" | "diff" {
  return a === b ? "same" : "diff";
}
