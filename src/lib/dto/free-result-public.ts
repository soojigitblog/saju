import type { FreeInterpretationOutput } from "@/lib/ai/types";
import type { Product } from "@/types";

export type FreeResultPublicDTO = {
  id: string;
  nickname: string;
  birthYearLabel: string | null;
  headline: string;
  hookLine: string;
  summary: string;
  keywords: string[];
  scores: {
    overall: number;
    money: number;
    career: number;
    love: number;
  };
  /** Presentation-only chart summary — no calculationHash / raw chart */
  dayMaster: {
    hanja: string;
    hangul: string;
    element: "wood" | "fire" | "earth" | "metal" | "water";
  } | null;
  fiveElements: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  } | null;
  outerVsInner: {
    outer: string;
    inner: string;
    insightBasis: string[];
  } | null;
  hiddenSelf: {
    title: string;
    body: string;
    insightBasis: string[];
  } | null;
  personality: { title: string; summary: string };
  strengths: string[];
  cautionPatterns: string[];
  stressPattern: string | null;
  currentFlow: { title: string; summary: string };
  previews: Array<{
    category: string;
    preview: string;
    locked: boolean;
  }>;
  signatureClosing: string | null;
  disclaimer: string;
  status: "COMPLETED";
};

/** Normalize V1 (legacy) and V2 result_json into public DTO. */
export function toFreeResultPublicDTO(input: {
  id: string;
  nickname: string;
  birthYear?: number | null;
  result: FreeInterpretationOutput;
  dayMaster?: FreeResultPublicDTO["dayMaster"];
  fiveElements?: FreeResultPublicDTO["fiveElements"];
}): FreeResultPublicDTO {
  const r = input.result as FreeInterpretationOutput & {
    hookLine?: string;
    outerVsInner?: FreeResultPublicDTO["outerVsInner"];
    hiddenSelf?: FreeResultPublicDTO["hiddenSelf"];
    strengths?: string[];
    cautionPatterns?: string[];
    stressPattern?: string;
    signatureClosing?: string;
  };
  const scores = r.scores;

  return {
    id: input.id,
    nickname: input.nickname,
    birthYearLabel: input.birthYear ? `${input.birthYear}년생` : null,
    headline: r.headline,
    hookLine: r.hookLine?.trim() || r.headline,
    summary: r.summary,
    keywords: r.keywords,
    scores: {
      overall: clampScore(scores.overall),
      money: clampScore(scores.money),
      career: clampScore(scores.career),
      love: clampScore(scores.love),
    },
    dayMaster: input.dayMaster ?? null,
    fiveElements: input.fiveElements ?? null,
    outerVsInner: r.outerVsInner
      ? {
          outer: r.outerVsInner.outer,
          inner: r.outerVsInner.inner,
          insightBasis: r.outerVsInner.insightBasis ?? [],
        }
      : null,
    hiddenSelf: r.hiddenSelf
      ? {
          title: r.hiddenSelf.title,
          body: r.hiddenSelf.body,
          insightBasis: r.hiddenSelf.insightBasis ?? [],
        }
      : null,
    personality: r.personality,
    strengths: Array.isArray(r.strengths) ? r.strengths : [],
    cautionPatterns: Array.isArray(r.cautionPatterns) ? r.cautionPatterns : [],
    stressPattern: r.stressPattern?.trim() || null,
    currentFlow: r.currentFlow,
    previews: r.previews.map((p) => ({
      category: p.category,
      preview: p.preview,
      locked: true,
    })),
    signatureClosing: r.signatureClosing?.trim() || null,
    disclaimer: r.disclaimer,
    status: "COMPLETED",
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export type FreeResultPageModel = {
  result: FreeResultPublicDTO;
  products: Product[];
};
