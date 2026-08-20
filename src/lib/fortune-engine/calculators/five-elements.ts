import type { ElementKey, Pillar } from "../types";

export type FiveElementCounts = {
  method: "visible_stems_branches_count";
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
};

/**
 * Counts only visible pillar stems + branches (max 8).
 * Does NOT include hidden stems (지장간) weighting.
 */
export function countVisibleFiveElements(
  pillars: Array<Pillar | null>
): FiveElementCounts {
  const counts: Record<ElementKey, number> = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };

  for (const pillar of pillars) {
    if (!pillar) continue;
    counts[pillar.stem.element] += 1;
    counts[pillar.branch.element] += 1;
  }

  return {
    method: "visible_stems_branches_count",
    ...counts,
  };
}
