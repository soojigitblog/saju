/**
 * P3.5 — Easy Korean helpers for customer-facing PDF copy.
 * Fortune engine / evidence calculation unchanged.
 */

export const CUSTOMER_SCOPE_EASY =
  "이 리포트는 태어난 순간의 사주 구조를 중심으로 분석합니다. 특정 연도·월의 길흉이나 미래 시기를 맞히는 내용은 포함하지 않습니다.";

export const CUSTOMER_SCOPE_TECH_NOTE =
  "기술 범위: 출생 명식(四柱)·오행 분포·일간 기준 십성·기둥의 천간·지지와 본기. 대운·세운·월운·용신·신강/신약·합충형파해의 확정 해석은 포함하지 않습니다.";

/** First-mention glosses for technical terms (use once per report). */
export const TERM_GLOSS: Record<string, string> = {
  일간: "내 사주의 중심이 되는 기운",
  오행: "목·화·토·금·수 다섯 기운의 구성",
  십성: "사람·일·돈을 대하는 방식을 조금 더 세분해서 보는 기준",
  겁재: "내 기준과 독립성이 어떻게 작동하는지 볼 때 참고하는 요소",
  비견: "나와 비슷한 힘이 어떻게 버티는지 볼 때 참고하는 요소",
  식신: "표현과 결과가 어떻게 흘러가는지 볼 때 참고하는 요소",
  상관: "비판·조율이 어떻게 드러나는지 볼 때 참고하는 요소",
  정재: "안정적 대가·관리 방식을 볼 때 참고하는 요소",
  편재: "유동적 기회·흐름을 볼 때 참고하는 요소",
  정관: "책임·규칙에 대한 반응을 볼 때 참고하는 요소",
  편관: "압박·긴장에 대한 반응을 볼 때 참고하는 요소",
  정인: "배움·보호가 어떻게 작동하는지 볼 때 참고하는 요소",
  편인: "혼자 정리·직관이 어떻게 작동하는지 볼 때 참고하는 요소",
  년주: "처음 만날 때 바깥으로 보이는 태도",
  월주: "사회·직장 같은 바깥 환경과 맞닿는 패턴",
  일주: "가까운 관계에서 드러나는 반응 패턴",
  시주: "일이 마무리될 때 드러나는 태도",
  일지: "가까운 장면에서 함께 읽히는 신호",
  본기: "지지 안에서 가장 먼저 읽히는 기운",
};

const TERM_ORDER = Object.keys(TERM_GLOSS).sort((a, b) => b.length - a.length);

export function glossFirstMentions(text: string, seen: Set<string>): string {
  let out = text;
  for (const term of TERM_ORDER) {
    if (seen.has(term)) continue;
    if (!out.includes(term)) continue;
    const gloss = TERM_GLOSS[term];
    if (!gloss) continue;
    // Avoid double-gloss if already parenthetical
    const already = new RegExp(`${term}\\s*[（(]`);
    if (already.test(out)) {
      seen.add(term);
      continue;
    }
    out = out.replace(term, `${term}(${gloss})`);
    seen.add(term);
  }
  return out;
}

export function glossaryCompactHtml(
  esc: (s: string) => string,
  termsUsed: string[]
): string {
  const wanted = ["일간", "오행", "십성", "겁재", "일주", "월주"];
  const list = [
    ...wanted,
    ...termsUsed.filter((t) => !wanted.includes(t) && TERM_GLOSS[t]),
  ].slice(0, 8);
  const rows = list
    .map((t) => {
      const g = TERM_GLOSS[t];
      if (!g) return "";
      return `<div class="gloss-row"><span class="t">${esc(t)}</span><span class="d">${esc(g)}</span></div>`;
    })
    .filter(Boolean)
    .join("");
  return `<div class="glossary">
  <p class="kicker">사주 용어, 이것만 알면 돼요</p>
  ${rows}
</div>`;
}

export function scopeBlockHtml(esc: (s: string) => string): string {
  return `<div class="scope-block">
  <p class="caption">${esc(CUSTOMER_SCOPE_EASY)}</p>
  <p class="caption scope-tech">${esc(CUSTOMER_SCOPE_TECH_NOTE)}</p>
</div>`;
}

/** P3.6 / final proofread: strip jargon + particle glue + hard QA. No new content. */
export function sanitizeEditorialCopy(text: string): string {
  return text
    .replace(/오행\s*우세[·\s]*희소\s*축/g, "상대적으로 강한 오행과 적은 오행")
    .replace(/오행\s*우세\s*축은/g, "두드러진 오행은")
    .replace(/오행\s*우세\s*축/g, "두드러진 오행")
    .replace(/오행\s*희소\s*축은/g, "상대적으로 적은 오행은")
    .replace(/오행\s*희소\s*축/g, "상대적으로 적은 오행")
    .replace(/오행\s*관계\s*축은/g, "오행 구성의 관계는")
    .replace(/오행\s*관계\s*축/g, "오행 구성의 관계")
    .replace(/십성\s*분포\s*축은/g, "십성 분포는")
    .replace(/십성\s*분포\s*축/g, "십성 분포")
    .replace(/월간\s*십성\s*축은/g, "월간에 나타난 십성은")
    .replace(/월간\s*십성\s*축/g, "월간에 나타난 십성")
    .replace(/년간\s*십성\s*축은/g, "년간에 나타난 십성은")
    .replace(/년간\s*십성\s*축/g, "년간에 나타난 십성")
    .replace(/강점-그림자\s*축/g, "강점이 과해질 때의 모습")
    .replace(/일간\s*축/g, "일간")
    .replace(/일주\s*축/g, "일주")
    .replace(/년주\s*축/g, "년주")
    .replace(/음양\s*축/g, "음양")
    .replace(/Evidence\s*Axis/gi, "근거")
    .replace(/서로\s*다른\s*축에서/g, "상황마다 서로 다른 이유로")
    .replace(/서로\s*다른\s*축/g, "상황마다 서로 다른 이유")
    .replace(/다른\s*축에서/g, "다른 이유로")
    .replace(/중심축으로/g, "중심으로")
    .replace(/보는\s*축입니다/g, "보는 관점입니다")
    .replace(/함께 작용하는 구조를 함께 보면/g, "함께 보면")
    .replace(/함께 작용하는 배치를 함께 보면/g, "배치를 함께 보면")
    .replace(/작용하는 구조를 함께 보면/g, "배치를 함께 보면")
    .replace(/작용하는 배치를 함께 보면/g, "배치를 함께 보면")
    .replace(/되고와/g, "되고,")
    .replace(/두드러지고와/g, "두드러지고,")
    .replace(/상대적으로 적고와/g, "상대적으로 적고,")
    .replace(/깔려 있고와/g, "깔려 있고,")
    .replace(/드러나고와/g, "드러나고,")
    .replace(/반대로\s*반대로/g, "반대로")
    .replace(/반대로\s*다만/g, "다만")
    .replace(/반대로\s*,/g, "반대로,")
    .replace(/상대에게는\s*상대는/g, "상대에게는")
    .replace(
      /일간\s*([甲乙丙丁戊己庚辛壬癸])([가-힣]{1,3})(과|와|은|는|이|가)/g,
      "$1($2) 일간$3"
    )
    .replace(/재현\s*가능한\s*품질/g, "매번 비슷한 수준의 결과를 내는 방식")
    .replace(/재현\s*가능한\s*조건/g, "같은 결과가 반복되기 쉬운 조건")
    .replace(/재현\s*가능성/g, "결과가 흔들리지 않는 정도")
    .replace(
      /목표·범위·중간에 확인할 시점이 선명할 때\s*강점이\s*(가장\s*)?재현되기\s*쉽습니다\.?/g,
      "목표·범위·중간에 확인할 시점이 선명할 때, 강점을 꾸준히 발휘하기 쉽습니다."
    )
    .replace(
      /목표·범위·중간에 확인할 시점이 선명할 때\s*강점이\s*비슷한 결과가 반복되기\s*쉽습니다\.?/g,
      "목표·범위·중간에 확인할 시점이 선명할 때, 강점을 꾸준히 발휘하기 쉽습니다."
    )
    .replace(/강점이\s*가장\s*재현되기\s*쉽습니다\.?/g, "강점을 꾸준히 발휘하기 쉽습니다.")
    .replace(/강점이\s*비슷한 결과가 반복되기\s*쉽습니다\.?/g, "강점을 꾸준히 발휘하기 쉽습니다.")
    .replace(/완성도와\s*재현성을/g, "완성도와 비슷한 수준의 결과를 꾸준히 내는 힘을")
    .replace(/재현성을/g, "비슷한 수준의 결과를 꾸준히 내는 힘을")
    .replace(/재현성/g, "비슷한 수준의 결과를 꾸준히 내는 힘")
    .replace(/재현되기\s*쉽/g, "꾸준히 발휘되기 쉽")
    .replace(
      /전문성\s*누적형·운영형·검수형\s*경로와의/g,
      "할수록 경험과 실력이 쌓이는 일·운영을 맡는 일·중간에 확인하며 완성하는 일과의"
    )
    .replace(
      /전문성\s*누적형·운영형·검수형\s*경로와/g,
      "할수록 경험과 실력이 쌓이는 일·운영을 맡는 일·중간에 확인하며 완성하는 일과"
    )
    .replace(
      /전문성\s*누적형·운영형·검수형\s*경로/g,
      "할수록 경험과 실력이 쌓이는 일·운영을 맡는 일·중간에 확인하며 완성하는 일"
    )
    .replace(/전문성\s*누적형/g, "할수록 경험과 실력이 쌓이는 일")
    .replace(/검수형\s*경로와/g, "중간에 확인하며 완성하는 일과")
    .replace(/검수형\s*경로/g, "중간에 확인하며 완성하는 일")
    .replace(/운영형/g, "운영을 맡는 일")
    .replace(/일와의/g, "일과의")
    .replace(/점\s*배치를/g, "구조를")
    .replace(/놓인\s*점\s*구조를/g, "놓인 구조를")
    .replace(/검수\s*포인트/g, "중간에 확인할 부분")
    .replace(/검수\s*지점/g, "중간에 확인할 시점")
    .replace(/설명하고\s*검수할\s*수\s*있는/g, "이해하고 확인할 수 있는")
    .replace(/설명·검수할\s*수\s*있는/g, "이해하고 확인할 수 있는")
    .replace(/검수할\s*수\s*있는/g, "확인할 수 있는")
    .replace(/·검수가\s*보이는/g, "·확인이 보이는")
    .replace(/검수가\s*보이는/g, "확인이 보이는")
    .replace(/마지막\s*검수까지/g, "마지막 확인까지")
    .replace(/산출\s*기준/g, "결과를 평가하는 기준")
    .replace(/성과·산출/g, "성과·결과")
    .replace(/대가·산출/g, "대가·결과")
    .replace(/첫\s*산출물/g, "첫 결과물")
    .replace(/구성의 관계은/g, "구성의 관계는")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Remove leading connectors when a label like "반대로" is already prefixed. */
export function stripLabeledPrefix(text: string): string {
  return text
    .replace(/^(반대로|다만|그러나|하지만)[,，]?\s*/g, "")
    .replace(/^[,，]\s*/, "")
    .trim();
}
