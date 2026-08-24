import type { FortuneChart } from "@/lib/fortune-engine/types";
import type { FortuneAiContext } from "@/lib/ai/types";

function pillarParts(pillar: FortuneChart["pillars"]["year"]) {
  return {
    stem: pillar.stem.hangul,
    branch: pillar.branch.hangul,
    ganji: pillar.ganji.hangul,
  };
}

/**
 * Strip PII / ids / full metadata — only interpretive fields for the model.
 */
export function buildFortuneAiContext(chart: FortuneChart): FortuneAiContext {
  return {
    pillars: {
      year: pillarParts(chart.pillars.year),
      month: pillarParts(chart.pillars.month),
      day: pillarParts(chart.pillars.day),
      hour: chart.pillars.hour ? pillarParts(chart.pillars.hour) : null,
    },
    dayMaster: {
      stem: chart.dayMaster.hanja,
      hangul: chart.dayMaster.hangul,
      element: chart.dayMaster.element,
      yinYang: chart.dayMaster.yinYang,
    },
    fiveElements: {
      wood: chart.fiveElements.wood,
      fire: chart.fiveElements.fire,
      earth: chart.fiveElements.earth,
      metal: chart.fiveElements.metal,
      water: chart.fiveElements.water,
    },
    tenGods: {
      year: {
        stem: chart.tenGods.year.stem,
        branch: chart.tenGods.year.branch,
      },
      month: {
        stem: chart.tenGods.month.stem,
        branch: chart.tenGods.month.branch,
      },
      day: {
        stem: chart.tenGods.day.stem,
        branch: chart.tenGods.day.branch,
      },
      hour: chart.tenGods.hour
        ? {
            stem: chart.tenGods.hour.stem,
            branch: chart.tenGods.hour.branch,
          }
        : null,
    },
    conventions: {
      yearBoundary: chart.conventions.yearBoundary,
      monthBoundary: chart.conventions.monthBoundary,
      dayBoundary: chart.conventions.dayBoundary,
    },
    birthTimeUnknown: chart.input.birthTimeUnknown || chart.pillars.hour === null,
    gender: chart.input.gender,
  };
}

/** Whitelist of evidence reference keys derived from context. */
export function buildEvidenceWhitelist(ctx: FortuneAiContext): Set<string> {
  const keys = new Set<string>([
    "dayMaster",
    `dayMaster=${ctx.dayMaster.stem}`,
    "dayMaster.stem",
    "dayMaster.element",
    "dayMaster.yinYang",
    `dayMaster.hangul=${ctx.dayMaster.hangul}`,
    "fiveElements.wood",
    "fiveElements.fire",
    "fiveElements.earth",
    "fiveElements.metal",
    "fiveElements.water",
    `fiveElements.wood=${ctx.fiveElements.wood}`,
    `fiveElements.fire=${ctx.fiveElements.fire}`,
    `fiveElements.earth=${ctx.fiveElements.earth}`,
    `fiveElements.metal=${ctx.fiveElements.metal}`,
    `fiveElements.water=${ctx.fiveElements.water}`,
    "pillars.year.stem",
    "pillars.year.branch",
    "pillars.year.ganji",
    "pillars.month.stem",
    "pillars.month.branch",
    "pillars.month.ganji",
    "pillars.day.stem",
    "pillars.day.branch",
    "pillars.day.ganji",
    "tenGods.year.stem",
    "tenGods.year.branch",
    "tenGods.month.stem",
    "tenGods.month.branch",
    "tenGods.day.stem",
    "tenGods.day.branch",
    "conventions.yearBoundary",
    "conventions.monthBoundary",
    "conventions.dayBoundary",
    "birthTimeUnknown",
    `gender=${ctx.gender}`,
  ]);

  if (ctx.pillars.hour) {
    keys.add("pillars.hour.stem");
    keys.add("pillars.hour.branch");
    keys.add("pillars.hour.ganji");
    keys.add("tenGods.hour.stem");
    keys.add("tenGods.hour.branch");
  } else {
    keys.add("hourUnknown");
  }

  return keys;
}

export function isAllowedEvidenceKey(
  key: string,
  whitelist: Set<string>
): boolean {
  const trimmed = key.trim();
  if (whitelist.has(trimmed)) return true;
  // Allow bare key without value suffix
  const bare = trimmed.split("=")[0]?.trim();
  return Boolean(bare && whitelist.has(bare));
}
