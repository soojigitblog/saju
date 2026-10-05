import "server-only";

import { getAIProvider } from "@/lib/ai/providers";
import { getAiModelPaid, type AiProviderName } from "@/lib/ai/config";
import { buildSystemPrompt } from "@/lib/ai/prompts/build-system-prompt";
import type { FortuneChart } from "@/lib/fortune-engine/types";
import {
  ADULT_V2_INTERPRETATION_PROMPT_VERSION,
  ADULT_V2_REPORT_VERSION,
  assertAdultV2Interpretation,
  buildAdultV2CalculationSnapshot,
  type AdultV2Interpretation,
  type AdultV2ReportData,
  adultV2InterpretationSchema,
} from "./report-data";

function evidencePayload(input: ReturnType<typeof buildAdultV2CalculationSnapshot>) {
  return {
    dayMaster: input.dayMaster,
    fiveElements: input.fiveElements,
    themes: input.themes.map(({ key, label, score, level, evidence }) => ({ key, label, score, level, evidence })),
    current: input.current,
    lifeFlow: input.lifeFlow,
    nextFiveYears: input.nextFiveYears,
  };
}

function buildAdultV2Prompt(input: {
  facts: ReturnType<typeof buildAdultV2CalculationSnapshot>;
}): string {
  return [
    "TASK: 운의결 Adult V2 유료 리포트의 문장 레이어만 생성합니다.",
    "FACT LOCK: 아래 EVIDENCE JSON에 없는 명리 사실, 사건, 타로 카드, 연도 또는 점수를 만들지 마십시오.",
    "THEME ACTIVATION은 좋고 나쁨·성공 확률이 아니라 현재 더 전면에 보이는 주제입니다.",
    "changePressure는 변화·마찰·재조정·이동성의 신호이지 불운이 아닙니다.",
    "미래를 확정하지 말고 ‘~와 관련된 선택이 중요해질 수 있습니다’, ‘~라는 주제가 상대적으로 전면에 드러납니다’처럼 제한합니다.",
    "추상어(기준·흐름·선택·조율·정리)를 반복하지 말고 돈·시간·에너지·약속·업무 방식처럼 생활 언어로 씁니다.",
    "years는 EVIDENCE의 nextFiveYears와 같은 순서·같은 연도 5개만 출력합니다. lifeFlow는 EVIDENCE의 startAge만 사용합니다.",
    "family는 가족사가 제공된 사실처럼 쓰지 말고, 가까운 사람과 생활을 나누는 방식에 관한 일반적 해석으로 제한합니다.",
    "cross reading은 이 단계에서 생성하지 않습니다. 실제 타로가 없으므로 타로 카드·메시지를 언급하지 마십시오.",
    "EVIDENCE JSON:\n" + JSON.stringify(evidencePayload(input.facts), null, 2),
  ].join("\n\n");
}

function mockInterpretation(facts: ReturnType<typeof buildAdultV2CalculationSnapshot>): AdultV2Interpretation {
  const primary = facts.themes[0]!;
  const secondary = facts.themes[1]!;
  return {
    subtitle: `${primary.label}과 ${secondary.label}이 생활의 우선순위에 드러나는 시기`,
    coreWords: [primary.label, secondary.label],
    portrait: {
      lead: `${facts.dayMaster.hanja} 일간과 현재의 테마 신호를 함께 보면, 충분히 살핀 뒤 일상에서 감당할 수 있는 방식으로 움직이려는 모습이 반복될 수 있습니다.`,
      outward: "겉으로는 무리하게 앞서기보다 상황을 살피고, 맡은 일을 차분히 이어가는 사람으로 보일 수 있습니다.",
      inward: "실제로는 시간과 에너지를 어디에 둘지 납득할 수 있어야 움직입니다. 답을 늦추는 순간에도 속으로는 다음 행동을 고르고 있을 수 있습니다.",
    },
    tendencies: {
      primary: { title: `${primary.label}을 생활에 연결하는 방식`, body: "중요한 결정을 앞두고 한 번에 답을 정하기보다, 내 일정과 관계 안에서 실제로 유지할 수 있는 선택인지 살피는 편입니다." },
      supporting: [
        { title: `${secondary.label}의 보조 신호`, body: "주변의 요청이나 역할이 늘어날 때도, 무엇부터 할지 순서를 정하면 부담을 나누어 볼 수 있습니다." },
        { title: "작게 확인하며 움직이기", body: "생각을 오래 붙들기보다 작은 약속이나 일정 하나로 먼저 시험해 보면 다음 판단이 더 분명해질 수 있습니다." },
      ],
    },
    lifeFlow: facts.lifeFlow.map((item) => ({ startAge: item.startAge, title: `${item.themes[0]?.label ?? "현재 테마"}이 드러나는 구간` })),
    years: facts.nextFiveYears.map((item) => ({
      year: item.year,
      headline: `${item.primaryTheme.label}을 일상에서 어떻게 쓸지 살피는 해`,
      keywords: [item.primaryTheme.label, item.secondaryTheme.label],
      interpretation: `돈, 시간, 관계 중 무엇에 먼저 힘을 둘지 점검해 보세요. ${item.changePressure.label}으로 나타난 신호는 속도를 정하고 약속의 범위를 확인하는 데 참고할 수 있습니다.`,
    })),
    moneyAndCareer: `${primary.label}이 강하게 드러나는 때에는 일을 더 늘리기보다, 이미 쓰고 있는 시간과 에너지가 어떤 역할로 이어지는지 살피는 편이 도움이 될 수 있습니다.`,
    relationships: {
      opening: "관계에서 중요한 것은 상대의 기대를 모두 맞추는 일이 아니라, 내가 가능한 범위와 약속의 방식을 먼저 말로 확인하는 일입니다.",
      insights: [
        { title: "관계에서 중요하게 여기는 것", body: "말보다 약속이 실제로 지켜지는 경험에서 신뢰를 느끼기 쉽습니다. 서로의 시간을 존중하는 방식이 편안함으로 이어질 수 있습니다." },
        { title: "반복하기 쉬운 관계 패턴", body: "상대의 사정을 이해하다가 내 불편을 늦게 말할 수 있습니다. 작은 불편부터 짧게 표현하는 연습이 도움이 됩니다." },
        { title: "지금 관계에서 필요한 태도", body: "도움을 주기 전에 내가 가능한 시간과 범위를 먼저 정해 보세요. 관계를 지키는 일과 모든 요청을 맡는 일은 다를 수 있습니다." },
      ],
    },
    family: "가까운 사람과 생활을 나눌 때는 각자 맡을 일과 쉬는 시간을 구체적으로 말해두는 편이 오해를 줄이는 데 도움이 될 수 있습니다.",
    actionGuide: [
      { title: "이번 주의 우선순위", body: "계속할 일 한 가지와 줄일 일 한 가지를 적고, 실제 일정표에서 자리를 바꿔 보세요." },
      { title: "관계의 범위", body: "답하기 어려운 요청에는 바로 수락하기보다 가능한 시간과 방식부터 확인해 보세요." },
      { title: "일의 기록", body: "에너지가 많이 드는 일과 남는 일을 짧게 기록하면, 다음 역할을 고를 때 참고가 됩니다." },
    ],
  };
}

/**
 * Produces one persisted V2 report contract. There is no preview/sample
 * fallback: an AI failure bubbles to the job so the report stays retryable.
 */
export async function generateAdultV2ReportData(input: {
  chart: FortuneChart;
  subject: string;
  year: number;
  provider: AiProviderName;
  model?: string;
}): Promise<AdultV2ReportData> {
  const calculation = buildAdultV2CalculationSnapshot({ chart: input.chart, year: input.year });
  const model = input.model ?? getAiModelPaid(input.provider);
  let interpretation: AdultV2Interpretation;
  let provider = input.provider;

  if (input.provider === "mock") {
    interpretation = assertAdultV2Interpretation(mockInterpretation(calculation), calculation);
  } else {
    const generated = await getAIProvider(input.provider, "paid").generateStructured({
      model,
      systemPrompt: buildSystemPrompt(),
      userPrompt: buildAdultV2Prompt({ facts: calculation }),
      schema: adultV2InterpretationSchema,
      schemaName: "adult_v2_interpretation",
      maxOutputTokens: 8000,
    });
    provider = generated.provider;
    interpretation = assertAdultV2Interpretation(generated.data, calculation);
  }

  return {
    reportVersion: ADULT_V2_REPORT_VERSION,
    kind: "adult_v2",
    subject: input.subject,
    calculation,
    interpretation,
    crossReading: {
      status: "unavailable",
      message: "사주×타로 교차리딩은 실제로 뽑은 타로 결과가 있을 때만 함께 읽을 수 있습니다.",
    },
    meta: {
      interpretationPromptVersion: ADULT_V2_INTERPRETATION_PROMPT_VERSION,
      calculationVersion: calculation.engineVersion,
      generatedAt: new Date().toISOString(),
      provider,
      model,
    },
  };
}
