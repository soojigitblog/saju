import { USER_FACING_DISCLAIMER } from "@/lib/ai/disclaimer";
import type { FortuneAiContext } from "@/lib/ai/types";
import type { FreeFortuneResult } from "@/lib/ai/schemas/free-result";
import type { PaidFortuneReport } from "@/lib/ai/schemas/paid-report";
import type { FortuneChart } from "@/lib/fortune-engine/types";
import { buildMockPaidResultDeep } from "@/lib/ai/interpreters/mock-paid-deep";

function baseEvidence(ctx: FortuneAiContext): string[] {
  const keys = [
    `dayMaster=${ctx.dayMaster.stem}`,
    `fiveElements.wood=${ctx.fiveElements.wood}`,
    `fiveElements.fire=${ctx.fiveElements.fire}`,
    `fiveElements.earth=${ctx.fiveElements.earth}`,
    `fiveElements.metal=${ctx.fiveElements.metal}`,
    `fiveElements.water=${ctx.fiveElements.water}`,
    "pillars.month.stem",
    "tenGods.month.stem",
  ];
  if (ctx.birthTimeUnknown) keys.push("hourUnknown");
  else keys.push("pillars.hour.stem");
  return keys;
}

function dominantElements(ctx: FortuneAiContext): Array<{ key: string; label: string; n: number }> {
  const map = [
    { key: "wood", label: "木", n: ctx.fiveElements.wood },
    { key: "fire", label: "火", n: ctx.fiveElements.fire },
    { key: "earth", label: "土", n: ctx.fiveElements.earth },
    { key: "metal", label: "金", n: ctx.fiveElements.metal },
    { key: "water", label: "水", n: ctx.fiveElements.water },
  ];
  return [...map].sort((a, b) => b.n - a.n);
}

function monthTenGod(ctx: FortuneAiContext): string {
  return ctx.tenGods.month.stem || ctx.tenGods.day.stem || "비겁";
}

function insightLabels(ctx: FortuneAiContext): string[] {
  const top = dominantElements(ctx)[0];
  const tg = monthTenGod(ctx);
  return [`${ctx.dayMaster.stem} 일간`, `${tg}`, `${top.label} 기운`];
}

function chartSeed(ctx: FortuneAiContext): number {
  const top = dominantElements(ctx)[0];
  const tg = monthTenGod(ctx);
  const s = `${ctx.dayMaster.stem}:${top.key}:${tg}:${ctx.gender}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Behavior-first hooks — varied structures, chart-indexed (not fixed per element only). */
function buildBehaviorHook(ctx: FortuneAiContext): string {
  const top = dominantElements(ctx)[0];
  const tg = monthTenGod(ctx);
  const idx = chartSeed(ctx) % 12;

  const pool: string[] = [
    "남의 의견은 듣지만, 마지막 답은 결국 스스로 정하는 사람",
    "귀찮다고 말하면서도, 내 이름 걸린 일은 대충 넘기기 어려운 사람",
    "사람 챙기는 건 빠른데, 내 피곤함은 늦게 알아차리는 사람",
    "시키는 일은 잘하는데, 납득 안 되면 속으로 다른 방법을 찾는 사람",
    "결정을 오래 고민하는 것 같지만, 마음속 답은 꽤 일찍 정해놓는 사람",
    "괜찮다고 해놓고 혼자 다시 생각해보는 일이 많은 사람",
    "맞추느니 내가 하는 게 빠르다고 느끼는 순간이 많은 사람",
    "남들이 넘긴 작은 오류도 한번 눈에 들어오면 지나치기 어려운 사람",
    "처음엔 맞춰주는 것 같아도, 중요한 선택은 내 기준으로 하는 사람",
    "웬만한 일엔 웃어넘기다가, 내 선 건드리면 말이 짧아지는 사람",
    "쉬고 있어도 머릿속에서는 다음 일을 정리하고 있는 사람",
    "좋아하는 사람은 챙기지만, 내 방식까지 바꾸라 하면 거리 두고 싶어지는 사람",
  ];

  // Slight chart-aware nudge (still behavior-first)
  if (top.key === "metal" && tg.includes("관")) {
    return "하기 싫다고 말하면서도, 맡은 일은 결국 끝까지 맞추려는 사람";
  }
  if (top.key === "water" && idx % 3 === 0) {
    return "분위기는 잘 읽는데, 내 속마음은 한참 뒤에야 꺼내는 사람";
  }
  if (top.key === "fire" && tg.includes("식")) {
    return "하고 싶은 말은 분명한데, 아무 데서나 다 말하지는 않는 사람";
  }
  if (top.key === "wood" && ctx.gender === "male") {
    return "겉으론 맞춰주는데, 일의 우선순위는 꽤 단호하게 정하는 사람";
  }
  if (top.key === "earth" && ctx.birthTimeUnknown) {
    return "천천히 결정하는 것 같지만, 마음속으론 이미 답을 정해둔 사람";
  }

  return pool[idx]!;
}

function buildHiddenTitle(ctx: FortuneAiContext): string {
  const titles = [
    "남 챙기는 건 빠른데 내 피곤함은 제일 늦게 알아차립니다",
    "다 맡아놓고 나중에 혼자 지치는 패턴",
    "납득이 안 되면 시키는 대로만 하기가 어렵습니다",
    "괜찮다고 넘겼다가 한 번에 선을 긋는 순간",
    "말은 짧은데 마음속 계산은 이미 끝난 상태",
    "편해지면 생각보다 솔직해지는데, 그걸 본인은 잘 모릅니다",
  ];
  return titles[chartSeed(ctx) % titles.length]!;
}

function buildOuterInner(ctx: FortuneAiContext): { outer: string; inner: string } {
  const top = dominantElements(ctx)[0];
  const variants: Record<string, { outer: string; inner: string }[]> = {
    wood: [
      {
        outer: "처음 만난 사람 앞에서는 말수를 아끼고 분위기부터 살피는 편",
        inner: "한번 중요하다고 정한 일은 생각보다 끝까지 밀어붙이는 편",
      },
      {
        outer: "겉으론 유연해 보이지만, 일의 우선순위는 꽤 분명한 편",
        inner: "혼자 있을 때 다음 선택을 미리 여러 번 시뮬레이션하는 편",
      },
    ],
    fire: [
      {
        outer: "자리 분위기를 밝게 만드는 쪽에 가깝게 보임",
        inner: "인정받지 못한다고 느끼면 갑자기 표현을 줄이는 편",
      },
      {
        outer: "관계에서는 먼저 챙기는 쪽으로 보이기 쉬움",
        inner: "정작 본인이 지칠 때는 혼자 정리하려는 편",
      },
    ],
    earth: [
      {
        outer: "신중하고 흔들림 없어 보이며, 약속을 잘 지키는 편",
        inner: "혼자 있을 때 경우의 수를 끝까지 돌려보는 편",
      },
      {
        outer: "남들이 보기엔 이미 충분해 보이는 일도 더 손보려는 편",
        inner: "속으로는 ‘이 정도면 됐나’를 한참 더 따지는 편",
      },
    ],
    metal: [
      {
        outer: "감정보다 결과와 기준을 먼저 말하는 편",
        inner: "중요한 원칙이 흔들리면 생각보다 오래 마음에 두는 편",
      },
      {
        outer: "겉으론 차갑게 보일 수 있지만, 맡은 일은 끝까지 맞추려는 편",
        inner: "정작 본인 실수는 조용히 고치려고 혼자 손대는 편",
      },
    ],
    water: [
      {
        outer: "갈등을 피하려고 먼저 분위기를 맞추는 편",
        inner: "마음에 안 드는 선택은 표정보다 행동으로 드러나는 편",
      },
      {
        outer: "유연해 보이지만, 반복되는 불공정에는 선을 긋는 편",
        inner: "혼자 있을 때 감정 정리를 오래 하는 편",
      },
    ],
  };
  const list = variants[top.key] ?? variants.earth;
  return list[chartSeed(ctx) % list.length]!;
}

/**
 * Chart-aware mock free result — Interpretation V2 Hook Quality Pass.
 */
export function buildMockFreeResult(ctx: FortuneAiContext): FreeFortuneResult {
  const hourNote = ctx.birthTimeUnknown
    ? " 출생시간이 없어 시주 관련 해석은 제외했으며, 정확도에는 제한이 있을 수 있습니다."
    : "";
  const dm = ctx.dayMaster;
  const top = dominantElements(ctx)[0];
  const weak = dominantElements(ctx)[dominantElements(ctx).length - 1];
  const tg = monthTenGod(ctx);
  const basis = insightLabels(ctx);
  const hook = buildBehaviorHook(ctx);
  const oi = buildOuterInner(ctx);

  return {
    headline: `${dm.hangul} 일간 · ${tg} 흐름`,
    hookLine: hook,
    summary:
      `${dm.stem}(${dm.hangul}) 일간과 ${top.label} 기운, 월주 ${tg}을 함께 보면 ` +
      `‘겉으로 보이는 태도’와 ‘실제 선택 방식’이 조금 다르게 작동하는 사주로 읽힐 수 있습니다. ` +
      `명리 용어를 그대로 성격 형용사로 바꾸기보다, 일·관계·결정에서 드러나는 행동 패턴으로 이해하는 편이 맞습니다.` +
      hourNote,
    keywords: [dm.hangul, tg, `${top.label}`, "행동패턴", "자기기준"],
    scores: {
      overall: 3 + (top.n >= 3 ? 1 : 0),
      money: top.key === "earth" || top.key === "metal" ? 4 : 3,
      career: top.key === "wood" || top.key === "fire" ? 4 : 3,
      love: top.key === "fire" || top.key === "water" ? 4 : 3,
    },
    outerVsInner: {
      outer: oi.outer,
      inner: oi.inner,
      insightBasis: basis,
    },
    hiddenSelf: {
      title: buildHiddenTitle(ctx),
      body:
        `${weak.label} 기운이 상대적으로 약해 보이는데도, ${tg}의 영향으로 ` +
        `겉으론 절제하는 척하면서 속으로는 기준을 분명히 붙잡는 장면이 나올 수 있습니다. ` +
        `남에게는 ‘괜찮아 보이는데’ 혼자서는 생각보다 오래 곱씹는 편일 수 있습니다.`,
      insightBasis: basis,
    },
    personality: {
      title: "말과 행동이 조금 다른 선택 방식",
      summary:
        `${dm.stem} 일간과 월주 ${tg}을 함께 보면, 남의 의견을 잘 듣는 것 같지만 ` +
        `결국 마지막 선택은 자기 기준으로 하는 편에 가깝습니다. ` +
        `사람을 처음 만날 때는 분위기를 살피지만, 편해진 사이에서는 생각보다 솔직한 말을 꺼내기도 합니다. ` +
        `그 과정에서 ‘신중하다’는 말과 ‘미룬다’는 말 사이를 오가는 모습이 보일 수 있습니다.`,
    },
    strengths: [
      "중요한 선택 전에 경우의 수를 스스로 정리해 두는 편",
      "맡은 일은 대충 넘기기보다 끝까지 맞추려는 편",
      "관계가 편해지면 생각보다 솔직한 피드백을 주는 편",
    ],
    cautionPatterns: [
      "내가 두 번 확인한 일을 다른 사람이 대충 넘기면 답답함이 커질 수 있음",
      "속기준이 센데 표현을 아끼면 주변이 거리감을 느낄 수 있음",
      "생각 정리를 혼자 오래 하다 보면 실행이 늦어 보일 수 있음",
    ],
    stressPattern:
      "평소에는 괜찮아 보여도, 스트레스가 쌓이면 말수를 줄이거나 혼자 문제를 끌어안고 정리하려 할 수 있습니다. " +
      "이때 ‘괜찮다’고 넘기기보다 작은 단위로 나눠 처리하는 편이 낫습니다.",
    currentFlow: {
      title: "기준을 정리하며 속도를 맞추는 흐름",
      summary:
        `지금은 ${dm.hangul} 일간의 강점을 ${top.label} 기운 쪽 실무·관계에 붙이는 태도가 유리해 보일 수 있습니다. ` +
        `확정 시기를 단정하긴 어렵고, 우선순위를 줄이고 작은 성과를 쌓는 선택이 도움이 될 수 있습니다.`,
    },
    previews: [
      {
        category: "money",
        preview:
          "한 번에 크게 벌기보다, 내가 관리하고 통제할 수 있는 구조를 만들었을 때 힘이 나는 편입니다. 흔들릴 때는 분위기보다 숫자와 기록을 먼저 보는 편입니다.",
        locked: true,
      },
      {
        category: "career",
        preview:
          "정해진 방식만 반복하는 일보다, 문제를 보고 더 나은 방식을 직접 만들 여지가 있을 때 능력이 살아납니다. 기준이 모호한 업무에서는 답답함을 느끼기 쉽습니다.",
        locked: true,
      },
      {
        category: "love",
        preview:
          "좋아하는 사람을 챙기는 건 자연스럽지만, 상대가 내 방식까지 바꾸려 들면 갑자기 거리를 두고 싶어질 수 있습니다. 갈등 시에는 침묵보다 짧은 확인이 필요합니다.",
        locked: true,
      },
    ],
    signatureClosing:
      `${dm.stem} 일간과 ${top.label} 기운이 만드는 핵심은 ‘드러난 태도’와 ‘실제 선택’의 간격입니다. ` +
      `그 간격을 알면, 관계도 일도 덜 오해받기 쉽습니다.`,
    evidence: baseEvidence(ctx),
    disclaimer: USER_FACING_DISCLAIMER,
  };
}

export function buildMockPaidResult(
  ctx: FortuneAiContext,
  productName: string,
  options?: { productSlug?: string; targetYear?: number; chart?: FortuneChart }
): PaidFortuneReport {
  const hourNote = ctx.birthTimeUnknown
    ? "출생시간이 확인되지 않아 시주 해석은 포함하지 않았습니다. "
    : "";
  const dm = ctx.dayMaster.hangul;
  const stem = ctx.dayMaster.stem;
  const fe = ctx.fiveElements;
  const tg = ctx.tenGods.month.stem || "비겁";
  const rootEv = baseEvidence(ctx);
  const snap = [
    { key: "wood" as const, label: "木", count: fe.wood },
    { key: "fire" as const, label: "火", count: fe.fire },
    { key: "earth" as const, label: "土", count: fe.earth },
    { key: "metal" as const, label: "金", count: fe.metal },
    { key: "water" as const, label: "水", count: fe.water },
  ];
  const slug = options?.productSlug ?? "";
  const kind = /money/i.test(slug)
    ? "money"
    : /total/i.test(slug)
      ? "total"
      : /career|job/i.test(slug)
        ? "career"
        : /love/i.test(slug)
          ? "love"
          : "generic";

  const ev = (...needles: string[]) => {
    const picked = rootEv.filter((e) =>
      needles.some((n) => e === n || e.startsWith(n + "=") || e.startsWith(n) || e.includes(n))
    );
    return (picked.length > 0 ? picked : rootEv.slice(0, 3)).slice(0, 5);
  };

  if (kind === "money" || kind === "total" || kind === "career" || kind === "love") {
    return buildMockPaidResultDeep(ctx, productName, options);
  }

  // generic fallback only
  const focusKeys = [
    "personality",
    "overall",
    "money",
    "career",
    "love",
    "advice",
  ] as const;

  const sections = focusKeys.map((key, i) => ({
    key,
    title: `${productName} · ${key}`,
    question: `${key}에서 드러나는 행동 패턴은?`,
    coreInsight: `${dm} 기준으로 ${key} 장면 ${i + 1}은 확인 후 움직이는 쪽에 가깝습니다.`,
    behaviorScenes: [
      `${key} 상황에서 범위를 정한 뒤 손을 움직이는 편이 관찰됩니다.`,
    ],
    evidenceExplanation: [
      `${stem} 일간과 월주 ${tg}를 ${key} 맥락에만 적용해 읽었습니다. (#${i + 1})`,
    ],
    evidence: ev("dayMaster", "tenGods.month"),
    takeaway: `${key}의 핵심은 기준 확인입니다.`,
  }));

  return {
    title: `${productName} · 운의결`,
    reportKind: kind === "generic" ? "generic" : kind,
    signatureStatement: `${dm} 일간의 확인 습관이 이 영역에서도 먼저 보입니다.`,
    executiveSummary: hourNote + `${productName} 심층 메모. 대운·세운은 포함하지 않았습니다.`,
    profileDashboard: [
      { label: "기질", value: "확인 후 추진" },
      { label: "강점", value: "완성도" },
      { label: "주의", value: "과검토" },
      { label: "활용", value: "범위 문장화" },
    ],
    fiveElementsSnapshot: snap,
    keywords: ["확인", "범위", "완성", "거리"],
    sections,
    actionItems: [
      { domain: "general", what: "범위 한 줄", why: "오해 감소", how: "시작 전 메모" },
      { domain: "general", what: "보류 만료", why: "과검토 방지", how: "D-day 설정" },
      { domain: "self", what: "중간 점검", why: "완성도 유지", how: "중간 1회 확인" },
      { domain: "work", what: "완료 조건", why: "재작업 감소", how: "상대에게 확인" },
      { domain: "relationship", what: "짧은 공유", why: "거리감 완화", how: "하루 안 결론" },
    ],
    finalSummary: {
      strengths: ["확인 습관", "책임 완수"],
      cautions: ["과검토", "공유 지연"],
      closingLine: `운의결: ${dm}의 이 영역도 ‘기준 확인’이 열쇠입니다.`,
    },
    evidence: rootEv,
    disclaimer: USER_FACING_DISCLAIMER,
  };
}
