import { z } from "zod";

/**
 * PHASE P1.4 — Paid report schema V4 (editorial page model).
 */

export const paidProductKindSchema = z.enum([
  "money",
  "career",
  "love",
  "total",
  "generic",
]);

export type PaidProductKind = z.infer<typeof paidProductKindSchema>;

export const paidSectionKeySchema = z.enum([
  // legacy / career / love / generic (stored reports + focus siblings)
  "personality",
  "overall",
  "money",
  "career",
  "love",
  "relationships",
  "timing",
  "advice",
  "money_attitude",
  "money_earn_strength",
  "money_leak",
  "money_judgment",
  "money_stable",
  "money_solo_vs_people",
  "money_work_link",
  "money_caution",
  "money_action",
  "money_closing",
  "career_character",
  "career_strength_work",
  "career_org_friction",
  "career_conflict",
  "career_overload",
  "career_recognition",
  "career_path_type",
  "career_change_signal",
  "career_check",
  "career_closing",
  "love_attraction",
  "love_before",
  "love_after",
  "love_expression",
  "love_needs",
  "love_fight",
  "love_breaking",
  "love_distance",
  "love_fit",
  "love_closing",
  "total_one_line",
  "total_core_structure",
  "total_five_elements",
  "total_outer_inner",
  "total_decisions",
  "total_people",
  "total_work",
  "total_money",
  "total_love",
  "total_stress",
  "total_patterns",
  "total_strengths",
  "total_overdrive",
  "total_leverage",
  "total_balance",
  "total_action",
  "total_closing",
  // P1.2 money diagnosis
  "money_ops",
  "money_earn",
  "money_leak_v2",
  "money_judgment_v2",
  "money_work",
  "money_sidebiz",
  "money_people",
  "money_manual",
  // P1.2 total user-manual
  "total_blueprint",
  "total_life_scenes",
  "total_decision",
  "total_relationship",
  "total_work_v2",
  "total_money_link",
  "total_love_v2",
  "total_stress_v2",
  "total_strength_shadow",
  "total_playbook",
  // P1.3 money (10 chapters)
  "money_p01_profile",
  "money_p02_criteria",
  "money_p03_earn",
  "money_p04_leak",
  "money_p05_shake",
  "money_p06_work",
  "money_p07_people",
  "money_p08_mistake",
  "money_p09_style",
  "money_p10_manual",
  // P1.3 total (10 parts)
  "total_p01_structure",
  "total_p02_decision",
  "total_p03_relationship",
  "total_p04_work",
  "total_p05_money",
  "total_p06_love",
  "total_p07_stress",
  "total_p08_paradox",
  "total_p09_shadow",
  "total_p10_playbook",
  // P1.4 money (6 editorial sections + profile/final)
  "money_v4_structure",
  "money_v4_earn_spend",
  "money_v4_blindspot",
  "money_v4_work",
  "money_v4_people",
  "money_v4_playbook",
  // P1.4 total (9 editorial sections)
  "total_v4_decision",
  "total_v4_relationship",
  "total_v4_work",
  "total_v4_money_link",
  "total_v4_love",
  "total_v4_stress",
  "total_v4_paradox",
  "total_v4_shadow",
  "total_v4_playbook",
]);

export const paidSectionSchema = z.object({
  id: z.string().min(1).max(60).optional(),
  key: paidSectionKeySchema,
  title: z.string().min(1).max(60),
  /** Question this chapter must answer. */
  question: z.string().min(1).max(120).optional(),
  /** One non-generic core insight (not a template slogan). */
  coreInsight: z.string().min(1).max(220),
  /** PHASE P2: explicit interpretation field for downstream editorial/render use. */
  coreInterpretation: z.string().min(1).max(260).optional(),
  /** Domain-specific behavior scenes. */
  behaviorScenes: z.array(z.string().min(1).max(220)).min(1).max(5),
  behaviorPossibilities: z.array(z.string().min(1).max(220)).max(5).optional(),
  realLifeExamples: z.array(z.string().min(1).max(220)).max(5).optional(),
  strengthSide: z.string().min(1).max(200).optional(),
  shadowSide: z.string().min(1).max(200).optional(),
  riskSide: z.string().min(1).max(200).optional(),
  counterPattern: z.string().min(1).max(220).optional(),
  triggerSituation: z.string().min(1).max(200).optional(),
  triggerConditions: z.array(z.string().min(1).max(160)).max(5).optional(),
  practicalMeaning: z.string().min(1).max(280).optional(),
  actionAdvice: z.array(z.string().min(1).max(180)).max(5).optional(),
  actionOptions: z.array(z.string().min(1).max(180)).max(5).optional(),
  /**
   * WHY paragraphs — unique per chapter.
   * Must explain the reading with specific Fortune Data, not boilerplate.
   */
  evidenceExplanation: z.array(z.string().min(1).max(280)).min(1).max(4),
  takeaway: z.string().min(1).max(160).optional(),
  /** Evidence keys actually used for THIS chapter only. */
  evidence: z.array(z.string().min(1)).min(1).max(8),
  evidenceAxisIds: z.array(z.string().min(1).max(40)).max(8).optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
  shareableLine: z.string().min(1).max(140).optional(),
  cautions: z.array(z.string().min(1).max(120)).max(4).optional(),
  pullQuote: z.string().min(1).max(140).optional(),
  /** Connects this chapter to the previous narrative beat. */
  narrativeBridge: z.string().min(1).max(200).optional(),
  /** Only chapters with real insight value should set true (WHY budget). */
  includeWhyBox: z.boolean().optional(),
  /** Paradox / reversal insight for this chapter (optional). */
  paradoxNote: z.string().min(1).max(220).optional(),
  // --- Consulting-grade optional depth (PHASE consulting) ---
  discoveryLevel: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (v === 1 || v === 2 || v === 3) return v;
    if (typeof v === "string") {
      const n = Number(v.trim());
      if (n === 1 || n === 2 || n === 3) return n;
      return undefined;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      const n = Math.round(v);
      if (n === 1 || n === 2 || n === 3) return n;
    }
    return undefined;
  }, z.union([z.literal(1), z.literal(2), z.literal(3)]).optional()),
  reactionChain: z
    .array(
      z.object({
        label: z.string().min(1).max(40),
        text: z.string().min(1).max(160),
      })
    )
    .min(2)
    .max(8)
    .optional(),
  selfInterpretation: z.string().min(1).max(220).optional(),
  outsideInterpretation: z.string().min(1).max(220).optional(),
  /** How the person often misreads this pattern as a personality flaw. */
  selfMisread: z.string().min(1).max(220).optional(),
  /** Level 2–3 causal explanation beyond coreInsight. */
  whyDeeper: z.string().min(1).max(480).optional(),
});

/** Cross-domain bridge (Total consulting). */
export const paidCrossDomainLinkSchema = z.object({
  from: z.string().min(1).max(24),
  to: z.string().min(1).max(24),
  bridge: z.string().min(1).max(280),
});

/** Start → reaction → result pattern chain (Total consulting). */
export const paidPatternChainSchema = z.object({
  title: z.string().min(1).max(60),
  steps: z.array(z.string().min(1).max(120)).min(3).max(8),
});

/** Optional rhythm notes — NOT 대운/세운. */
export const paidMonthlyOutlookSchema = z.object({
  month: z.number().int().min(1).max(12),
  title: z.string().min(1).max(40),
  summary: z.string().min(1).max(120),
  detail: z.string().min(1).max(600),
  focus: z.array(z.string().min(1).max(20)).max(4).optional(),
});

export const paidContradictionSchema = z.object({
  poleA: z.string().min(1).max(40),
  poleB: z.string().min(1).max(40),
  howItShows: z.string().min(1).max(280),
  upside: z.string().min(1).max(160),
  downside: z.string().min(1).max(160),
  whenStronger: z.string().min(1).max(160),
  /** Downstream result others may misread. */
  result: z.string().min(1).max(220).optional(),
  evidence: z.array(z.string().min(1)).min(1).max(6),
});

export const paidStrengthShadowSchema = z.object({
  strength: z.string().min(1).max(80),
  overuse: z.string().min(1).max(160),
  problem: z.string().min(1).max(160),
  balancePoint: z.string().min(1).max(180).optional(),
  evidence: z.array(z.string().min(1)).min(1).max(5),
});

export const paidProfileItemSchema = z.object({
  label: z.string().min(1).max(40),
  value: z.string().min(1).max(120),
});

export const paidProfileScaleSchema = z.object({
  label: z.string().min(1).max(40),
  level: z.enum(["low", "mid", "high"]),
  leftLabel: z.string().min(1).max(24),
  rightLabel: z.string().min(1).max(24),
  note: z.string().min(1).max(120),
});

export const paidActionItemSchema = z.object({
  domain: z.enum(["money", "work", "relationship", "self", "general"]),
  when: z.string().min(1).max(160).optional(),
  what: z.string().min(1).max(160),
  why: z.string().min(1).max(160),
  how: z.string().min(1).max(200),
});

export const paidFinalSummarySchema = z.object({
  /** Money: 강점2 / 주의2 / 습관2 / 유지2 — Total: flexible */
  strengths: z.array(z.string().min(1).max(140)).min(2).max(3),
  cautions: z.array(z.string().min(1).max(140)).min(2).max(3),
  changeHabits: z.array(z.string().min(1).max(140)).min(2).max(3).optional(),
  keepHabits: z.array(z.string().min(1).max(140)).min(2).max(3).optional(),
  closingLine: z.string().min(1).max(180),
  /** V4: Final portrait narrative (3–5 sentences). */
  portraitNarrative: z.array(z.string().min(1).max(220)).min(2).max(5).optional(),
  keepItems: z.array(z.string().min(1).max(120)).max(4).optional(),
  watchItems: z.array(z.string().min(1).max(120)).max(4).optional(),
  useItems: z.array(z.string().min(1).max(120)).max(4).optional(),
});

export const paidBlueprintSchema = z.object({
  dayMasterTerm: z.string().min(1).max(20),
  dayMasterPlain: z.string().min(1).max(200),
  fiveElementsNote: z.string().min(1).max(240),
  tenGodsNote: z.string().min(1).max(240),
  structurePlain: z.string().min(1).max(280),
  lifePlain: z.string().min(1).max(280),
});

export const paidFortuneReportSchema = z.object({
  title: z.string().min(1).max(80),
  reportVersion: z.enum(["v2", "v3", "v4"]).optional(),
  interpretationVersion: z.string().min(1).max(24).optional(),
  reportKind: z.enum(["money", "total", "career", "love", "generic"]).optional(),
  signatureStatement: z.string().min(1).max(220),
  freeBridge: z.string().min(1).max(220).optional(),
  executiveSummary: z.string().min(1).max(600),
  /** Page-2 dashboard items (money profile or core profile). */
  profileDashboard: z.array(paidProfileItemSchema).min(4).max(10),
  /** Money product: rule-based qualitative scales (no arbitrary scores). */
  profileScales: z.array(paidProfileScaleSchema).min(3).max(6).optional(),
  fiveElementsSnapshot: z
    .array(
      z.object({
        key: z.enum(["wood", "fire", "earth", "metal", "water"]),
        label: z.string().min(1).max(8),
        count: z.number().int().min(0).max(20),
      })
    )
    .length(5),
  keywords: z.array(z.string().min(1).max(20)).min(3).max(8),
  /** Total only: 사주 설계도 3단 설명 */
  blueprint: paidBlueprintSchema.optional(),
  sections: z.array(paidSectionSchema).min(6).max(14),
  contradictions: z.array(paidContradictionSchema).max(6).optional(),
  strengthShadows: z.array(paidStrengthShadowSchema).max(5).optional(),
  /** Total consulting: domain-to-domain discovery bridges. */
  crossDomainLinks: z.array(paidCrossDomainLinkSchema).max(8).optional(),
  /** Total consulting: repeated start→reaction→result chains. */
  patternChains: z.array(paidPatternChainSchema).max(6).optional(),
  /** Total: “이런 장면, 익숙하지 않나요?” spread (6~10). */
  lifeScenes: z.array(z.string().min(1).max(220)).max(12).optional(),
  actionItems: z.array(paidActionItemSchema).min(5).max(12),
  finalSummary: paidFinalSummarySchema,
  shareableInsights: z.array(z.string().min(1).max(140)).max(8).optional(),
  possibleNextQuestions: z.array(z.string().min(1).max(180)).max(8).optional(),
  evidence: z.array(z.string().min(1)).min(1).max(16),
  disclaimer: z.string().min(1),
  /** Engine scope — report 말미 1회만 (대운·세운 등). */
  scopeNotes: z.string().min(1).max(600).optional(),
  /** Legacy optional — must not invent 대운/세운 destiny. */
  monthlyOutlook: z.array(paidMonthlyOutlookSchema).length(12).optional(),
});

export type PaidFortuneReport = z.infer<typeof paidFortuneReportSchema>;
export type PaidSectionKey = z.infer<typeof paidSectionKeySchema>;
export type PaidMonthlyOutlook = z.infer<typeof paidMonthlyOutlookSchema>;
export type PaidSection = z.infer<typeof paidSectionSchema>;
export type PaidContradiction = z.infer<typeof paidContradictionSchema>;
export type PaidStrengthShadow = z.infer<typeof paidStrengthShadowSchema>;
export type PaidActionItem = z.infer<typeof paidActionItemSchema>;
export type PaidCrossDomainLink = z.infer<typeof paidCrossDomainLinkSchema>;
export type PaidPatternChain = z.infer<typeof paidPatternChainSchema>;

export const paidFortuneReportStrictSchema = paidFortuneReportSchema;

export const MONEY_SECTION_KEYS: PaidSectionKey[] = [
  "money_v4_structure",
  "money_v4_earn_spend",
  "money_v4_blindspot",
  "money_v4_work",
  "money_v4_people",
  "money_v4_playbook",
];

export const CAREER_SECTION_KEYS: PaidSectionKey[] = [
  "career_character",
  "career_strength_work",
  "career_org_friction",
  "career_conflict",
  "career_overload",
  "career_recognition",
  "career_path_type",
  "career_change_signal",
  "career_check",
  "career_closing",
];

export const LOVE_SECTION_KEYS: PaidSectionKey[] = [
  "love_attraction",
  "love_before",
  "love_after",
  "love_expression",
  "love_needs",
  "love_fight",
  "love_breaking",
  "love_distance",
  "love_fit",
  "love_closing",
];

export const TOTAL_SECTION_KEYS: PaidSectionKey[] = [
  "total_v4_decision",
  "total_v4_relationship",
  "total_v4_work",
  "total_v4_money_link",
  "total_v4_love",
  "total_v4_stress",
  "total_v4_paradox",
  "total_v4_shadow",
  "total_v4_playbook",
];

export const REQUIRED_PAID_SECTION_KEYS: PaidSectionKey[] = [
  "personality",
  "overall",
  "money",
  "career",
  "love",
  "advice",
];

export function resolvePaidProductKind(
  slug: string | undefined | null
): PaidProductKind {
  if (!slug) return "generic";
  if (/money/i.test(slug)) return "money";
  if (/career|job|work/i.test(slug)) return "career";
  if (/love|romance/i.test(slug)) return "love";
  if (/total/i.test(slug)) return "total";
  return "generic";
}

export function requiredSectionKeysForProduct(
  slug: string | undefined | null
): PaidSectionKey[] {
  switch (resolvePaidProductKind(slug)) {
    case "money":
      return MONEY_SECTION_KEYS;
    case "career":
      return CAREER_SECTION_KEYS;
    case "love":
      return LOVE_SECTION_KEYS;
    case "total":
      return TOTAL_SECTION_KEYS;
    default:
      return REQUIRED_PAID_SECTION_KEYS;
  }
}

export function isYearTotalProductSlug(
  slug: string | undefined | null
): boolean {
  if (!slug) return false;
  return /-(total)$/i.test(slug);
}

export function targetLengthForPaidProduct(
  slug: string | undefined | null
): number {
  const kind = resolvePaidProductKind(slug);
  if (kind === "total") return 9_500;
  if (kind === "generic") return 4_500;
  return 5_800;
}

/** Domain keywords for chapter relevance checks. */
export const SECTION_DOMAIN_HINTS: Partial<Record<PaidSectionKey, string[]>> = {
  money_v4_structure: ["돈", "구조", "기준", "명리", "오행"],
  money_v4_earn_spend: ["수입", "지출", "벌", "쓰", "강점"],
  money_v4_blindspot: ["사각", "놓치", "패턴", "리스크", "돈"],
  money_v4_work: ["일", "수입", "구조", "부업", "보상"],
  money_v4_people: ["사람", "공동", "정산", "경계", "돈"],
  money_v4_playbook: ["관리", "대응", "습관", "플레이북"],
  total_v4_decision: ["결정", "판단", "수집", "번복"],
  total_v4_relationship: ["관계", "처음", "갈등", "거리"],
  total_v4_work: ["일", "환경", "강점", "지침"],
  total_v4_money_link: ["돈", "통제", "연결"],
  total_v4_love: ["사랑", "연애", "확신", "갈등"],
  total_v4_stress: ["스트레스", "회복", "쌓"],
  total_v4_paradox: ["모순", "겉", "속"],
  total_v4_shadow: ["강점", "과해", "균형"],
  total_v4_playbook: ["플레이북", "대응", "습관", "일", "관계", "자기"],
};
