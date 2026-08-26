/**
 * P3.5 — Extra customer insights for paid PDF value upgrade.
 * Derived from InterpretationContextV2 + existing PaidFortuneReport sections.
 * Does NOT change fortune engine or evidence calculation.
 */
import type { EvidenceRecord, InterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import type { PaidFortuneReport, PaidSection } from "@/lib/ai/schemas/paid-report";
import type { FortuneAiContext } from "@/lib/ai/types";

export type InsightUnit = {
  id: string;
  question: string;
  conclusion: string;
  scenes: string[];
  counter?: string;
  whyMatters?: string;
  moment?: string;
  evidenceNote?: string;
};

function sec(report: PaidFortuneReport, key: string): PaidSection | undefined {
  return report.sections.find((s) => s.key === key);
}

function descOf(v2: InterpretationContextV2 | undefined, type: EvidenceRecord["type"]) {
  return v2?.evidenceRegistry.find((e) => e.type === type)?.description;
}

function tenGodHits(v2: InterpretationContextV2 | undefined) {
  const dist = v2?.evidenceRegistry.find((e) => e.type === "TEN_GOD_DISTRIBUTION");
  const month = v2?.evidenceRegistry.find(
    (e) => e.type === "PILLAR_TEN_GOD" && e.axisId === "ten_gods_month"
  );
  return { dist: dist?.description, month: month?.description };
}

function elementLead(v2: InterpretationContextV2 | undefined, ctx: FortuneAiContext) {
  const dom = descOf(v2, "ELEMENT_DOMINANCE");
  if (dom) return dom;
  const entries = [
    ["木", ctx.fiveElements.wood],
    ["火", ctx.fiveElements.fire],
    ["土", ctx.fiveElements.earth],
    ["金", ctx.fiveElements.metal],
    ["水", ctx.fiveElements.water],
  ] as const;
  const top = [...entries].sort((a, b) => b[1] - a[1])[0]!;
  return `${top[0]} 기운`;
}

/** Soften registry descriptions for customer evidence notes (no hardcoded counts). */
function softEvidenceLead(desc: string): string {
  return desc
    .replace(
      /([木火土金水])\s*기운이\s*\d+개로\s*가장\s*두드러짐/g,
      "$1 기운이 두드러지고"
    )
    .replace(/([木火土金水])\s*기운이\s*가장\s*두드러짐/g, "$1 기운이 두드러지고")
    .replace(/([木火土金水])\s*기운이\s*\d+개로\s*가장\s*적음/g, "$1 기운이 상대적으로 적고")
    .replace(/(.+?)\s*십성이\s*(\d+)회\s*나타남/g, (_, god: string, n: string) => {
      const count = Number(n);
      const times =
        count === 2 ? "두 차례" : count === 3 ? "세 차례" : `${n}회`;
      return `${god.replace(/\s*십성$/, "")}가 ${times} 나타나는`;
    })
    .replace(/^월간\s*십성\s*(.+)$/g, "월간에 $1가 놓인")
    .replace(/^년간\s*십성\s*(.+)$/g, "년간에 $1가 놓인")
    .trim();
}

function joinSoftEvidence(a: string, b: string, tail: string): string {
  const left = softEvidenceLead(a).replace(/고$/, "고");
  const right = softEvidenceLead(b);
  if (/고$/.test(left)) {
    return `${left} ${right} 구조를 함께 보면, ${tail}`;
  }
  return `${left}과 ${right}을 함께 보면, ${tail}`;
}

function clean(s: string | undefined): string {
  return (s ?? "").replace(/\s{2,}/g, " ").trim();
}

function counterCopy(s: string | undefined): string {
  return clean(s).replace(/^(반대로|다만|그러나|하지만)\s*/g, "");
}

function pickScenes(...lists: (string[] | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const raw of list ?? []) {
      const t = clean(raw);
      if (!t || t.length < 8) continue;
      const k = t.slice(0, 22);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

export function buildMoneyValuePack(
  report: PaidFortuneReport,
  ctx: FortuneAiContext,
  v2?: InterpretationContextV2
): InsightUnit[] {
  const structure = sec(report, "money_v4_structure");
  const earn = sec(report, "money_v4_earn_spend");
  const blind = sec(report, "money_v4_blindspot");
  const work = sec(report, "money_v4_work");
  const people = sec(report, "money_v4_people");
  const play = sec(report, "money_v4_playbook");
  const dm = `${ctx.dayMaster.stem}(${ctx.dayMaster.hangul})`;
  const el = elementLead(v2, ctx);
  const { month, dist } = tenGodHits(v2);
  const hyp = v2?.behaviorHypotheses.find((h) => h.id === "money-threshold");

  return [
    {
      id: "money-core",
      question: "나는 돈을 어떤 방식으로 다루는 사람일까?",
      conclusion: clean(structure?.coreInsight) ||
        "큰 흐름은 지키려 하고, 작은 반복에서는 시야가 늦어질 수 있는 쪽에 가깝습니다.",
      scenes: pickScenes(structure?.behaviorScenes, structure?.realLifeExamples).slice(0, 3),
      counter: clean(structure?.counterPattern),
      whyMatters:
        "큰돈만 조심하면 된다고 생각하기 쉽지만, 실제로는 ‘어느 크기에서 판단이 달라지는지’를 알아야 손실이 줄어듭니다.",
      moment: clean(structure?.pullQuote || structure?.shareableLine),
      evidenceNote: `${dm} 일간과 오행 분포를 함께 보면, 돈 판단이 즉흥보다 기준 정리 쪽에 가깝습니다.`,
    },
    {
      id: "money-earn-spend",
      question: "벌 때와 쓸 때, 왜 같은 내가 다르게 움직일까?",
      conclusion: clean(earn?.coreInsight),
      scenes: pickScenes(earn?.behaviorScenes).slice(0, 4),
      counter: clean(earn?.counterPattern),
      whyMatters:
        "‘신중하다’ 한마디로 덮으면, 수입에서 편한 조건과 지출에서 막히는 조건을 놓치기 쉽습니다.",
      moment: clean(earn?.shareableLine),
      evidenceNote: month
        ? `월간에 나타난 십성(${month.replace(/^월간\s*십성\s*/, "")})과 오행 구성을 함께 보면, 벌기와 쓰기에서 속도가 갈라지는 지점이 드러납니다.`
        : "월간에 나타난 십성과 오행 구성을 함께 보면, 벌기와 쓰기에서 속도가 갈라지는 지점이 드러납니다.",
    },
    {
      id: "money-save",
      question: "돈을 모을 때 어떤 방식이 편할까?",
      conclusion:
        "한 번에 큰 목표를 외우기보다, 기준이 보이는 작은 구간을 반복해 쌓는 쪽이 더 잘 맞을 수 있습니다.",
      scenes: [
        "월·분기처럼 기간이 정해진 목표에서는 점검이 쉬워 힘이 오래 갈 수 있습니다.",
        "‘언젠가 모으자’처럼 끝이 없는 목표는 시작은 해도 중간에 시야가 흐려질 수 있습니다.",
        "자동이체처럼 결정이 이미 끝난 구조에서는 의외로 안정적으로 유지할 수 있습니다.",
      ],
      counter: "이미 허용 범위가 정해진 항목이라면, 매번 다시 고민하지 않는 편이 더 편할 수 있습니다.",
      whyMatters:
        "모으기 실패를 의지 부족으로만 보면, 정작 필요한 ‘끝과 기준이 보이는 구조’를 놓칩니다.",
      moment: "큰 결심보다, 끝나는 날짜가 있는 작은 약속이 더 잘 남을 수 있다.",
      evidenceNote: `${dm} 일간이 기준을 먼저 세우는 쪽이면, 모으기도 ‘확인 가능한 구간’에서 힘이 납니다.`,
    },
    {
      id: "money-delay",
      question: "결정을 오래 미루면 무엇이 새어 나갈까?",
      conclusion:
        clean(blind?.behaviorScenes?.[1]) ||
        "검토가 길어지면 ‘안 하는 쪽’이 더 편해져 기회비용이 생길 수 있습니다.",
      scenes: pickScenes(
        (blind?.behaviorScenes ?? []).filter(
          (s) => !/안 하는 쪽|검토가 길어지면/.test(s)
        ),
        [hyp?.counterPattern ?? ""]
      ).slice(0, 2),
      counter: clean(blind?.counterPattern),
      whyMatters:
        "미루는 동안에도 작은 반복 지출과 놓친 정리는 계속 쌓일 수 있어, ‘신중함’이 비용이 되기도 합니다.",
      moment: "결정을 미루는 날이 길어질수록, 금액보다 ‘찜찜함’이 먼저 커질 수 있다.",
      evidenceNote:
        "년간에 나타난 십성은 책임·경계 압력을, 상대적으로 적은 오행은 시야에서 늦게 잡히는 부분을 보여줍니다.",
    },
    {
      id: "money-income-structure",
      question: "수입에서 편한 구조는 어떤 쪽일까?",
      conclusion:
        clean(work?.coreInsight) ||
        "직업명보다, 결과와 대가가 설명되는 구조에서 만족도가 갈릴 수 있습니다.",
      scenes: [
        "성과·결과가 숫자로 보이는 구조에서는 힘이 오래 가기 쉽습니다.",
        "말로만 약속된 보상은 일의 만족보다 불안을 먼저 키울 수 있습니다.",
        "프로젝트처럼 시작·끝이 분명하면 집중이 잘 붙을 수 있습니다.",
        "역할은 많은데 기준이 흐리면, 수입보다 피로가 먼저 커질 수 있습니다.",
      ],
      counter: clean(work?.counterPattern),
      whyMatters:
        "‘어떤 직업이 좋다’가 아니라 ‘어떤 보상 구조에서 버틸 수 있는지’를 알아야 이직·부업 판단이 덜 흔들립니다.",
      moment: clean(work?.shareableLine),
      evidenceNote: dist
        ? joinSoftEvidence(el, dist, "수입 만족은 이미지보다 구조 선명도에 가깝습니다.")
        : undefined,
    },
    {
      id: "money-close-people",
      question: "가까운 사람과 돈이 섞일 때 무엇이 중요해질까?",
      conclusion: clean(people?.coreInsight),
      scenes: pickScenes(people?.behaviorScenes).slice(0, 3),
      counter: clean(people?.counterPattern),
      whyMatters:
        clean(people?.practicalMeaning) ||
        "사람과 돈을 한 장면으로 섞지 않고, 분담 문장을 먼저 두는 편이 덜 꼬입니다.",
      // Core insight already carries the 인색/분담 message — no near-duplicate moment.
      moment: undefined,
      evidenceNote:
        "가까운 장면의 반응과 바깥에서 보이는 태도를 나눠 보면, 돈 민감도의 위치가 더 분명해집니다.",
    },
    {
      id: "money-stress",
      question: "돈 스트레스가 커질 때 판단은 어떻게 달라질까?",
      conclusion:
        "스트레스가 커지면 큰 손실은 더 막고, 작은 편의 소비에는 의외로 느슨해질 수 있습니다.",
      scenes: [
        clean(blind?.paradoxNote) ||
          "겉으로는 절제형처럼 보여도 피로가 끼면 편의 소비에 너그러워질 수 있습니다.",
        "정산이 안 끝난 항목이 쌓이면, 새 결정보다 회피가 먼저 나올 수 있습니다.",
        "기준 문장 하나가 생기면 같은 금액도 훨씬 빨리 정리될 수 있습니다.",
      ],
      counter: "이미 규칙이 있는 반복 항목에서는 스트레스 속에서도 관리가 유지될 수 있습니다.",
      whyMatters:
        "스트레스 때의 나를 모르면, 평소 계획만으로 ‘나는 왜 이렇게 되지?’ 하고 자책하기 쉽습니다.",
      moment: "피곤한 날의 작은 예외가, 한 달 뒤엔 큰 구멍으로 보일 수 있다.",
    },
    {
      id: "money-rules",
      question: "나에게 맞는 Money Rules는?",
      conclusion: "성격 조언이 아니라, 자주 반복되는 돈 장면에 맞춘 짧은 규칙이 필요합니다.",
      scenes: pickScenes(
        play?.behaviorScenes,
        report.actionItems?.map((a) => `${a.what} — ${a.how}`),
        [
          "큰 지출 전에는 ‘허용 범위’ 한 줄을 먼저 적는다.",
          "소액 반복은 주 1회 합산 시간을 정해 둔다.",
          "공동비용은 금액보다 분담 문장을 먼저 합의한다.",
          "수입은 대가·결과가 설명되는 구조를 우선한다.",
          "결정을 미룰 때는 ‘언제까지 보류할지’ 날짜를 붙인다.",
        ]
      ).slice(0, 5),
      whyMatters: "규칙이 구체적이어야 ‘다음에 또’가 줄어듭니다.",
      moment: "좋은 습관 하나보다, 반복 장면에 맞는 규칙 다섯 개가 더 쓸모 있다.",
    },
  ].filter((u) => u.conclusion);
}

export function buildCareerValuePack(
  report: PaidFortuneReport,
  ctx: FortuneAiContext,
  v2?: InterpretationContextV2
): InsightUnit[] {
  const strength = sec(report, "career_strength_work");
  const friction = sec(report, "career_org_friction");
  const character = sec(report, "career_character");
  const conflict = sec(report, "career_conflict");
  const overload = sec(report, "career_overload");
  const recognition = sec(report, "career_recognition");
  const change = sec(report, "career_change_signal");
  const path = sec(report, "career_path_type");
  const check = sec(report, "career_check");
  const closing = sec(report, "career_closing");
  const dm = `${ctx.dayMaster.stem}(${ctx.dayMaster.hangul})`;
  const el = elementLead(v2, ctx);
  const { month } = tenGodHits(v2);
  const hyp = v2?.behaviorHypotheses.find((h) => h.id === "work-environment");

  return [
    {
      id: "career-env",
      question: "어떤 환경에서 내 강점이 살아날까?",
      conclusion: clean(strength?.coreInsight),
      scenes: pickScenes(strength?.behaviorScenes, hyp?.realLifeExamples).slice(0, 3),
      counter: clean(friction?.coreInsight),
      whyMatters:
        "직업명보다 ‘목표·범위·검수가 보이는지’가 성과와 피로를 가르는 경우가 많습니다.",
      moment: clean(strength?.shareableLine || report.shareableInsights?.[0]),
      evidenceNote: month
        ? joinSoftEvidence(el, month, "구조가 선명할 때 힘이 안정적으로 쓰입니다.")
        : undefined,
    },
    {
      id: "career-start",
      question: "일을 시작할 때 나는 어떤 패턴일까?",
      conclusion:
        clean(character?.coreInsight) ||
        "새 업무에서는 속도보다 기준을 먼저 세우려는 쪽에 가깝습니다.",
      scenes: pickScenes(character?.behaviorScenes, [
        "시작 전에 범위·완료 조건을 확인하려 할 수 있습니다.",
        "기준이 없으면 손대기보다 자료를 더 모으는 식으로 나타날 수 있습니다.",
        "첫 결과물이 보이면 그다음부터 속도가 붙을 수 있습니다.",
      ]).slice(0, 3),
      counter: "이미 템플릿과 중간에 확인할 시점이 있으면 생각보다 빠르게 착수할 수 있습니다.",
      whyMatters: "시작이 느린 것을 게으름으로만 보면, 필요한 ‘기준 세우기 시간’을 빼앗기기 쉽습니다.",
      moment: "첫 회의에서 질문이 많은 건, 관심이 없어서가 아니라 기준을 찾는 중일 수 있다.",
      evidenceNote: `${dm} 일간은 업무에서 먼저 기준을 세우고 결과를 확인하려는 출발점이 됩니다.`,
    },
    {
      id: "career-tangled",
      question: "업무가 꼬였을 때 나는 어떻게 반응할까?",
      conclusion:
        "바로 밀어붙이기보다, 먼저 어디가 흐려졌는지 정리하려는 반응이 나오기 쉽습니다.",
      scenes: pickScenes(
        (conflict?.behaviorScenes ?? []).filter(
          (s) => !/자리에서는 듣|문장이 짧아지고 경계/.test(s)
        ),
        [
          "역할이 겹치면 스스로 더 많이 떠안아 상황을 수습하려 할 수 있습니다.",
          "말이 길어지기보다 메모와 체크리스트로 먼저 정리하려 할 수 있습니다.",
        ]
      ).slice(0, 3),
      counter: clean(conflict?.counterPattern),
      whyMatters: "꼬인 순간을 알면, 혼자 수습하다 과부하로 가는 선을 미리 그을 수 있습니다.",
      moment: "일이 꼬이면 말수가 줄고, 메모와 체크리스트가 늘어날 수 있다.",
    },
    {
      id: "career-boss",
      question: "상사의 지시 방식에 따라 내 성과는 어떻게 달라질까?",
      conclusion:
        "방향만 던지고 기준이 없는 지시보다, 완료 조건이 보이는 지시에서 강점이 다시 살아나기 쉽습니다.",
      scenes: [
        "‘알아서 해’만 반복되면 확인 노동이 늘고 속도가 떨어질 수 있습니다.",
        "중간에 확인할 시점이 있으면 수정 비용이 줄고 완성도가 올라갈 수 있습니다.",
        "갑작스런 우선순위 변경이 잦으면, 일의 만족보다 피로가 먼저 쌓일 수 있습니다.",
      ],
      counter: "지시가 짧아도 기준 문서가 있으면 같은 상사와도 훨씬 편해질 수 있습니다.",
      whyMatters: "상사 탓만 하기보다, ‘어떤 지시 형태에서 내가 망가지는지’를 알아야 협상이 됩니다.",
      moment: "좋은 상사는 친절한 사람보다, 완료 조건을 같이 적어 주는 사람일 수 있다.",
    },
    {
      id: "career-collab",
      question: "동료와 협업할 때 어떤 방식이 편할까?",
      conclusion:
        "역할과 결과를 평가하는 기준이 나뉜 협업에서 갈등이 덜 생기기 쉽습니다.",
      scenes: [
        "누가 무엇을 끝까지 보는지가 보이면 속도가 붙을 수 있습니다.",
        "책임 경계가 흐리면 좋은 의도에도 중복 확인이 늘 수 있습니다.",
        "짧은 합의 문장 하나가 있으면 회의가 길어지는 날이 줄어들 수 있습니다.",
      ],
      counter: "신뢰가 쌓인 팀에서는 짧은 합의만으로도 빠르게 움직일 수 있습니다.",
      whyMatters: "협업 스트레스를 ‘사람 문제’로만 보면, 구조로 풀 수 있는 지점을 놓칩니다.",
      moment: "회의가 길어지는 날, 사실은 사람보다 ‘기준 문장’이 부족했을 수 있다.",
    },
    {
      id: "career-recognition",
      question: "나는 어떤 방식으로 인정받고 싶어 할까?",
      conclusion: clean(recognition?.coreInsight),
      scenes: pickScenes(recognition?.behaviorScenes).slice(0, 3),
      counter: counterCopy(recognition?.counterPattern),
      whyMatters: "인정이 안 오면 이탈 신호가 커질 수 있어, 원하는 피드백 형태를 아는 게 중요합니다.",
      moment: clean(recognition?.shareableLine),
    },
    {
      id: "career-takeon",
      question: "일을 떠맡게 되는 순간은 언제일까?",
      conclusion:
        clean(overload?.coreInsight) ||
        "역할이 비거나 기준이 흐릴 때, 확인과 책임을 스스로 더 붙들며 과부하가 시작될 수 있습니다.",
      scenes: pickScenes(overload?.behaviorScenes, friction?.behaviorScenes).slice(0, 3),
      counter: clean(overload?.counterPattern),
      whyMatters: "떠맡음을 ‘성실함’으로만 칭찬하면, 번아웃 직전까지 신호를 놓치기 쉽습니다.",
      moment: "‘내가 하면 빠르니까’가 반복되면, 어느 날 갑자기 일이 싫어질 수 있다.",
      evidenceNote: `${dm} 일간의 확인 성향이, 빈자리를 메우는 쪽으로 과하게 쓰일 수 있습니다.`,
    },
    {
      id: "career-hate-vs-fit",
      question: "‘일이 싫은 것’과 ‘환경이 안 맞는 것’은 어떻게 다를까?",
      conclusion:
        clean(change?.coreInsight) ||
        "일 자체보다 기준·보상·역할이 흐려질 때 이동 욕구가 커지는 쪽에 가깝습니다.",
      scenes: pickScenes(change?.behaviorScenes, path?.behaviorScenes, [
        "같은 업무라도 검수와 책임이 정리되면 다시 버틸 수 있습니다.",
        "역할만 늘고 인정·보상이 안 보이면 ‘일 혐오’처럼 느껴질 수 있습니다.",
      ]).slice(0, 3),
      counter: clean(change?.counterPattern || path?.counterPattern),
      whyMatters: "퇴사·이직 전에 원인을 나누면, 바꾸어야 할 것이 ‘일’인지 ‘구조’인지가 분명해집니다.",
      moment: clean(change?.shareableLine),
    },
    {
      id: "career-org",
      question: "오래 버틸 수 있는 조직 조건은 무엇일까?",
      conclusion:
        clean(path?.coreInsight) ||
        "목표·권한·피드백 루프가 설명되는 조직에서 힘이 오래 가기 쉽습니다.",
      scenes: pickScenes(path?.behaviorScenes, check?.behaviorScenes, closing?.behaviorScenes, [
        "중간 결과물을 공유할 채널이 있으면 혼자 과검토가 줄어들 수 있습니다.",
        "우선순위가 매주 바뀌면 실력과 무관하게 소진이 빨라질 수 있습니다.",
      ]).slice(0, 3),
      counter: "작아도 기준이 선명한 팀에서는 큰 조직보다 더 오래 남을 수 있습니다.",
      whyMatters: "‘좋은 회사’ 감보다, 내가 같은 결과를 반복하기 쉬운 조건을 알아야 이직 실패가 줄어듭니다.",
      moment: clean(check?.shareableLine || closing?.shareableLine),
    },
  ].filter((u) => u.conclusion);
}

export function buildLoveValuePack(
  report: PaidFortuneReport,
  ctx: FortuneAiContext,
  v2?: InterpretationContextV2
): InsightUnit[] {
  const before = sec(report, "love_before");
  const after = sec(report, "love_after");
  const attraction = sec(report, "love_attraction");
  const expression = sec(report, "love_expression");
  const needs = sec(report, "love_needs");
  const fight = sec(report, "love_fight");
  const distance = sec(report, "love_distance");
  const fit = sec(report, "love_fit");
  const breaking = sec(report, "love_breaking");
  const closing = sec(report, "love_closing");
  const dm = `${ctx.dayMaster.stem}(${ctx.dayMaster.hangul})`;
  const dayPillar = descOf(v2, "PILLAR_SYMBOL");
  const hyp = v2?.behaviorHypotheses.find((h) => h.id === "love-distance");

  return [
    {
      id: "love-before-after",
      question: "확신 전과 후에 나는 왜 달라 보일까?",
      conclusion: `${clean(before?.coreInsight)} / ${clean(after?.coreInsight)}`.replace(/^ \/ | \/ $/g, ""),
      scenes: pickScenes(before?.behaviorScenes, after?.behaviorScenes).slice(0, 4),
      counter: clean(before?.counterPattern || after?.counterPattern),
      whyMatters: "속도 차이를 모르면, 상대는 ‘관심 없음’으로, 나는 ‘배려’로 서로 다른 해석을 합니다.",
      moment: clean(before?.shareableLine || report.shareableInsights?.[0]),
      evidenceNote: dayPillar
        ? `${dm} 일간과 ${dayPillar} 배치를 함께 보면, 가까워질수록 속도와 표현이 달라지는 지점이 보입니다.`
        : undefined,
    },
    {
      id: "love-open",
      question: "어떤 순간에 마음이 열리기 쉬울까?",
      conclusion:
        clean(attraction?.coreInsight) ||
        "말의 화려함보다 태도의 일관성이 보일 때 마음이 열리기 쉽습니다.",
      scenes: pickScenes(attraction?.behaviorScenes, [
        "약속이 지켜지는 장면이 반복되면 경계가 누그러질 수 있습니다.",
        "서두르는 고백보다, 작은 챙김이 쌓일 때 확신이 붙을 수 있습니다.",
      ]).slice(0, 3),
      counter: "처음부터 너무 깊어지려는 압력은 오히려 닫히게 만들 수 있습니다.",
      whyMatters: "열리는 조건을 알면, 억지로 속도를 맞추다 지치는 일을 줄일 수 있습니다.",
      moment: clean(attraction?.shareableLine),
    },
    {
      id: "love-check",
      question: "상대의 마음을 어떻게 확인하려 할까?",
      conclusion:
        "직접 추궁하기보다, 행동의 일관성과 약속 이행을 보며 확신을 쌓는 쪽에 가깝습니다.",
      scenes: pickScenes(
        (needs?.behaviorScenes ?? []).filter((s) => !/좋아함보다 신뢰/.test(s)),
        before?.behaviorScenes,
        [
          "말보다 ‘다음에 어떻게 했는지’를 더 볼 수 있습니다.",
          "확신이 생기기 전에는 질문을 아낄 수 있습니다.",
        ]
      ).slice(0, 3),
      counter: "관계가 정의된 뒤에는 확인보다 챙김이 먼저 나갈 수 있습니다.",
      whyMatters: "확인 방식을 모르면, 상대는 차갑다고 느끼고 나는 신중하다고 느낍니다.",
      moment:
        "호감이 있어도 확신 전에는 표현 속도가 상대보다 느리게 보일 수 있다.",
    },
    {
      id: "love-quiet",
      question: "좋아해도 티가 덜 날 수 있는 순간은?",
      conclusion:
        clean(expression?.coreInsight) ||
        "말로 길게 설명하기보다 실질적인 준비로 마음이 드러날 수 있습니다.",
      scenes: pickScenes(expression?.behaviorScenes).slice(0, 3),
      counter: clean(expression?.counterPattern),
      whyMatters: "표현이 적은 것을 ‘무관심’으로만 읽으면 오해가 커집니다.",
      moment: "좋아할수록 말수가 줄고, 대신 현실적인 준비가 늘 수 있다.",
    },
    {
      id: "love-felt",
      question: "사랑받는다고 느끼기 쉬운 방식은?",
      conclusion: clean(needs?.coreInsight),
      scenes: pickScenes(needs?.behaviorScenes, after?.behaviorScenes).slice(0, 3),
      counter: clean(needs?.counterPattern),
      whyMatters: "원하는 온기가 무엇인지 알아야, 상대에게 ‘이렇게 해줘’를 구체적으로 말할 수 있습니다.",
      moment: clean(needs?.shareableLine),
    },
    {
      id: "love-hurt",
      question: "서운함은 어떻게 쌓일까?",
      // Page 4: accumulation only — recovery lines belong on Page 5.
      conclusion:
        "한 번의 사건보다, 같은 패턴이 반복될 때 서운함이 거리로 바뀔 수 있습니다.",
      scenes: pickScenes(
        breaking?.behaviorScenes,
        needs?.behaviorScenes,
        fight?.behaviorScenes,
        [
          "불편한 장면을 바로 정리하지 못하면 속으로 거리가 생길 수 있습니다.",
        ]
      )
        .filter((s) => !/다시 가까워질|사과의 크기|재발 방지/.test(s))
        .slice(0, 3),
      counter: clean(distance?.counterPattern),
      whyMatters: "쌓이는 과정을 알면, 폭발 전에 ‘지금 무엇이 반복되는지’를 말할 수 있습니다.",
      moment: "갑자기 차가워진 게 아니라, 작은 서운함이 정리되지 않고 쌓였을 수 있다.",
    },
    {
      id: "love-fight",
      question: "갈등에서 가장 주의할 패턴은?",
      conclusion: clean(fight?.coreInsight || hyp?.coreInterpretation),
      scenes: pickScenes(fight?.behaviorScenes, hyp?.realLifeExamples).slice(0, 3),
      counter: clean(fight?.counterPattern || hyp?.counterPattern),
      whyMatters: "갈등 패턴을 알면, 상대를 몰아붙이기 전에 정리 시간을 요청할 수 있습니다.",
      moment: clean(fight?.shareableLine),
      evidenceNote: "월간에 나타난 십성 배치는 확인·거리 조절로 먼저 반응하는 쪽과 맞닿을 수 있습니다.",
    },
    {
      id: "love-resolve",
      question: "먼저 풀려고 할까, 시간을 가질까?",
      conclusion:
        "바로 풀기보다 내부에서 정리한 뒤 대화를 재개하는 쪽에 가깝습니다.",
      scenes: pickScenes(
        // Page 5 Primary: recovery consistency line stays here only.
        distance?.behaviorScenes,
        (fit?.behaviorScenes ?? []).filter(
          (s) => !/표현 과다보다 일관된 행동/.test(s)
        ),
        [
          "시간이 필요하다고 말하기보다, 말수가 줄어 보일 수 있습니다.",
          "같은 일이 반복되지 않을 근거가 보이면 회복이 시작될 수 있습니다.",
        ]
      ).slice(0, 3),
      counter: "상대가 기준을 먼저 정리해 주면, 생각보다 빨리 돌아올 수 있습니다.",
      whyMatters: "회복 템포를 공유하지 않으면, 시간은 ‘무시’로 읽히기 쉽습니다.",
      // Broad post-conflict pattern — not a specific contact habit.
      moment:
        "갈등 뒤에는 바로 설명하기보다 정리할 시간을 가져, 상대가 관심 없음으로 오해하기 쉽다.",
    },
    {
      id: "love-long",
      question: "관계가 오래될수록 달라지는 부분은?",
      // Page 3 already owns 확신 전·후 / 말보다 행동 — here only long-term & break outcomes.
      conclusion:
        clean(breaking?.coreInsight) ||
        clean(closing?.behaviorScenes?.[0]) ||
        "한 번의 감정보다, 신뢰를 정리하는 시간이 길어질수록 관계 회복 가능성도 함께 줄 수 있습니다.",
      scenes: pickScenes(
        breaking?.behaviorScenes,
        closing?.behaviorScenes,
        distance?.behaviorScenes
      )
        .filter(
          (s) =>
            !/확신 전|확신 후|말보다 행동|실질적 챙김|다시 가까워질|사과의 크기|재발 방지/.test(
              s
            )
        )
        .slice(0, 3),
      counter: clean(breaking?.counterPattern || closing?.counterPattern),
      whyMatters: "초반 모습만으로 사람을 규정하면, 오래 갈수록의 변화를 놓칩니다.",
      moment: clean(breaking?.shareableLine || closing?.shareableLine),
    },
    {
      id: "love-misread",
      question: "상대에게 자주 오해받을 수 있는 지점은?",
      conclusion:
        report.contradictions?.[0]
          ? `${report.contradictions[0].poleA}와 ${report.contradictions[0].poleB}가 한 사람 안에서 같이 작동해 오해가 생기기 쉽습니다.`
          : "관심 없음처럼 보이는 속도와, 실제로는 기준을 확인하는 속도가 달라 오해가 생기기 쉽습니다.",
      scenes: pickScenes(
        report.contradictions?.map((c) => c.howItShows),
        breaking?.behaviorScenes,
        [report.contradictions?.[0]?.downside ?? ""]
      ).slice(0, 3),
      counter: clean(breaking?.counterPattern || fit?.counterPattern),
      whyMatters: "오해 지점을 미리 말하면, 상대가 ‘나를 떠난 것’으로 읽지 않게 도와줄 수 있습니다.",
      moment: report.contradictions?.[0]
        ? `${report.contradictions[0].poleA} · ${report.contradictions[0].poleB} — 둘 다 나일 수 있다.`
        : undefined,
    },
  ].filter((u) => u.conclusion);
}

export function buildTotalValuePack(
  report: PaidFortuneReport,
  ctx: FortuneAiContext,
  v2?: InterpretationContextV2
): {
  moments: string[];
  unknownPatterns: InsightUnit[];
  outerInner: { outer: string; inner: string }[];
  situations: InsightUnit[];
  usage: InsightUnit[];
  counters: InsightUnit[];
} {
  const decision = sec(report, "total_v4_decision");
  const stress = sec(report, "total_v4_stress");
  const relation = sec(report, "total_v4_relationship");
  const work = sec(report, "total_v4_work");
  const money = sec(report, "total_v4_money_link");
  const love = sec(report, "total_v4_love");
  const paradox = sec(report, "total_v4_paradox");
  const shadow = sec(report, "total_v4_shadow");
  const dm = `${ctx.dayMaster.stem}(${ctx.dayMaster.hangul})`;
  void dm;

  const moments = pickScenes(
    report.shareableInsights,
    report.sections.flatMap((s) => [s.shareableLine, s.pullQuote].filter(Boolean) as string[]),
    report.contradictions?.map((c) => `${c.poleA} · ${c.poleB} — 한 사람 안에서 같이 작동할 수 있다.`),
    [
      "재촉받을수록 바로 결론보다 자료를 더 모을 수 있다.",
      "가까운 사이일수록 처음보다 경계가 선명해질 수 있다.",
      "피곤한 날의 작은 예외가 한 달 뒤 큰 구멍으로 보일 수 있다.",
      "일이 꼬이면 말수가 줄고 체크리스트가 늘어날 수 있다.",
      "확신이 생기기 전엔 호의가 잘 안 보일 수 있다.",
    ]
  ).slice(0, 10);

  const unknownPatterns: InsightUnit[] = [
    {
      id: "t-pattern-decision",
      question: "나는 왜 어떤 날은 빠르고 어떤 날은 느릴까?",
      conclusion: clean(decision?.coreInsight),
      scenes: pickScenes(decision?.behaviorScenes).slice(0, 1),
      counter: clean(decision?.counterPattern),
      whyMatters: "속도를 성격 탓으로만 보면, 수집과 확정 단계를 설계하지 못합니다.",
      moment: clean(decision?.shareableLine),
    },
    {
      id: "t-pattern-stress",
      question: "스트레스는 어디서 쌓이고 어떻게 풀릴까?",
      conclusion: clean(stress?.coreInsight),
      scenes: pickScenes(stress?.behaviorScenes).slice(0, 1),
      counter: clean(stress?.counterPattern),
      whyMatters: "회복 방식을 모르면, 정리가 도움이 될 때와 회피가 될 때를 구분하지 못합니다.",
      moment: clean(stress?.shareableLine),
    },
    {
      id: "t-pattern-shadow",
      question: "내 강점이 과해지면 무엇이 될까?",
      conclusion:
        clean(shadow?.coreInsight) ||
        (report.strengthShadows?.[0]
          ? `${report.strengthShadows[0]!.strength}이 과해지면 ${report.strengthShadows[0]!.overuse}`
          : "확인·정리가 과해지면 과부하로 이어질 수 있습니다."),
      scenes: pickScenes(
        report.strengthShadows?.map((s) => `${s.strength} → ${s.overuse}`),
        shadow?.behaviorScenes
      ).slice(0, 3),
      counter: report.strengthShadows?.[0]?.balancePoint,
      whyMatters: "강점을 끄지 않고도, 과사용 지점만 조절하면 됩니다.",
      moment: report.strengthShadows?.[0]
        ? `${report.strengthShadows[0].strength}이 빛나는 만큼, 그림자도 같이 온다.`
        : undefined,
    },
  ].filter((u) => u.conclusion);

  const outerInner = [
    {
      outer: "처음엔 예의 바르고 조율해 보이는 편",
      inner: clean(relation?.behaviorScenes?.[1]) || "가까워질수록 경계와 기준이 선명해질 수 있습니다.",
    },
    {
      outer: "신중하고 확인이 많은 사람처럼 보일 수 있음",
      inner: "자료를 모으는 시간과 결론을 내리는 시간이 따로 움직여, 겉으로는 ‘느린 신중’으로만 읽히기 쉽습니다.",
    },
    {
      outer: "일에서는 완성도 높은 실무형으로 읽히기 쉬움",
      inner: "환경의 선명도에 따라 같은 일도 전혀 다른 피로도가 됩니다.",
    },
    ...(report.contradictions ?? []).slice(0, 1).map((c) => {
      const downside = clean(c.downside ?? c.howItShows).replace(/^상대는\s*/, "");
      return {
        outer: clean(c.poleA),
        inner: `${clean(c.poleB)} — 상대에게는 ${downside}`,
      };
    }),
  ].slice(0, 4);

  const situations: InsightUnit[] = [
    {
      id: "sit-usual",
      question: "평소의 나는?",
      conclusion:
        clean(relation?.coreInsight) ||
        "처음엔 예의와 경청이 먼저일 수 있습니다.",
      scenes: pickScenes(relation?.behaviorScenes).slice(0, 2),
    },
    {
      id: "sit-pressure",
      question: "압박받을 때의 나는?",
      // Leftover stress scenes (Page 2 keeps only the first) — pressure vs usual difference.
      conclusion:
        clean(stress?.behaviorScenes?.[1]) ||
        "쌓이면 말수가 줄고 혼자 분류하는 쪽으로 흐를 수 있습니다.",
      scenes: pickScenes([stress?.behaviorScenes?.[2] ?? ""]).slice(0, 2),
      counter: "기준이 보이면 같은 압박에서도 훨씬 차분히 처리할 수 있습니다.",
    },
    {
      id: "sit-familiar",
      question: "익숙한 환경에서의 나는?",
      // Page 8 owns work coreInsight — here only familiar-env difference.
      conclusion:
        clean(work?.behaviorScenes?.[0]) ||
        "역할과 기준이 보이면 강점이 다시 살아나기 쉽습니다.",
      scenes: pickScenes(work?.behaviorScenes?.slice(1)).slice(0, 2),
    },
    {
      id: "sit-new",
      question: "낯선 환경에서의 나는?",
      conclusion: "먼저 관찰하고 기준을 세운 뒤 속도를 올리는 쪽에 가깝습니다.",
      scenes: [
        "초반에는 말보다 파악이 앞설 수 있습니다.",
        "규칙이 보이기 시작하면 태도가 분명해질 수 있습니다.",
      ],
      counter: "안내와 완료 조건이 있으면 낯선 자리에서도 빨리 안착할 수 있습니다.",
    },
    {
      id: "sit-close",
      question: "관계가 깊어진 뒤의 나는?",
      conclusion: clean(love?.coreInsight || relation?.behaviorScenes?.[1]),
      scenes: pickScenes(love?.behaviorScenes, relation?.behaviorScenes?.slice(1)).slice(0, 2),
      counter: clean(love?.counterPattern || relation?.counterPattern),
    },
  ].filter((u) => u.conclusion);

  const usage: InsightUnit[] = [
    {
      id: "use-relation",
      question: "관계에서 지금 바로 써먹을 한 가지?",
      conclusion:
        clean(relation?.practicalMeaning) ||
        clean(relation?.actionOptions?.[0]) ||
        "가까워질수록 맞춰주기보다, 가능한 범위와 선을 먼저 말로 정리해 두는 편이 덜 꼬입니다.",
      scenes: pickScenes(relation?.actionOptions, report.actionItems?.filter((a) => /관계|사람|거리/.test(`${a.what}${a.how}`)).map((a) => `${a.what} — ${a.how}`)).slice(0, 2),
      whyMatters: "관계 설명보다, 오늘 쓸 문장 하나가 더 도움이 됩니다.",
      counter: counterCopy(relation?.counterPattern),
    },
    {
      id: "use-work",
      question: "일에서 지금 바로 써먹을 한 가지?",
      conclusion:
        clean(work?.practicalMeaning) ||
        clean(work?.actionOptions?.[0]) ||
        "새 일을 받을 때 완료 조건 한 줄을 먼저 확인하고 시작하는 편이 힘이 덜 셉니다.",
      scenes: pickScenes(work?.actionOptions, report.actionItems?.filter((a) => /일|업무|완료|위임/.test(`${a.what}${a.how}`)).map((a) => `${a.what} — ${a.how}`)).slice(0, 2),
      whyMatters: "일 성향 설명보다, 반복되는 장면의 짧은 규칙이 더 쓸모 있습니다.",
      counter: counterCopy(work?.counterPattern),
    },
    {
      id: "use-money",
      question: "돈에서 지금 바로 써먹을 한 가지?",
      conclusion:
        clean(money?.practicalMeaning) ||
        clean(money?.actionOptions?.[0]) ||
        "큰 지출 전에는 허용 범위 한 줄을, 소액 반복은 주 1회 합산 시간을 정해 둡니다.",
      scenes: pickScenes(money?.actionOptions, report.actionItems?.filter((a) => /돈|지출|정산|허용/.test(`${a.what}${a.how}`)).map((a) => `${a.what} — ${a.how}`)).slice(0, 2),
      whyMatters: "돈 성향 칭찬보다, 새어 나가는 장면에 맞춘 규칙이 필요합니다.",
      counter: counterCopy(money?.counterPattern),
    },
    {
      id: "use-stress",
      question: "스트레스가 올 때 바로 써먹을 한 가지?",
      conclusion:
        clean(stress?.practicalMeaning) ||
        clean(stress?.actionOptions?.[0]) ||
        "정리가 회복인지 회피인지 가르려면, ‘지금 끝낼 한 가지’만 정해 두는 편이 낫습니다.",
      scenes: pickScenes(stress?.actionOptions, stress?.behaviorScenes).slice(0, 2),
      whyMatters: "스트레스 설명보다, 쌓이기 전에 끊는 짧은 행동이 필요합니다.",
      counter: counterCopy(stress?.counterPattern),
    },
  ].filter((u) => u.conclusion);

  const counters: InsightUnit[] = [
    {
      id: "c-paradox",
      question: "두 힘이 충돌하면 무엇이 생길까?",
      // Page 9 bottom: collision *result* only — do not reuse contradiction downside copy.
      conclusion:
        clean(paradox?.coreInsight) ||
        "두 힘이 겹치면, 겉으로 맞추는 속도와 속으로 확정하는 속도가 어긋나 오해가 커질 수 있습니다.",
      scenes: pickScenes(paradox?.behaviorScenes).slice(0, 3),
      counter: report.contradictions?.[0]?.upside,
      whyMatters: "모순을 결함이 아니라 ‘조건에 따른 전환’으로 보면, 오해를 미리 설명할 수 있습니다.",
    },
    {
      id: "c-misread",
      question: "타인이 나를 어떻게 오해하기 쉬울까?",
      conclusion:
        clean(paradox?.behaviorScenes?.[0]) ||
        "맞춰 주는 듯 보여도 결론은 혼자 정리해, ‘갑자기 단호해졌다’로 읽힐 수 있습니다.",
      scenes: pickScenes(
        report.contradictions?.map((c) => c.howItShows),
        paradox?.behaviorScenes?.slice(1)
      ).slice(0, 2),
      whyMatters: "오해 지점을 알면, 속도 차이를 성격 문제로 몰아가지 않게 됩니다.",
    },
  ].filter((u) => u.conclusion);

  return { moments, unknownPatterns, outerInner, situations, usage, counters };
}

export function countValueMetrics(units: InsightUnit[]) {
  const questions = new Set(units.map((u) => u.question).filter(Boolean));
  const discoveries = units.filter((u) => u.conclusion && u.whyMatters).length;
  const moments = units.filter((u) => u.moment || (u.scenes?.length ?? 0) > 0).length;
  const behaviorMoments = units.reduce((n, u) => n + (u.scenes?.length ?? 0) + (u.moment ? 1 : 0), 0);
  const counters = units.filter((u) => u.counter).length;
  return {
    questionsAnswered: questions.size,
    strongDiscoveries: discoveries,
    behaviorMoments,
    counterPatterns: counters,
    momentLines: moments,
  };
}
