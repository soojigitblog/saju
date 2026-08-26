/**
 * PHASE P3.2 / P3.3 — Flow editorial PDF HTML.
 * Content engine unchanged. Live Gemini not used.
 * P3.3: release fixes only (particles, saju signals, money dedupe, polish).
 */
import type {
  EvidenceRecord,
  InterpretationContextV2,
} from "@/lib/ai/interpretation-context-v2";
import type { PaidFortuneReport, PaidSection } from "@/lib/ai/schemas/paid-report";
import type { FortuneAiContext } from "@/lib/ai/types";
import {
  glossaryCompactHtml,
  glossFirstMentions,
  sanitizeEditorialCopy,
  scopeBlockHtml,
  stripLabeledPrefix,
} from "@/lib/report/v5/easy-korean";
import {
  buildCareerValuePack,
  buildLoveValuePack,
  buildMoneyValuePack,
  buildTotalValuePack,
  type InsightUnit,
} from "@/lib/report/v5/easy-value-pack";
import { v5BaseCss, v5FontsHead } from "@/lib/report/v5/css";
import { coverTitleForProduct, KNOWN_PARTICLE_ERRORS } from "@/lib/report/v5/tokens";

function esc(s: string | undefined | null) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanCustomerText(s: string): string {
  return sanitizeEditorialCopy(
    s
      .replace(/이 장은[^.。]*예언하지 않습니다[^.。]*[。.…]?/g, "")
      .replace(/재물\s*focused\s*report[^。.…]*/gi, "")
      .replace(/이 리포트를 읽고 나면[^。.…]*/g, "")
      .replace(/Focused\s*report[^。.…]*/gi, "")
      .replace(/단일 성격 문장이 아니라[^。.…]*/g, "")
      .replace(/같은 단어로 덮지 않고[^。.…]*/g, "")
      .replace(/이\s*(재물|일|연애)\s*리포트의\s*핵심은[^.。]*[。.…]?/g, "")
      .replace(/[^。.\n]{0,24}리포트의\s*핵심은[^.。]*[。.…]?/g, "")
      .replace(/좋은\s*재물\s*리포트는[^.。]*[。.…]?/g, "")
      .replace(/연애\s*focused\s*report[^.。]*[。.…]?/gi, "")
      .replace(/돈 성향은[^.。]*입체적입니다[。.…]?/g, "")
      .replace(/사람과 돈을 별도 장면으로 보는 것이[^.。]*[。.…]?/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

/** Exact-sentence key for global duplicate sweep (body copy only). */
function exactNorm(s: string): string {
  return cleanCustomerText(s)
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasExact(used: Set<string>, line: string): boolean {
  const key = exactNorm(line);
  if (!key) return true;
  if (used.has(key)) return true;
  for (const u of used) {
    if (u === key) return true;
  }
  return false;
}

function claimExact(
  used: Set<string>,
  raw: string,
  glossSeen?: Set<string>
): string {
  const cleaned = cleanCustomerText(raw);
  if (!cleaned) return "";
  const t = glossSeen ? glossFirstMentions(cleaned, glossSeen) : cleaned;
  if (!t) return "";
  const key = exactNorm(t);
  if (key.length >= 12 && hasExact(used, t)) return "";
  if (key.length >= 12) used.add(key);
  return t;
}

/** Reserve detail sentences so Overview can only show a shorter teaser, never the same sentence. */
function reserveDetailLines(reserved: Set<string>, units: InsightUnit[]) {
  for (const u of units) {
    for (const raw of [
      u.conclusion,
      u.moment,
      u.whyMatters,
      u.counter,
      ...(u.scenes ?? []),
      u.evidenceNote,
    ]) {
      if (!raw) continue;
      const key = exactNorm(raw);
      if (key.length >= 18) reserved.add(key);
    }
  }
}

function reserveRawLines(reserved: Set<string>, lines: (string | undefined)[]) {
  for (const raw of lines) {
    if (!raw) continue;
    const key = exactNorm(raw);
    if (key.length >= 18) reserved.add(key);
  }
}

/**
 * Curated Overview teasers — same insight, natural short form.
 * Never invent new insights; never mechanical “때가 있다 / 편이다” morphing.
 */
const OVERVIEW_TEASER_RULES: Array<{ re: RegExp; teaser: string }> = [
  // Career
  { re: /끝이 보이는 일에서 유독 강해지는/, teaser: "끝이 보일수록 힘이 붙는 편" },
  { re: /완료 조건을 같이 적어/, teaser: "완료 조건을 함께 정해 주는 사람이 편할 수 있음" },
  { re: /일이 꼬이면 말수가 줄고/, teaser: "일이 꼬이면 메모와 체크리스트가 늘어남" },
  { re: /질문이 많은 건/, teaser: "질문이 많아지는 건 기준을 찾는 과정일 수 있음" },
  { re: /성과가 말이 되는 구조/, teaser: "성과가 설명될수록 꾸준함이 오래감" },
  { re: /완료 조건이 보여야 제대로 힘을/, teaser: "완료 조건이 보여야 힘이 살아남" },
  { re: /내가 하면 빠르니까/, teaser: "혼자 떠안는 속도가 과부하로 이어질 수 있음" },
  { re: /기준 문장.?이 부족/, teaser: "회의가 길어질 땐 기준 문장이 모자랄 수 있음" },
  { re: /기준 없는 수정이 반복/, teaser: "기준 없는 수정이 반복되면 에너지가 빠짐" },
  { re: /결과가 흔들리지 않는다는/, teaser: "결과의 흔들림 없음이 인정 방식일 수 있음" },
  { re: /지금이 더 이상 설명되지 않을/, teaser: "지금 구조가 설명되지 않을 때 움직이게 됨" },
  { re: /어디까지 맡을지를 먼저/, teaser: "어디까지 맡을지를 먼저 정하는 편" },
  { re: /시작 전에 범위.?완료 조건을 확인/, teaser: "시작 전에 범위와 완료 조건을 확인하는 편" },
  { re: /역할이 흐리면 스스로 더 많이 떠안/, teaser: "역할이 흐리면 혼자 더 떠안을 수 있음" },
  { re: /기준과 보상이 흐려질 때 이동/, teaser: "기준·보상이 흐려질 때 이동을 검토하게 됨" },
  { re: /기준 없는 수정과 역할 불명확/, teaser: "기준 없는 수정과 흐린 역할에서 마찰이 커짐" },
  { re: /느낌상 다시.?같은 요청/, teaser: "기준 없는 수정이 반복되면 과정이 더 피곤해짐" },
  { re: /책임 범위가 흐리면 스스로 더 많이/, teaser: "책임 범위가 흐리면 혼자 더 떠안을 수 있음" },
  { re: /조용히 듣는 건 동의가 아니라/, teaser: "조용히 듣는 건 정리 중일 수 있음" },
  { re: /혼자 초안을 정리하고/, teaser: "초안 정리 후 품질을 맞추는 리듬에서 힘이 남" },

  // Love
  { re: /확신 없이 앞서가는/, teaser: "확신 전에는 속도를 조절하는 편" },
  { re: /말보다 태도의 일관성을 더 오래/, teaser: "말보다 태도의 일관성을 오래 살핌" },
  { re: /확신 후에는 말보다 행동이/, teaser: "확신 후에는 현실적인 챙김이 늘어남" },
  { re: /확신이 생기면 표현보다 실질적 챙김/, teaser: "확신 후에는 현실적인 챙김이 늘어남" },
  { re: /호감이 있어도 확신 전에는 표현 속도/, teaser: "확신 전에는 표현이 늦게 보일 수 있음" },
  { re: /좋아할수록 말수가 줄고/, teaser: "호감이 있어도 표현은 늦게 보일 수 있음" },
  { re: /작은 서운함이 정리되지 않고/, teaser: "서운함은 한 번보다 반복될 때 커짐" },
  { re: /정리될 때까지 말을 아끼/, teaser: "갈등 초반에는 말이 줄어들 수 있음" },
  { re: /태도.?일관성에서 먼저 반응/, teaser: "태도·일관성에서 먼저 반응하는 편" },
  { re: /기준이 채워지면 속도가 바뀌/, teaser: "기준이 채워지면 속도가 바뀌는 전환점이 생김" },
  { re: /말로 길게 설명하기보다 실질/, teaser: "말보다 실질 준비로 보이는 편" },
  { re: /좋아함보다 신뢰가 먼저/, teaser: "좋아함보다 신뢰가 먼저 쌓여야 마음이 편해짐" },
  { re: /관계 정의 전에는 속도를 조절|관계 정의 전에는 스스로 속도를/, teaser: "확신 전에는 속도를 조절하는 편" },
  { re: /확신이 생기면 챙김의 속도/, teaser: "확신 후에는 현실적인 챙김이 늘어남" },
  { re: /분위기는 좋아도 확신 전에는/, teaser: "확신 전에는 관찰이 먼저인 편" },
  { re: /행동 패턴을 더 오래 볼/, teaser: "말보다 행동 패턴을 더 오래 살핌" },
  { re: /시간.?실행.?정리된 배려/, teaser: "확신 후에는 실질 배려로 마음을 보임" },
  { re: /관계를 지키기 위한 기준도 함께/, teaser: "확신이 생기면 기준도 함께 세우려 함" },
  { re: /화려한 표현보다 태도와 일관성/, teaser: "말보다 태도의 일관성을 오래 살핌" },

  // Money
  { re: /버는 데서 보는 기준과/, teaser: "벌 때와 쓸 때 중요하게 보는 기준이 다름" },
  { re: /쓰는 데서 보는 기준이 다를/, teaser: "벌 때와 쓸 때 중요하게 보는 기준이 다름" },
  { re: /한 달 뒤엔 큰 구멍/, teaser: "작은 반복 지출이 나중에 크게 느껴질 수 있음" },
  { re: /금액보다.{0,4}찜찜함.{0,4}이 먼저/, teaser: "결정을 미룰수록 금액보다 찜찜함이 커질 수 있음" },
  { re: /결정을 미루는 날이 길어질수록/, teaser: "결정을 미룰수록 금액보다 찜찜함이 커질 수 있음" },
  { re: /큰돈은 막는데,\s*작은 반복/, teaser: "큰돈보다 작은 반복을 늦게 발견하는 편" },
  { re: /끝나는 날짜가 있는 작은 약속/, teaser: "끝나는 날짜가 있는 작은 약속이 더 잘 남음" },
  { re: /능력보다 환경이 먼저 맞아야/, teaser: "능력보다 환경이 먼저 맞아야 강점이 작동함" },
  { re: /반복 장면에 맞는 규칙 다섯/, teaser: "반복 장면에 맞는 규칙이 더 쓸모 있음" },
  { re: /정산 문장이 없을 때 찜찜함/, teaser: "정산 문장이 없으면 찜찜함이 커질 수 있음" },

  // Total / shared discovery
  { re: /설명 가능한 흐름인가가/, teaser: "돈에서는 금액보다 흐름이 설명되는지가 중요함" },
  { re: /마음을 정하기 전의 속도/, teaser: "연애에서는 마음을 정하기 전과 후의 속도가 다름" },
  { re: /확신 전과 후의 속도 차이/, teaser: "연애에서는 마음을 정하기 전과 후의 속도가 다름" },
  { re: /정리가 끝나지 않은 상태가 길어질/, teaser: "끝나지 않은 일이 오래 남을수록 스트레스가 쌓임" },
  { re: /스트레스는 일이 많아서보다/, teaser: "끝나지 않은 일이 오래 남을수록 스트레스가 쌓임" },
  { re: /속으로는 이미 내부 결론/, teaser: "겉으로 맞추는 동안 속에서는 이미 결론이 진행될 수 있음" },
  { re: /수집과 확정의 속도가 서로 다를/, teaser: "판단은 수집과 확정의 속도가 다름" },
  { re: /처음의 나와 가까워진 뒤의 내가/, teaser: "처음과 가까워진 뒤의 내가 다르게 보일 수 있음" },
  { re: /과해지는 구간을 아는 것이 더 중요/, teaser: "강점보다 과해지는 구간을 아는 게 중요함" },
  { re: /재촉받을수록 바로 결론보다 자료/, teaser: "재촉받을수록 자료를 더 모을 수 있음" },
  { re: /가까운 사이일수록 처음보다 경계/, teaser: "가까워질수록 경계가 선명해질 수 있음" },
];

function lookupOverviewTeaser(line: string): string {
  const t = cleanCustomerText(line);
  if (!t) return "";
  for (const row of OVERVIEW_TEASER_RULES) {
    if (row.re.test(t)) return row.teaser;
  }
  return "";
}

/** Soft style only — never invent subjects or glue “때가 있다/편이다”. */
function overviewTeaserFallback(line: string): string {
  const t = cleanCustomerText(line);
  if (t.length < 12) return "";
  if (/때가 있다|편이다|타입일 때|사람일 때/.test(t)) return "";

  let out = t
    .replace(/수 있습니다\.?$/u, "수 있음")
    .replace(/수 있다\.?$/u, "수 있음")
    .replace(/습니다\.?$/u, "음")
    .replace(/입니다\.?$/u, "임");

  // Keep short complete claims; omit long unmapped detail clones.
  if (exactNorm(out) === exactNorm(t) && t.length > 40) return "";
  if (out.length < 10 || out.length > 44) return "";
  if (/때가 있다|편이다/.test(out)) return "";
  // Reject subject-less fragments that start mid-clause.
  if (/^(더 |먼저 |길어질|커질|보일|다를)/.test(out)) return "";
  return out;
}

function overviewClaim(
  used: Set<string>,
  reservedDetail: Set<string>,
  raw: string,
  glossSeen?: Set<string>
): string {
  const cleaned = cleanCustomerText(raw);
  if (!cleaned) return "";

  const mapped = lookupOverviewTeaser(cleaned);
  if (mapped) {
    if (hasExact(used, mapped)) return "";
    return claimExact(used, mapped, glossSeen);
  }

  const key = exactNorm(cleaned);
  const clash = reservedDetail.has(key) || hasExact(used, cleaned);
  if (clash || cleaned.length > 40) {
    const teaser = overviewTeaserFallback(cleaned);
    if (!teaser || hasExact(used, teaser) || reservedDetail.has(exactNorm(teaser))) {
      return "";
    }
    return claimExact(used, teaser, glossSeen);
  }
  return claimExact(used, cleaned, glossSeen);
}

/** Human-language teaser QA — mechanical morph / missing-subject patterns. */
export function findAwkwardTeaserPatterns(text: string): string[] {
  const hits: string[] = [];
  const plain = text.replace(/<[^>]+>/g, " ");
  for (const re of [
    /[가-힣]{2,20}일 때가 있다/g,
    /[가-힣]{2,20}타입일 때가 있다/g,
    /때가 있다/g,
    /편이다/g,
    /흐름인가가/g,
  ]) {
    for (const m of plain.matchAll(re)) hits.push(m[0]!);
  }
  return [...new Set(hits)];
}

/** Drop lines that semantically duplicate a primary insight already used. */
function dedupeLines(lines: string[], used: Set<string>, limit = 3): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const line = claimExact(used, raw);
    if (!line) continue;
    out.push(line);
    if (out.length >= limit) break;
  }
  return out;
}

function overviewBodies(
  lines: string[],
  used: Set<string>,
  reservedDetail: Set<string>,
  glossSeen: Set<string>,
  limit = 3
): string {
  const out: string[] = [];
  for (const raw of lines) {
    const line = overviewClaim(used, reservedDetail, raw, glossSeen);
    if (!line) continue;
    out.push(line);
    if (out.length >= limit) break;
  }
  return out.map((p) => `<p class="body">${esc(p)}</p>`).join("");
}

function portraitBodies(lines: string[] | undefined, used: Set<string>, limit = 3) {
  return dedupeLines(lines ?? [], used, limit)
    .map((p) => `<p class="portrait">${esc(p)}</p>`)
    .join("");
}

function callout(label: string, body: string | undefined) {
  const t = cleanCustomerText(body ?? "");
  if (!t) return "";
  return `<div class="callout"><p class="t">${esc(label)}</p><p class="body">${esc(t)}</p></div>`;
}

type EvidenceFamily =
  | "identity"
  | "elements"
  | "ten_gods"
  | "pillar"
  | "relation"
  | "other";

function evidenceFamily(ev: EvidenceRecord): EvidenceFamily {
  switch (ev.type) {
    case "DAY_MASTER":
    case "YIN_YANG_PATTERN":
      return "identity";
    case "ELEMENT_DOMINANCE":
    case "ELEMENT_SCARCITY":
      return "elements";
    case "TEN_GOD_DISTRIBUTION":
    case "PILLAR_TEN_GOD":
      return "ten_gods";
    case "PILLAR_SYMBOL":
      return "pillar";
    case "ELEMENT_RELATION":
      return "relation";
    default:
      return "other";
  }
}

function allAxes(v2: InterpretationContextV2) {
  return [
    ...v2.identityAxes,
    ...v2.elementAxes,
    ...v2.tenGodAxes,
    ...v2.pillarAxes,
    ...v2.interactionAxes,
  ];
}

function resolveSectionEvidence(
  v2: InterpretationContextV2,
  section: PaidSection | undefined
): EvidenceRecord[] {
  if (!section) return [];
  const axisIds = new Set(section.evidenceAxisIds ?? []);
  const fromAxis = v2.evidenceRegistry.filter((e) => {
    if (axisIds.has(e.axisId)) return true;
    if (axisIds.has("day_master") && e.type === "DAY_MASTER") return true;
    if (axisIds.has("yin_yang") && e.type === "YIN_YANG_PATTERN") return true;
    if (
      axisIds.has("five_elements") &&
      (e.type === "ELEMENT_DOMINANCE" || e.type === "ELEMENT_SCARCITY")
    )
      return true;
    if (axisIds.has("ten_god_distribution") && e.type === "TEN_GOD_DISTRIBUTION") return true;
    if (axisIds.has("ten_gods_month") && e.id.includes("month")) return true;
    if (axisIds.has("ten_gods_year") && e.id.includes("year") && e.type === "PILLAR_TEN_GOD")
      return true;
    if (axisIds.has("ten_gods_day") && e.id.includes("day") && e.type === "PILLAR_TEN_GOD")
      return true;
    if (axisIds.has("pillar_day") && e.axisId === "pillar_day") return true;
    if (axisIds.has("element_relation") && e.type === "ELEMENT_RELATION") return true;
    return false;
  });
  const out: EvidenceRecord[] = [];
  const seen = new Set<EvidenceFamily>();
  for (const ev of fromAxis) {
    const fam = evidenceFamily(ev);
    if (seen.has(fam)) continue;
    seen.add(fam);
    out.push(ev);
    if (out.length >= 2) break;
  }
  return out;
}

export type ReportKindV5 = "money" | "career" | "love" | "total";

const MONEY_LEAK_RE =
  /큰돈|작은 반복|소액|지출|절약|수입|소비|대가|정산|결제/;
const CAREER_LEAK_RE =
  /업무 완료|완료 조건|검수|직장 보상|위임|과부하|역할 구조/;
const LOVE_LEAK_RE =
  /연애|확신 전|확신 후|애정 표현|호감|거리 조절|관계 정의/;

export function findDomainContamination(
  text: string,
  kind: ReportKindV5
): string[] {
  const hits: string[] = [];
  if (kind !== "money" && MONEY_LEAK_RE.test(text)) {
    const m = text.match(MONEY_LEAK_RE);
    if (m) hits.push(`money-leak:${m[0]}`);
  }
  if (kind !== "career" && CAREER_LEAK_RE.test(text)) {
    const m = text.match(CAREER_LEAK_RE);
    if (m) hits.push(`career-leak:${m[0]}`);
  }
  if (kind !== "love" && LOVE_LEAK_RE.test(text)) {
    const m = text.match(LOVE_LEAK_RE);
    if (m) hits.push(`love-leak:${m[0]}`);
  }
  return [...new Set(hits)];
}

function hypIdForKind(kind: ReportKindV5): string | undefined {
  if (kind === "money") return "money-threshold";
  if (kind === "career") return "work-environment";
  if (kind === "love") return "love-distance";
  return undefined;
}

function isSafeForKind(text: string, kind: ReportKindV5): boolean {
  if (!text) return false;
  if (kind === "total") {
    return (
      !MONEY_LEAK_RE.test(text) &&
      !CAREER_LEAK_RE.test(text) &&
      !LOVE_LEAK_RE.test(text)
    );
  }
  return findDomainContamination(text, kind).length === 0;
}

/** Customer-facing internal axis labels that must never appear outside Money copy. */
export const INTERNAL_CUSTOMER_TERMS = [
  "오행 우세 축",
  "십성 분포 축",
  "일간 축",
  "일주 축",
  "강점-그림자 축",
] as const;

const INTERNAL_AXIS_JARGON_RE =
  /(?:오행\s*우세|십성\s*분포|일간|일주|강점-그림자|년간\s*십성|월간\s*십성|년주|음양|오행\s*관계|오행\s*희소)[·\s]*축|중심축|(?:볼|읽(?:을|히)?)\s*수\s*있(?:습니다|습니까)?(?:\.|$)/;

const TAUTOLOGY_COPY_RE =
  /중심축으로\s*(?:볼|읽(?:을|히)?)\s*수\s*있|경향을\s*(?:볼|살펴볼)\s*수\s*있|요소가\s*(?:상대적으로\s*)?두드러지(?:고|는)[^。.\n]{0,24}(?:보여|나타)|추가로\s*살펴볼\s*수\s*있/;

export function findInternalCustomerTerms(text: string): string[] {
  const hits: string[] = [];
  for (const term of INTERNAL_CUSTOMER_TERMS) {
    if (text.includes(term)) hits.push(term);
  }
  return [...new Set(hits)];
}

export function findTautologyCopy(text: string): string[] {
  const hits: string[] = [];
  if (TAUTOLOGY_COPY_RE.test(text)) hits.push("tautology-copy");
  return hits;
}

function hasInternalAxisJargon(text: string): boolean {
  return (
    findInternalCustomerTerms(text).length > 0 || INTERNAL_AXIS_JARGON_RE.test(text)
  );
}

function parseElementFromDesc(d: string): string | undefined {
  const m = d.match(/(木|火|土|金|水)/);
  return m?.[1];
}

function parseTenGodFromDesc(d: string): string | undefined {
  const dist = d.match(/^(.+?)\s*십성/);
  if (dist) return dist[1]!.trim();
  const pillar = d.match(/십성\s*(.+)$/);
  return pillar?.[1]?.trim();
}

function parsePillarTenGod(d: string): { pillar?: string; god?: string } {
  const m = d.match(/^(년간|월간|일간|시간)\s*십성\s*(.+)$/);
  if (!m) return {};
  return { pillar: m[1], god: m[2]!.trim() };
}

function elementNeutralMeaning(el: string): string {
  switch (el) {
    case "金":
      return "정리·판단·결과 확인";
    case "木":
      return "시작·조율·확장";
    case "火":
      return "표현·추진·속도";
    case "土":
      return "안정·누적·책임";
    case "水":
      return "유연·조율·내부 정리";
    default:
      return "반응의 무게";
  }
}

/** Short fact clause built only from evidence.description. */
function evidenceFactClause(ev: EvidenceRecord): string {
  const d = ev.description;
  switch (ev.type) {
    case "DAY_MASTER":
      return `${d}이 중심이 되고`;
    case "YIN_YANG_PATTERN":
      return `${d}이 깔려 있고`;
    case "ELEMENT_DOMINANCE": {
      const el = parseElementFromDesc(d);
      return el ? `${el} 기운이 두드러지고` : `${d.replace(/\.$/, "")}이 드러나고`;
    }
    case "ELEMENT_SCARCITY": {
      const el = parseElementFromDesc(d);
      return el ? `${el} 기운이 상대적으로 적고` : `${d.replace(/\.$/, "")}이 약하고`;
    }
    case "PILLAR_TEN_GOD": {
      const { pillar, god } = parsePillarTenGod(d);
      if (pillar && god) return `${pillar}에 ${god}가 놓인`;
      return d.replace(/\.$/, "");
    }
    case "TEN_GOD_DISTRIBUTION": {
      const god = parseTenGodFromDesc(d);
      const n = d.match(/(\d+)회/);
      if (god && n) return `${god}가 ${n[1]}번 반복되는`;
      return d.replace(/\.$/, "");
    }
    case "PILLAR_SYMBOL": {
      const parts = d.split("/").map((p) => p.trim());
      if (parts.length >= 2) {
        const branch = parts[0]!.replace(/^일지\s*/, "");
        const tg = parts[1]!.replace(/^일지\s*십성\s*/, "");
        return `일지 ${branch}·${tg} 십성이 함께 작용하는`;
      }
      return `${d}이 함께 작용하는`;
    }
    case "ELEMENT_RELATION":
      return `${d.replace(/\.$/, "")}이 겹치는`;
    default:
      return d.replace(/\.$/, "");
  }
}

function evidenceMeaningTail(evs: EvidenceRecord[], kind: ReportKindV5): string {
  const blob = evs.map((e) => e.description).join(" ");
  const el = parseElementFromDesc(blob);
  const hasDayMaster = evs.some((e) => e.type === "DAY_MASTER");
  const hasPillarSymbol = evs.some((e) => e.type === "PILLAR_SYMBOL");
  const hasRob = /겁재/.test(blob);
  const hasMetal = /金/.test(blob);

  if (kind === "career") {
    if (el && hasRob) {
      return `정리하고 판단할 기준이 분명하고, 결과를 직접 확인할 수 있는 환경에서 힘을 안정적으로 쓰는 쪽에 가깝습니다.`;
    }
    if (hasDayMaster && hasMetal) {
      return "강점이 재현되는 만큼 확인과 책임을 스스로 더 오래 붙들어 과부하로 이어지기 쉽습니다.";
    }
    if (hasDayMaster) {
      return "업무에서는 먼저 기준을 세우고 끝까지 확인하려는 리듬이 강점이 되기 쉽습니다.";
    }
    if (el) {
      return `${elementNeutralMeaning(el)} 쪽으로 힘이 모일수록 구조·완성에서 만족을 찾기 쉽습니다.`;
    }
    return "일의 방향은 직함보다 구조와 검수 지점이 선명할 때 더 분명해집니다.";
  }

  if (kind === "love") {
    if (hasDayMaster && hasPillarSymbol) {
      return "관계 정의 전에는 속도를 조절하고, 가까워질수록 표현 방식이 달라지는 쪽에 가깝습니다.";
    }
    if (hasRob) {
      return "갈등 때 감정 폭발보다 정리와 확인, 거리 조절로 먼저 반응하는 쪽에 가깝습니다.";
    }
    if (hasDayMaster) {
      return "마음이 없어서 느린 것이 아니라, 관계가 깊어질수록 태도와 속도가 달라지는 쪽에 가깝습니다.";
    }
    if (hasPillarSymbol) {
      return "가까운 관계일수록 속도와 표현이 달라져 오해가 생기기 쉬운 지점이 됩니다.";
    }
    return "관계에서는 속도 차이 자체가 먼저 설명해야 할 포인트가 될 수 있습니다.";
  }

  return "";
}

function customerPlainFromEvidence(ev: EvidenceRecord, kind: ReportKindV5): string {
  const d = ev.description;
  const el = parseElementFromDesc(d);
  switch (ev.type) {
    case "DAY_MASTER":
      if (kind === "career") {
        return `${d}은 업무에서 먼저 기준을 세우고 결과를 확인하려는 출발점입니다.`;
      }
      if (kind === "love") {
        return `${d}은 관계가 깊어질수록 태도와 속도가 달라지는 기준점입니다.`;
      }
      return `${d}은 판단·행동의 출발점이라, 같은 상황에서도 기준을 먼저 세우는 쪽으로 반응하기 쉽습니다.`;
    case "YIN_YANG_PATTERN":
      if (/음/.test(d)) {
        return `${d}은 바깥으로 드러내기 전에 내부에서 정리하는 쪽으로 반응하기 쉽습니다.`;
      }
      return `${d}은 판단을 말이나 행동으로 먼저 밀어내는 쪽으로 반응하기 쉽습니다.`;
    case "ELEMENT_DOMINANCE":
      if (kind === "career" && el) {
        return `${d} — ${elementNeutralMeaning(el)} 쪽으로 힘이 모여 구조·완성에서 강점이 나오기 쉽습니다.`;
      }
      if (kind === "love" && el) {
        return `${d} — 관계에서 ${elementNeutralMeaning(el)} 쪽 표현·거리 리듬이 두드러지기 쉽습니다.`;
      }
      if (el) {
        return `${el}이 가장 많으면 ${elementNeutralMeaning(el)} 쪽 반응이 다른 오행보다 자주 앞서 나옵니다.`;
      }
      return `${d} — 상대적으로 강한 기운 쪽으로 판단의 무게가 기울기 쉽습니다.`;
    case "ELEMENT_SCARCITY":
      if (el) {
        return `${el} 기운이 적으면 ${elementNeutralMeaning(el)} 쪽 보완·조율을 의식하게 되기 쉽습니다.`;
      }
      return `${d} — 부족한 기운 쪽을 채우려는 조율이 반응 속도에 영향을 줄 수 있습니다.`;
    case "PILLAR_TEN_GOD": {
      const { pillar, god } = parsePillarTenGod(d);
      if (kind === "career" && pillar && god) {
        return `${pillar}에 ${god}가 놓이면 바깥 책임과 내부 기준이 겹칠 때 일의 반응이 달라지기 쉽습니다.`;
      }
      if (kind === "love" && pillar && god) {
        return `${pillar}에 ${god}가 놓이면 가까운 관계와 바깥 태도 사이에서 표현·거리 리듬이 달라지기 쉽습니다.`;
      }
      if (pillar && god) {
        return `${pillar} ${god}는 장면마다 책임·경계 압력이 다르게 느껴지게 만듭니다.`;
      }
      return `${d} — 십성 배치가 반응의 출발점을 구체화합니다.`;
    }
    case "TEN_GOD_DISTRIBUTION": {
      const god = parseTenGodFromDesc(d);
      const n = d.match(/(\d+)회/);
      if (god && n) {
        if (kind === "career") {
          return `${god}가 ${n[1]}번 반복되면 확인·비교·기준 설정 압력이 업무 리듬에 자주 끼어들 수 있습니다.`;
        }
        if (kind === "love") {
          return `${god}가 ${n[1]}번 반복되면 관계에서 확인·정리·거리 조절이 갈등 때 먼저 나타나기 쉽습니다.`;
        }
        return `${god}가 ${n[1]}번 반복되면 스스로 기준을 세우고 속도를 조절하는 패턴이 두드러질 수 있습니다.`;
      }
      return `${d} — 같은 십성이 반복될수록 그 성향이 장면 선택에 영향을 줍니다.`;
    }
    case "PILLAR_SYMBOL":
      if (kind === "love") {
        return `${d} — 가까워질수록 속도와 표현 방식이 달라지는 지점을 보여줍니다.`;
      }
      if (kind === "career") {
        return `${d} — 일의 만족·누적 방식과 맞닿는 지점을 보여줍니다.`;
      }
      return `${d} — 가까운 장면에서 반응이 달라지는 지점을 구체화합니다.`;
    case "ELEMENT_RELATION":
      return kind === "total"
        ? `${d} — 일간과 다른 기운의 관계가 장면마다 출발점을 나눕니다.`
        : `${d} — 기운 간 관계가 해당 영역에서 속도·압력 차이를 만들 수 있습니다.`;
    default:
      return structuralPlain(ev, kind);
  }
}

function customerPlainFromEvidences(evs: EvidenceRecord[], kind: ReportKindV5): string {
  if (!evs.length) return "";
  const clauses = evs.map(evidenceFactClause).filter(Boolean);
  if (clauses.length >= 2) {
    const tail = evidenceMeaningTail(evs, kind);
    if (tail) {
      const c0 = clauses[0]!
        .replace(/이 함께 작용하는$/, "")
        .replace(/가 함께 작용하는$/, "");
      const c1 = clauses[1]!
        .replace(/이 함께 작용하는$/, "")
        .replace(/가 함께 작용하는$/, "")
        .replace(/십성이 함께 작용하는$/, "십성");
      // Keep connective first clause: “…두드러지고 …놓인 구조를 함께 보면”
      if (/고$|고,$/.test(c0) || /되고$/.test(c0)) {
        return sanitizeEditorialCopy(`${c0} ${c1} 구조를 함께 보면, ${tail}`);
      }
      const particle = /[가-힣)）]$/.test(c0) ? "과" : "와";
      return sanitizeEditorialCopy(`${c0}${particle} ${c1}을 함께 보면, ${tail}`);
    }
  }
  if (evs.length === 1) return customerPlainFromEvidence(evs[0]!, kind);
  return evs.map((e) => customerPlainFromEvidence(e, kind)).join(" ");
}

function sajuMapCustomerMeaning(ev: EvidenceRecord): string {
  return customerPlainFromEvidence(ev, "total");
}

/** Structural, domain-aware meaning — never shared money default. */
function structuralPlain(ev: EvidenceRecord, kind: ReportKindV5): string {
  switch (ev.type) {
    case "DAY_MASTER":
    case "YIN_YANG_PATTERN":
      if (kind === "career") {
        return "업무에서 먼저 기준을 세우고 끝까지 확인하려는 리듬이 강점이 되기 쉽습니다.";
      }
      if (kind === "love") {
        return "관계가 깊어질수록 태도와 속도가 달라지는 패턴이 두드러지기 쉽습니다.";
      }
      if (kind === "money") {
        return "돈 앞에서 판단 속도가 달라지는 중심으로 읽힐 수 있습니다.";
      }
      return sajuMapCustomerMeaning(ev);
    case "ELEMENT_DOMINANCE":
    case "ELEMENT_SCARCITY":
      if (kind === "career") {
        return "두드러진 기운 쪽으로 구조·완성에 힘이 모일 수 있습니다.";
      }
      if (kind === "love") {
        return "기운의 무게 차이가 관계에서 표현·거리 리듬에 영향을 줄 수 있습니다.";
      }
      if (kind === "money") {
        return "상대적으로 강한 기운과 약한 기운이 돈 장면마다 다른 속도로 나타날 수 있습니다.";
      }
      return sajuMapCustomerMeaning(ev);
    case "TEN_GOD_DISTRIBUTION":
    case "PILLAR_TEN_GOD":
      if (kind === "career") {
        return "바깥 책임 압력과 내부 기준이 겹칠 때 일의 반응이 달라질 수 있습니다.";
      }
      if (kind === "love") {
        return "가까운 관계와 바깥 태도 사이에서 표현·거리 리듬이 달라질 수 있습니다.";
      }
      if (kind === "money") {
        return "책임·경계 압력이 돈 장면의 판단 속도에 영향을 줄 수 있습니다.";
      }
      return sajuMapCustomerMeaning(ev);
    case "PILLAR_SYMBOL":
      if (kind === "love") {
        return "가까워질수록 속도와 표현 방식이 달라지는 지점을 보여줍니다.";
      }
      if (kind === "career") {
        return "일의 만족·누적 방식과 맞닿는 지점을 보여줍니다.";
      }
      if (kind === "money") {
        return "가까운 장면에서의 돈 반응이 달라지는 지점으로 읽힐 수 있습니다.";
      }
      return sajuMapCustomerMeaning(ev);
    case "ELEMENT_RELATION":
      return kind === "total"
        ? `${ev.description} — 일간과 다른 기운의 관계가 장면마다 출발점을 나눕니다.`
        : "기운 간 관계가 해당 영역에서 속도·압력 차이를 만들 수 있습니다.";
    default:
      if (kind === "money") {
        return "이 신호가 장면마다 다른 출발점으로 작동할 수 있습니다.";
      }
      return `${ev.description} — 이 신호가 장면마다 다른 출발점으로 작동할 수 있습니다.`;
  }
}

function plainWhyForEvidence(
  v2: InterpretationContextV2,
  evs: EvidenceRecord[],
  kind: ReportKindV5,
  section?: PaidSection
): string {
  const primary = evs[0];
  if (!primary) return "";

  // Money regression path — unchanged priority order
  if (kind === "money") {
    const fromSection = (section?.evidenceExplanation ?? [])
      .map(cleanCustomerText)
      .find((t) => t && isSafeForKind(t, kind));
    if (fromSection) return fromSection;

    const hypId = hypIdForKind(kind);
    if (hypId) {
      const hyp = v2.behaviorHypotheses.find((h) => h.id === hypId);
      if (hyp?.evidenceIds.includes(primary.id)) {
        const cand = cleanCustomerText(
          hyp.coreInterpretation || hyp.practicalMeaning || ""
        );
        if (cand && isSafeForKind(cand, kind)) return cand;
      }
    }

    const axes = allAxes(v2);
    const axis = axes.find(
      (a) => a.id === primary.axisId || a.evidenceIds.includes(primary.id)
    );
    const axisSummary = cleanCustomerText(axis?.summary ?? "");
    if (axisSummary && isSafeForKind(axisSummary, kind)) {
      if (kind === "total") return axisSummary;
    }

    return structuralPlain(primary, kind);
  }

  // Career / Love / Total — evidence-based customer copy only
  let plain = customerPlainFromEvidences(evs, kind);

  if (
    !plain ||
    hasInternalAxisJargon(plain) ||
    findTautologyCopy(plain).length
  ) {
    plain = evs.map((e) => structuralPlain(e, kind)).join(" ");
  }

  return plain;
}

/** Compact customer-facing evidence: signal → plain → domain link. */
function evidenceBlock(opts: {
  v2?: InterpretationContextV2;
  section?: PaidSection;
  domainLink: string;
  usedSignals: Set<string>;
  reportKind: ReportKindV5;
}): string {
  const { v2, section, domainLink, usedSignals, reportKind } = opts;
  if (!v2 || !section) return "";
  const evs = resolveSectionEvidence(v2, section).filter((e) => {
    const key = e.description.slice(0, 24);
    if (usedSignals.has(key)) return false;
    return true;
  });
  if (!evs.length) return "";
  for (const e of evs) usedSignals.add(e.description.slice(0, 24));

  const signal = evs.map((e) => cleanCustomerText(e.description)).join(" · ");
  let plain = plainWhyForEvidence(v2, evs, reportKind, section);
  if (!isSafeForKind(plain, reportKind)) {
    plain =
      reportKind === "money"
        ? structuralPlain(evs[0]!, reportKind)
        : customerPlainFromEvidences(evs, reportKind);
  }
  const link = cleanCustomerText(domainLink);
  if (!signal || !link) return "";
  if (!isSafeForKind(link, reportKind) && reportKind !== "money") {
    // domainLink should already be section coreInsight; if contaminated, drop block
    return "";
  }

  return `<div class="ev-block" data-report-kind="${reportKind}">
  <p class="ev-kicker">사주에서는 왜 이렇게 보는지</p>
  <p class="ev-signal"><span class="lab">명식 근거</span>${esc(signal)}</p>
  <p class="ev-plain"><span class="lab">쉬운 뜻</span>${esc(plain)}</p>
</div>`;
}

function insightHtml(
  unit: InsightUnit,
  glossSeen: Set<string>,
  evidenceHtml = "",
  opts?: { omitMoment?: boolean; usedLines?: Set<string> }
): string {
  const used = opts?.usedLines;
  const take = (raw: string) => {
    if (!used) {
      return glossFirstMentions(cleanCustomerText(raw), glossSeen);
    }
    return claimExact(used, raw, glossSeen);
  };

  const q = take(unit.question);
  const ans = take(unit.conclusion);
  if (!q || !ans) return "";
  const scenes = (unit.scenes ?? [])
    .map((s) => take(s))
    .filter(Boolean)
    .slice(0, 3);
  let counter = unit.counter ? take(unit.counter) : "";
  if (counter) counter = stripLabeledPrefix(counter);
  const why = unit.whyMatters ? take(unit.whyMatters) : "";
  const moment =
    opts?.omitMoment || !unit.moment ? "" : take(unit.moment);
  const evNote = unit.evidenceNote ? take(unit.evidenceNote) : "";

  return `<div class="insight" data-insight="${esc(unit.id)}">
  <p class="q">${esc(q)}</p>
  <p class="ans">${esc(ans)}</p>
  ${scenes.map((s) => `<p class="scene">${esc(s)}</p>`).join("")}
  ${counter ? `<p class="counter"><span class="lab">반대로</span>${esc(counter)}</p>` : ""}
  ${why ? `<p class="why"><span class="lab">그래서</span>${esc(why)}</p>` : ""}
  ${moment ? `<p class="moment">${esc(moment)}</p>` : ""}
  ${evidenceHtml || (evNote ? `<div class="ev-block"><p class="ev-kicker">사주에서는 왜 이렇게 보는지</p><p class="ev-plain">${esc(evNote)}</p></div>` : "")}
</div>`;
}

function momentsHtml(
  lines: string[],
  glossSeen: Set<string>,
  limit = 5,
  exclude: string[] = [],
  opts?: { used?: Set<string>; reservedDetail?: Set<string>; overview?: boolean }
): string {
  const banned = exclude.map((e) => exactNorm(e)).filter(Boolean);
  const used = opts?.used ?? new Set<string>();
  const reserved = opts?.reservedDetail ?? new Set<string>();
  const items: string[] = [];
  for (const l of lines) {
    const claimed = opts?.overview
      ? overviewClaim(used, reserved, l, glossSeen)
      : claimExact(used, l, glossSeen);
    if (!claimed) continue;
    if (banned.some((b) => b && exactNorm(claimed).includes(b.slice(0, 16)))) continue;
    items.push(claimed);
    if (items.length >= limit) break;
  }
  if (!items.length) return "";
  return `<div class="moment-list">${items.map((m) => `<p class="moment">${esc(m)}</p>`).join("")}</div>`;
}

/** Never assemble Korean particles onto dynamic titles/poles. */
function contradictionShareLine(poleA: string, poleB: string): string {
  const a = cleanCustomerText(poleA);
  const b = cleanCustomerText(poleB);
  return `${a} · ${b} — 한 사람 안에서 같이 작동할 수 있다.`;
}

export function findParticleErrors(text: string): string[] {
  const hits: string[] = [];
  for (const re of KNOWN_PARTICLE_ERRORS) {
    const m = text.match(re);
    if (m) hits.push(m[0]!);
  }
  // Dynamic join smells: bare noun + 와/가 after contradiction-style poles
  for (const m of text.matchAll(/([가-힣]{2,12})와\s+([가-힣]{2,12})가\s+한\s*사람/g)) {
    hits.push(`${m[1]}와…${m[2]}가`);
  }
  return [...new Set(hits)];
}

function sectionByKey(report: PaidFortuneReport, key: string): PaidSection | undefined {
  return report.sections.find((s) => s.key === key);
}

function footer(page: number, total: number) {
  return `<div class="footer sans"><span>運의結</span><span class="pn">${page} / ${total}</span></div>`;
}

function bodies(lines: string[]) {
  return lines.map((s) => `<p class="body">${esc(s)}</p>`).join("");
}

function why(section: PaidSection | undefined) {
  const lines = (section?.evidenceExplanation ?? [])
    .map(cleanCustomerText)
    .filter(Boolean)
    .slice(0, 2);
  if (!lines.length) return "";
  return `<div class="why"><p class="t">명식에서 보면</p>${lines
    .map((p) => `<p class="caption">${esc(p)}</p>`)
    .join("")}</div>`;
}

function pullQuote(line: string | undefined) {
  if (!line) return "";
  return `<p class="pull serif">${esc(cleanCustomerText(line))}</p>`;
}

function dashHtml(report: PaidFortuneReport, max = 5) {
  return (report.profileDashboard ?? [])
    .slice(0, max)
    .map(
      (d) =>
        `<div class="dash-row"><span class="l">${esc(cleanCustomerText(d.label))}</span><span class="v">${esc(cleanCustomerText(d.value))}</span></div>`
    )
    .join("");
}

function scalesHtml(report: PaidFortuneReport) {
  return (report.profileScales ?? [])
    .slice(0, 3)
    .map((sc) => {
      const w = sc.level === "low" ? "32%" : sc.level === "high" ? "84%" : "56%";
      const lab = sc.level === "low" ? "낮음" : sc.level === "high" ? "높음" : "중간";
      return `<div class="scale sans"><span style="min-width:5rem">${esc(sc.label)}</span><div class="bar"><i style="width:${w}"></i></div><span class="gold" style="font-size:8pt">${lab}</span></div>`;
    })
    .join("");
}

function coverPage(
  kind: "money" | "career" | "love" | "total",
  nickname: string,
  en: string,
  page: number,
  total: number
) {
  const c = coverTitleForProduct(nickname, kind);
  const enSafe = esc(en).replace(/ /g, "&nbsp;");
  return `<div class="page cover sans" data-shot="cover" data-layout="cover">
  <div class="cover-stage">
    <p class="brand-mark">${c.brandLine}</p>
    <div class="cover-ornament"></div>
    <h1 class="serif">${esc(c.titleLines[0])}<br/>${esc(c.titleLines[1])}</h1>
    <p class="en">${enSafe}</p>
  </div>
  ${footer(page, total)}
</div>`;
}

function playbookItems(items: string[], limit = 5) {
  return items
    .filter(Boolean)
    .slice(0, limit)
    .map(
      (p, i) =>
        `<div class="play"><p class="n sans">RULE ${String(i + 1).padStart(2, "0")}</p><p class="body">${esc(cleanCustomerText(p))}</p></div>`
    )
    .join("");
}

function splitEarnSpend(scenesIn: string[] | undefined) {
  const list = scenesIn ?? [];
  const earn = list
    .filter((x) => /^수입\s*:/.test(x) || x.includes("【벌"))
    .map((x) => x.replace(/^수입\s*:\s*/, "").replace(/^【벌 때】\s*/, ""));
  const spend = list
    .filter((x) => /^지출\s*:/.test(x) || x.includes("【쓸"))
    .map((x) => x.replace(/^지출\s*:\s*/, "").replace(/^【쓸 때】\s*/, ""));
  if (earn.length && spend.length) return { earn: earn.slice(0, 2), spend: spend.slice(0, 2) };
  return {
    earn: list.slice(0, 2).map((x) => x.replace(/^수입\s*:\s*/, "")),
    spend: list.slice(2, 4).map((x) => x.replace(/^지출\s*:\s*/, "")),
  };
}

function buildMoney(input: {
  nickname: string;
  report: PaidFortuneReport;
  ctx?: FortuneAiContext;
  v2?: InterpretationContextV2;
}): string {
  const r = input.report;
  const s = (k: string) => sectionByKey(r, k);
  const total = 7;
  const used = new Set<string>();
  const reservedDetail = new Set<string>();
  const glossSeen = new Set<string>();
  const evUsed = new Set<string>();
  const structure = s("money_v4_structure");
  const earnSec = s("money_v4_earn_spend");
  const people = s("money_v4_people");
  const { earn, spend } = splitEarnSpend(earnSec?.behaviorScenes);
  const pack = buildMoneyValuePack(r, input.ctx ?? ({} as FortuneAiContext), input.v2);
  const byId = (id: string) => pack.find((u) => u.id === id)!;
  reserveDetailLines(reservedDetail, pack);
  const primaryShare = structure?.pullQuote ?? r.shareableInsights?.[0];
  if (primaryShare) reserveRawLines(reservedDetail, [primaryShare]);

  const structureEv = evidenceBlock({
    v2: input.v2,
    section: structure,
    domainLink: structure?.coreInsight ?? "큰돈과 작은 반복에서 판단 속도가 달라질 수 있습니다.",
    usedSignals: evUsed,
    reportKind: "money",
  });
  const earnEv = evidenceBlock({
    v2: input.v2,
    section: earnSec,
    domainLink: earnSec?.coreInsight ?? "벌기와 쓰기에서 기준이 갈라질 수 있습니다.",
    usedSignals: evUsed,
    reportKind: "money",
  });

  const moments = (pack.map((u) => u.moment).filter(Boolean) as string[]).filter(
    (m) => !/인색/.test(m)
  );
  const peopleTeaser =
    overviewClaim(used, reservedDetail, people?.behaviorScenes?.[0] ?? "", glossSeen) ||
    "정산 문장이 없을 때 찜찜함이 커질 수 있습니다.";

  return [
    coverPage("money", input.nickname, "MONEY MANUAL", 1, total),
    `<div class="page paper sans" data-shot="profile" data-layout="profile-dashboard">
  <p class="kicker">나의 돈 프로필</p>
  <p class="sig serif">${esc(glossFirstMentions(cleanCustomerText(r.signatureStatement), glossSeen))}</p>
  <div class="dash-grid">${dashHtml(r)}</div>
  ${scalesHtml(r)}
  <div class="rule"></div>
  <p class="section-title serif">읽고 나면 이런 장면이 떠오를 수 있어요</p>
  ${momentsHtml(moments, glossSeen, 5, [primaryShare ?? ""], {
    used,
    reservedDetail,
    overview: true,
  })}
  ${pullQuote(primaryShare)}
  ${footer(2, total)}
</div>`,
    `<div class="page tint sans" data-shot="core-structure" data-layout="insight">
  <p class="kicker">돈의 기본 구조</p>
  <h2 class="part-title serif">큰돈과 작은 반복</h2>
  ${insightHtml(byId("money-core"), glossSeen, structureEv, {
    omitMoment: true,
    usedLines: used,
  })}
  ${footer(3, total)}
</div>`,
    `<div class="page paper sans" data-shot="earn-spend" data-layout="two-column">
  <p class="kicker">벌기 · 쓰기 · 반응</p>
  <h2 class="part-title serif">같은 사람이 다르게 움직이는 지점</h2>
  <div class="imap">
    <div class="imap-head">돈의 반응 Map</div>
    <div class="imap-grid">
      <div class="imap-cell"><p class="lab">큰 지출</p><p class="val">${esc(spend[0] ?? "허용 범위를 먼저 정하려 할 수 있습니다.")}</p></div>
      <div class="imap-cell"><p class="lab">반복 소액</p><p class="val">${esc(spend[1] ?? "피로한 날 편의 소비가 예외처럼 늘 수 있습니다.")}</p></div>
      <div class="imap-cell"><p class="lab">수입</p><p class="val">${esc(earn[0] ?? "기준이 보이는 보상에서 힘이 오래 갑니다.")}</p></div>
      <div class="imap-cell"><p class="lab">관계 비용</p><p class="val">${esc(peopleTeaser)}</p></div>
    </div>
  </div>
  ${insightHtml(byId("money-earn-spend"), glossSeen, earnEv, { usedLines: used })}
  ${footer(4, total)}
</div>`,
    `<div class="page tint sans" data-shot="save-delay" data-layout="insight">
  <p class="kicker">모으기 · 미루기 · 사각지대</p>
  <h2 class="part-title serif">새어 나가는 지점</h2>
  ${insightHtml(byId("money-save"), glossSeen, "", { usedLines: used })}
  ${insightHtml(byId("money-delay"), glossSeen, "", { usedLines: used })}
  ${footer(5, total)}
</div>`,
    `<div class="page paper sans" data-shot="income-people" data-layout="insight">
  <p class="kicker">수입 구조 · 가까운 사람과 돈 · 스트레스</p>
  <h2 class="part-title serif">구조가 바뀌면 판단도 바뀝니다</h2>
  ${insightHtml(byId("money-income-structure"), glossSeen, "", { usedLines: used })}
  ${insightHtml(byId("money-close-people"), glossSeen, "", { usedLines: used })}
  ${insightHtml(byId("money-stress"), glossSeen, "", { usedLines: used })}
  ${footer(6, total)}
</div>`,
    `<div class="page tint sans" data-shot="rules-final" data-layout="final-portrait">
  <p class="kicker">Money Rules · 초상</p>
  <h2 class="part-title serif">나에게 맞는 규칙</h2>
  ${playbookItems(byId("money-rules").scenes.slice(0, 5))}
  <div class="rule"></div>
  ${portraitBodies(r.finalSummary.portraitNarrative, used, 2)}
  <p class="closing serif">${esc(cleanCustomerText(r.finalSummary.closingLine))}</p>
  ${glossaryCompactHtml(esc, [...glossSeen])}
  ${scopeBlockHtml(esc)}
  <p class="caption" style="margin-top:4px">${esc(r.disclaimer)}</p>
  ${footer(7, total)}
</div>`,
  ].join("\n");
}

function buildCareer(input: {
  nickname: string;
  report: PaidFortuneReport;
  ctx?: FortuneAiContext;
  v2?: InterpretationContextV2;
}): string {
  const r = input.report;
  const s = (k: string) => sectionByKey(r, k);
  const total = 7;
  const used = new Set<string>();
  const reservedDetail = new Set<string>();
  const glossSeen = new Set<string>();
  const evUsed = new Set<string>();
  const strength = s("career_strength_work");
  const friction = s("career_org_friction");
  const overload = s("career_overload");
  const change = s("career_change_signal");
  const pack = buildCareerValuePack(r, input.ctx ?? ({} as FortuneAiContext), input.v2);
  const byId = (id: string) => pack.find((u) => u.id === id)!;
  reserveDetailLines(reservedDetail, pack);
  const primaryShare = r.shareableInsights?.[0] ?? strength?.shareableLine;
  reserveRawLines(reservedDetail, [
    primaryShare,
    ...(strength?.behaviorScenes ?? []),
    ...(friction?.behaviorScenes ?? []),
  ]);
  const envGoodHtml = overviewBodies(
    strength?.behaviorScenes ?? [],
    used,
    reservedDetail,
    glossSeen,
    2
  );
  const envHardHtml = overviewBodies(
    [friction?.coreInsight ?? "", ...(friction?.behaviorScenes ?? [])],
    used,
    reservedDetail,
    glossSeen,
    2
  );
  const lifecycle = [
    {
      n: "01",
      label: "새 업무",
      body:
        overviewClaim(
          used,
          reservedDetail,
          byId("career-start")?.scenes[0] ?? "기준을 먼저 세우려 할 수 있습니다.",
          glossSeen
        ) || "기준을 먼저 세우려 할 수 있습니다.",
    },
    {
      n: "02",
      label: "익숙해짐",
      body: "목표가 말로 정리되면 완성 리듬이 먼저 올라갑니다.",
    },
    {
      n: "03",
      label: "책임 증가",
      body:
        overviewClaim(
          used,
          reservedDetail,
          byId("career-takeon")?.scenes[0] ?? "역할이 흐리면 스스로 더 많이 떠안을 수 있습니다.",
          glossSeen
        ) || "역할이 흐리면 스스로 더 많이 떠안을 수 있습니다.",
    },
    {
      n: "04",
      label: "갈등",
      body: "반복 이슈에서는 경계가 점점 선명해질 수 있습니다.",
    },
    {
      n: "05",
      label: "변화 욕구",
      body:
        overviewClaim(
          used,
          reservedDetail,
          byId("career-hate-vs-fit")?.scenes[0] ?? "기준과 보상이 흐려질 때 이동을 검토하게 됩니다.",
          glossSeen
        ) || "기준과 보상이 흐려질 때 이동을 검토하게 됩니다.",
    },
  ];
  const strengthEv = evidenceBlock({
    v2: input.v2,
    section: strength,
    domainLink: strength?.coreInsight ?? "완료 조건이 보일 때 강점을 꾸준히 발휘하기 쉽습니다.",
    usedSignals: evUsed,
    reportKind: "career",
  });
  const overloadEv = evidenceBlock({
    v2: input.v2,
    section: overload ?? change,
    domainLink: overload?.coreInsight ?? "확인과 책임을 스스로 더 붙들 때 과부하가 시작될 수 있습니다.",
    usedSignals: evUsed,
    reportKind: "career",
  });
  const moments = pack.map((u) => u.moment).filter(Boolean) as string[];

  return [
    coverPage("career", input.nickname, "WORK MANUAL", 1, total),
    `<div class="page tint sans" data-shot="environment" data-layout="two-column">
  <p class="kicker">프로필 · 환경</p>
  <p class="sig serif">${esc(glossFirstMentions(cleanCustomerText(r.signatureStatement), glossSeen))}</p>
  <div class="dash-grid">${dashHtml(r, 4)}</div>
  ${pullQuote(primaryShare)}
  <div class="rule"></div>
  <p class="section-title serif">Work Environment Map</p>
  <div class="env-map">
    <div class="env-side good"><p class="h">강점이 살아남</p>${envGoodHtml}</div>
    <div class="env-side hard"><p class="h">과부하가 커짐</p>${envHardHtml}</div>
  </div>
  ${momentsHtml(moments, glossSeen, 5, [primaryShare ?? ""], {
    used,
    reservedDetail,
    overview: true,
  })}
  ${footer(2, total)}
</div>`,
    `<div class="page paper sans" data-shot="env-start" data-layout="insight">
  <p class="kicker">환경 · 시작 패턴</p>
  <h2 class="part-title serif">일이 살아나는 조건</h2>
  ${insightHtml(byId("career-env"), glossSeen, strengthEv, { usedLines: used })}
  ${insightHtml(byId("career-start"), glossSeen, "", { usedLines: used })}
  <p class="section-title serif">업무 생애주기</p>
  <div class="tl">${lifecycle.map((st) => `<div class="tl-step"><div class="tl-n serif">${st.n}</div><div><p class="tl-label">${esc(st.label)}</p><p class="tl-body">${esc(st.body)}</p></div></div>`).join("")}</div>
  ${footer(3, total)}
</div>`,
    `<div class="page tint sans" data-shot="tangled-boss" data-layout="insight">
  <p class="kicker">꼬임 · 지시 · 협업</p>
  <h2 class="part-title serif">사람과 기준이 겹칠 때</h2>
  ${insightHtml(byId("career-tangled"), glossSeen, "", { usedLines: used })}
  ${insightHtml(byId("career-boss"), glossSeen, "", { usedLines: used })}
  ${insightHtml(byId("career-collab"), glossSeen, "", { usedLines: used })}
  ${footer(4, total)}
</div>`,
    `<div class="page paper sans" data-shot="overload" data-layout="insight">
  <p class="kicker">인정 · 떠맡음 · 과부하</p>
  <h2 class="part-title serif">강점이 그림자가 되는 순간</h2>
  ${insightHtml(byId("career-recognition"), glossSeen, "", { usedLines: used })}
  ${insightHtml(byId("career-takeon"), glossSeen, overloadEv, { usedLines: used })}
  ${footer(5, total)}
</div>`,
    `<div class="page tint sans" data-shot="fit-org" data-layout="insight">
  <p class="kicker">싫증 vs 환경 · 오래 버틸 조건</p>
  <h2 class="part-title serif">떠나기 전에 나누어 볼 것</h2>
  ${insightHtml(byId("career-hate-vs-fit"), glossSeen, "", { usedLines: used })}
  ${insightHtml(byId("career-org"), glossSeen, "", { usedLines: used })}
  ${footer(6, total)}
</div>`,
    `<div class="page paper sans" data-shot="final" data-layout="final-portrait">
  <p class="kicker">플레이북 · 초상</p>
  <h2 class="part-title serif">한 사람으로 다시 묶기</h2>
  ${playbookItems((r.actionItems ?? []).map((a) => `${a.what} — ${a.how}`))}
  <div class="rule"></div>
  ${portraitBodies(r.finalSummary.portraitNarrative, used, 2)}
  <p class="closing serif">${esc(cleanCustomerText(r.finalSummary.closingLine))}</p>
  ${glossaryCompactHtml(esc, [...glossSeen])}
  ${scopeBlockHtml(esc)}
  ${footer(7, total)}
</div>`,
  ].join("\n");
}

function buildLove(input: {
  nickname: string;
  report: PaidFortuneReport;
  ctx?: FortuneAiContext;
  v2?: InterpretationContextV2;
}): string {
  const r = input.report;
  const s = (k: string) => sectionByKey(r, k);
  const total = 7;
  const used = new Set<string>();
  const reservedDetail = new Set<string>();
  const glossSeen = new Set<string>();
  const evUsed = new Set<string>();
  const before = s("love_before");
  const after = s("love_after");
  const fight = s("love_fight");
  const distance = s("love_distance");
  const pack = buildLoveValuePack(r, input.ctx ?? ({} as FortuneAiContext), input.v2);
  const byId = (id: string) => pack.find((u) => u.id === id)!;
  reserveDetailLines(reservedDetail, pack);
  reserveRawLines(reservedDetail, [
    before?.coreInsight,
    after?.coreInsight,
    ...(before?.behaviorScenes ?? []),
    ...(after?.behaviorScenes ?? []),
  ]);
  const lifecycle = [
    {
      n: "호감",
      d:
        overviewClaim(
          used,
          reservedDetail,
          byId("love-open")?.scenes[0] ?? "태도·일관성에서 먼저 반응할 수 있습니다.",
          glossSeen
        ) || "태도·일관성에서 먼저 반응할 수 있습니다.",
    },
    {
      n: "확신",
      d:
        overviewClaim(
          used,
          reservedDetail,
          before?.counterPattern ?? "기준이 채워지면 속도가 바뀌는 전환점이 생길 수 있습니다.",
          glossSeen
        ) || "기준이 채워지면 속도가 바뀌는 전환점이 생길 수 있습니다.",
    },
    {
      n: "친밀",
      d:
        overviewClaim(
          used,
          reservedDetail,
          byId("love-quiet")?.scenes[0] ?? "말로 길게 설명하기보다 실질 준비로 보일 수 있습니다.",
          glossSeen
        ) || "말로 길게 설명하기보다 실질 준비로 보일 수 있습니다.",
    },
    {
      n: "갈등",
      d:
        overviewClaim(
          used,
          reservedDetail,
          byId("love-fight")?.scenes[0] ?? "정리될 때까지 말을 아낄 수 있습니다.",
          glossSeen
        ) || "정리될 때까지 말을 아낄 수 있습니다.",
    },
    {
      n: "회복",
      d: "같은 일이 반복되지 않을 근거가 보이면 회복이 시작될 수 있습니다.",
    },
  ];
  const primaryShare = before?.shareableLine ?? r.shareableInsights?.[0];
  const beforeEv = evidenceBlock({
    v2: input.v2,
    section: before,
    domainLink: before?.coreInsight ?? "관계 정의 전에는 속도를 조절하는 쪽에 가깝습니다.",
    usedSignals: evUsed,
    reportKind: "love",
  });
  const fightEv = evidenceBlock({
    v2: input.v2,
    section: fight ?? distance,
    domainLink: fight?.coreInsight ?? "갈등은 폭발보다 정리와 거리 조절로 먼저 나타날 수 있습니다.",
    usedSignals: evUsed,
    reportKind: "love",
  });
  const moments = (pack.map((u) => u.moment).filter(Boolean) as string[]).filter(
    (m) => !/사과의 크기|재발 방지|다시 가까워질/.test(m)
  );

  const beforeTeaser =
    overviewClaim(used, reservedDetail, before?.coreInsight ?? "", glossSeen) ||
    "확신 전에는 속도를 조절하는 쪽에 가깝습니다.";
  const afterTeaser =
    overviewClaim(used, reservedDetail, after?.coreInsight ?? "", glossSeen) ||
    "확신이 생기면 챙김의 속도가 달라질 수 있습니다.";

  return [
    coverPage("love", input.nickname, "LOVE MANUAL", 1, total),
    `<div class="page tint sans" data-shot="before-after" data-layout="two-column">
  <p class="kicker">프로필 · 확신 전·후</p>
  <p class="sig serif">${esc(glossFirstMentions(cleanCustomerText(r.signatureStatement), glossSeen))}</p>
  <div class="dash-grid">${dashHtml(r, 4)}</div>
  ${pullQuote(primaryShare)}
  <div class="rule"></div>
  <div class="two">
    <div><p class="col-h">확신 전</p><p class="body">${esc(beforeTeaser)}</p>${overviewBodies(before?.behaviorScenes ?? [], used, reservedDetail, glossSeen, 1)}</div>
    <div><p class="col-h">확신 후</p><p class="body">${esc(afterTeaser)}</p>${overviewBodies(after?.behaviorScenes ?? [], used, reservedDetail, glossSeen, 1)}</div>
  </div>
  <p class="section-title serif">Relationship Tempo</p>
  <div class="tempo">${lifecycle.map((st) => `<div class="tempo-step"><p class="n">${esc(st.n)}</p><p class="d">${esc(st.d)}</p></div>`).join("")}</div>
  ${momentsHtml(moments, glossSeen, 5, [primaryShare ?? ""], {
    used,
    reservedDetail,
    overview: true,
  })}
  ${footer(2, total)}
</div>`,
    `<div class="page paper sans" data-shot="open-check" data-layout="insight">
  <p class="kicker">열림 · 확인 · 표현</p>
  <h2 class="part-title serif">마음이 움직이는 방식</h2>
  ${insightHtml(byId("love-before-after"), glossSeen, beforeEv, { usedLines: used })}
  ${insightHtml(byId("love-open"), glossSeen, "", { usedLines: used })}
  ${insightHtml(byId("love-check"), glossSeen, "", { usedLines: used })}
  ${footer(3, total)}
</div>`,
    `<div class="page tint sans" data-shot="quiet-felt" data-layout="insight">
  <p class="kicker">티가 덜 나는 순간 · 사랑받는 감각 · 서운함</p>
  <h2 class="part-title serif">가까이 있을수록</h2>
  ${insightHtml(byId("love-quiet"), glossSeen, "", { usedLines: used })}
  ${insightHtml(byId("love-felt"), glossSeen, "", { usedLines: used })}
  ${insightHtml(byId("love-hurt"), glossSeen, "", { usedLines: used })}
  ${footer(4, total)}
</div>`,
    `<div class="page paper sans" data-shot="fight-resolve" data-layout="insight">
  <p class="kicker">갈등 · 회복</p>
  <h2 class="part-title serif">멀어질 때 / 돌아올 때</h2>
  ${insightHtml(byId("love-fight"), glossSeen, fightEv, { usedLines: used })}
  ${insightHtml(byId("love-resolve"), glossSeen, "", { usedLines: used })}
  ${footer(5, total)}
</div>`,
    `<div class="page tint sans" data-shot="long-misread" data-layout="pair-compare">
  <p class="kicker">오래될수록 · 오해 지점</p>
  <h2 class="part-title serif">상대에게 다르게 읽히기 쉬운 나</h2>
  <div class="pair-compare">
  ${insightHtml(byId("love-long"), glossSeen, "", { usedLines: used })}
  ${insightHtml(byId("love-misread"), glossSeen, "", { usedLines: used })}
  </div>
  ${footer(6, total)}
</div>`,
    `<div class="page paper sans" data-shot="final" data-layout="final-portrait">
  <p class="kicker">플레이북 · 초상</p>
  <h2 class="part-title serif">한 사람으로 다시 묶기</h2>
  ${playbookItems((r.actionItems ?? []).map((a) => `${a.what} — ${a.how}`))}
  <div class="rule"></div>
  ${portraitBodies(r.finalSummary.portraitNarrative, used, 2)}
  <p class="closing serif">${esc(cleanCustomerText(r.finalSummary.closingLine))}</p>
  ${glossaryCompactHtml(esc, [...glossSeen])}
  ${scopeBlockHtml(esc)}
  ${footer(7, total)}
</div>`,
  ].join("\n");
}


function sajuSignalsFromV2(v2: InterpretationContextV2 | undefined, ctx: FortuneAiContext) {
  // Domain-neutral FACT + customer meaning from evidence descriptions only.
  if (v2?.evidenceRegistry?.length) {
    const slots: {
      types: EvidenceRecord["type"][];
      why: (ev: EvidenceRecord) => string;
    }[] = [
      {
        types: ["DAY_MASTER", "YIN_YANG_PATTERN"],
        why: (ev) => sajuMapCustomerMeaning(ev),
      },
      {
        types: ["ELEMENT_DOMINANCE", "ELEMENT_SCARCITY"],
        why: (ev) => sajuMapCustomerMeaning(ev),
      },
      {
        types: ["TEN_GOD_DISTRIBUTION", "PILLAR_TEN_GOD", "PILLAR_SYMBOL"],
        why: (ev) => sajuMapCustomerMeaning(ev),
      },
    ];

    const usedDesc = new Set<string>();
    const usedWhy = new Set<string>();
    const out: { h: string; w: string }[] = [];

    for (const slot of slots) {
      const ev = slot.types
        .map((t) => v2.evidenceRegistry.find((e) => e.type === t))
        .find((e): e is EvidenceRecord => !!e);
      if (!ev) continue;
      const h = cleanCustomerText(ev.description);
      let w = cleanCustomerText(slot.why(ev));
      if (!isSafeForKind(w, "total")) w = sajuMapCustomerMeaning(ev);
      if (
        hasInternalAxisJargon(w) ||
        findTautologyCopy(w).length
      ) {
        w = sajuMapCustomerMeaning(ev);
      }
      if (usedDesc.has(h.slice(0, 20))) continue;
      if (usedWhy.has(w.slice(0, 24))) continue;
      usedDesc.add(h.slice(0, 20));
      usedWhy.add(w.slice(0, 24));
      out.push({ h, w });
      if (out.length >= 3) break;
    }

    if (out.length >= 3) return out.slice(0, 3);
  }
  return [
    {
      h: `${ctx.dayMaster.stem}(${ctx.dayMaster.hangul}) 일간`,
      w: "판단·행동의 출발점이라, 같은 상황에서도 기준을 먼저 세우는 쪽으로 반응하기 쉽습니다.",
    },
    {
      h: "오행 분포",
      w: "가장 많은 기운과 적은 기운의 차이가, 어떤 반응이 먼저 앞서는지를 가르는 단서가 됩니다.",
    },
    {
      h: "십성·기둥 패턴",
      w: "같은 십성이 반복되거나 기둥에 놓이면, 책임·확인·거리 조절 같은 패턴이 장면 선택에 영향을 줍니다.",
    },
  ];
}

function buildTotal(input: {
  nickname: string;
  report: PaidFortuneReport;
  ctx: FortuneAiContext;
  v2?: InterpretationContextV2;
}): string {
  const r = input.report;
  const ctx = input.ctx;
  const s = (k: string) => sectionByKey(r, k);
  const total = 11;
  const used = new Set<string>();
  const reservedDetail = new Set<string>();
  const glossSeen = new Set<string>();
  const fe = ctx.fiveElements;
  const maxFe = Math.max(fe.wood, fe.fire, fe.earth, fe.metal, fe.water, 1);
  const pack = buildTotalValuePack(r, ctx, input.v2);
  reserveDetailLines(reservedDetail, pack.unknownPatterns);
  reserveDetailLines(reservedDetail, pack.situations);
  reserveDetailLines(reservedDetail, pack.usage);
  reserveDetailLines(reservedDetail, pack.counters);
  reserveRawLines(reservedDetail, pack.moments);

  const elementOf = (stem: string) => {
    const map: Record<string, string> = {
      甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
      己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
    };
    return map[stem] ?? "";
  };

  const pillar = (
    label: string,
    stem: string,
    branch: string,
    tgS: string,
    tgB: string,
    missing?: boolean
  ) => {
    if (missing) {
      return `<div class="pillar missing"><p class="pl">${label}</p><p class="gan">時</p><p class="zhi">미상</p><p class="meta">출생시간 미상</p></div>`;
    }
    return `<div class="pillar"><p class="pl">${label}</p><p class="gan">${esc(stem)}</p><p class="zhi">${esc(branch)}</p><p class="meta">五行 ${esc(elementOf(stem))}<br/>十星 ${esc(tgS)} · ${esc(tgB)}</p></div>`;
  };

  const pillars = ctx.birthTimeUnknown
    ? [
        pillar("年柱", ctx.pillars.year.stem, ctx.pillars.year.branch, ctx.tenGods.year.stem, ctx.tenGods.year.branch),
        pillar("月柱", ctx.pillars.month.stem, ctx.pillars.month.branch, ctx.tenGods.month.stem, ctx.tenGods.month.branch),
        pillar("日柱", ctx.pillars.day.stem, ctx.pillars.day.branch, ctx.tenGods.day.stem, ctx.tenGods.day.branch),
        pillar("時柱", "", "", "", "", true),
      ]
    : [
        pillar("年柱", ctx.pillars.year.stem, ctx.pillars.year.branch, ctx.tenGods.year.stem, ctx.tenGods.year.branch),
        pillar("月柱", ctx.pillars.month.stem, ctx.pillars.month.branch, ctx.tenGods.month.stem, ctx.tenGods.month.branch),
        pillar("日柱", ctx.pillars.day.stem, ctx.pillars.day.branch, ctx.tenGods.day.stem, ctx.tenGods.day.branch),
        pillar("時柱", ctx.pillars.hour!.stem, ctx.pillars.hour!.branch, ctx.tenGods.hour!.stem, ctx.tenGods.hour!.branch),
      ];

  const feBars = [
    { l: "木", n: fe.wood },
    { l: "火", n: fe.fire },
    { l: "土", n: fe.earth },
    { l: "金", n: fe.metal },
    { l: "水", n: fe.water },
  ]
    .map(
      (x) =>
        `<div class="fe-item"><div class="b" style="height:${Math.round((x.n / maxFe) * 48)}px"></div><div class="t">${x.l}</div><div class="n">${x.n}</div></div>`
    )
    .join("");

  const dmLabel = cleanCustomerText(r.blueprint?.dayMasterPlain ?? "");
  const signals = sajuSignalsFromV2(input.v2, ctx);
  const decision = s("total_v4_decision");
  const relation = s("total_v4_relationship");
  const love = s("total_v4_love");
  const work = s("total_v4_work");
  const money = s("total_v4_money_link");

  const primaryShare = r.shareableInsights?.find((x) => !/가까워진 뒤/.test(x)) ?? decision?.shareableLine;
  const secondShare = r.contradictions?.[0]
    ? contradictionShareLine(r.contradictions[0].poleA, r.contradictions[0].poleB)
    : r.shareableInsights?.[1];

  const contraHtml = (r.contradictions ?? [])
    .slice(0, 3)
    .map(
      (c) =>
        `<div class="contra"><div class="contra-poles serif"><span>${esc(c.poleA)}</span><span class="sep">↔</span><span>${esc(c.poleB)}</span></div><p class="body">${esc(c.howItShows)}</p>${c.upside ? `<p class="caption">빛나는 면 · ${esc(c.upside)}</p>` : ""}${c.downside ? `<p class="caption">그림자 · ${esc(c.downside)}</p>` : ""}</div>`
    )
    .join("");

  const shadowHtml = (r.strengthShadows ?? [])
    .slice(0, 3)
    .map(
      (sh) =>
        `<div class="shadow-row">
  <div class="sc"><p class="lab">강점</p><p class="val">${esc(cleanCustomerText(sh.strength))}</p></div>
  <div class="sc"><p class="lab">과해질 때</p><p class="val">${esc(cleanCustomerText(sh.overuse))}</p></div>
  <div class="sc"><p class="lab">균형</p><p class="val">${esc(cleanCustomerText(sh.balancePoint ?? ""))}</p></div>
</div>`
    )
    .join("");

  const oiHtml = pack.outerInner
    .map(
      (row) =>
        `<div class="oi-row"><div><p class="lab">겉으로</p><p class="val">${esc(cleanCustomerText(row.outer))}</p></div><div><p class="lab">속에서는</p><p class="val">${esc(cleanCustomerText(row.inner))}</p></div></div>`
    )
    .join("");

  return [
    coverPage("total", input.nickname, "PERSONAL FOUR PILLARS", 1, total),
    `<div class="page paper sans" data-shot="core-inner" data-layout="editorial-feature">
  <p class="kicker">핵심 프로필 · 판단 · 스트레스</p>
  <p class="sig serif">${esc(glossFirstMentions(cleanCustomerText(r.signatureStatement), glossSeen))}</p>
  <div class="dash-grid">${dashHtml(r, 6)}</div>
  ${pullQuote(primaryShare)}
  <div class="rule"></div>
  ${insightHtml(pack.unknownPatterns[0]!, glossSeen, "", { usedLines: used, omitMoment: true })}
  ${insightHtml(pack.unknownPatterns[1]!, glossSeen, "", { usedLines: used })}
  ${footer(2, total)}
</div>`,
    `<div class="page tint sans" data-shot="saju-map" data-layout="saju-map">
  <p class="kicker">나의 사주 지도</p>
  <h2 class="part-title serif">四柱</h2>
  <p class="caption">日干 ${esc(ctx.dayMaster.stem)}${ctx.dayMaster.hangul && ctx.dayMaster.hangul !== ctx.dayMaster.stem ? ` (${esc(ctx.dayMaster.hangul)})` : ""}${dmLabel ? ` · ${esc(dmLabel)}` : ""}</p>
  <div class="legend"><span>天干 · 위</span><span>地支 · 아래</span><span>五行 / 十星 · 하단</span></div>
  <div class="saju-map"><div class="pillar-row">${pillars.join("")}</div></div>
  <p class="kicker">五行 Snapshot</p>
  <div class="fe-strip">${feBars}</div>
  <p class="kicker">이 명식에서 눈여겨볼 구조</p>
  ${signals.map((sg) => `<div class="signal"><p class="h">${esc(cleanCustomerText(sg.h))}</p><p class="w">${esc(glossFirstMentions(cleanCustomerText(sg.w), glossSeen))}</p></div>`).join("")}
  ${footer(3, total)}
</div>`,
    `<div class="page paper sans" data-shot="unknown-patterns" data-layout="insight">
  <p class="kicker">나도 몰랐던 내 패턴</p>
  <h2 class="part-title serif">헐, 나인데?</h2>
  ${momentsHtml(pack.moments, glossSeen, 8, [primaryShare ?? ""], {
    used,
    reservedDetail,
    overview: true,
  })}
  ${footer(4, total)}
</div>`,
    `<div class="page tint sans" data-shot="outer-inner" data-layout="insight">
  <p class="kicker">겉으로 보이는 나 vs 속의 나</p>
  <h2 class="part-title serif">같은 사람의 두 얼굴</h2>
  ${oiHtml}
  ${footer(5, total)}
</div>`,
    `<div class="page paper sans" data-shot="situations" data-layout="insight">
  <p class="kicker">상황에 따라 달라지는 나</p>
  <h2 class="part-title serif">평소 · 압박 · 익숙함 · 낯선 곳 · 깊어진 뒤</h2>
  ${pack.situations.map((u) => insightHtml(u, glossSeen, "", { usedLines: used })).join("")}
  ${footer(6, total)}
</div>`,
    `<div class="page tint sans" data-shot="usage" data-layout="insight">
  <p class="kicker">관계 · 일 · 돈 · 스트레스 사용법</p>
  <h2 class="part-title serif">어떻게 써먹을까</h2>
  ${pack.usage.map((u) => insightHtml(u, glossSeen, "", { usedLines: used })).join("")}
  ${footer(7, total)}
</div>`,
    `<div class="page paper sans" data-shot="domains" data-layout="two-column">
  <p class="kicker">관계 · 사랑 · 일 · 돈</p>
  <h2 class="part-title serif">영역마다 어떻게 다르게 보이나</h2>
  <div class="two">
    <div><p class="col-h">관계</p><p class="body">${esc(cleanCustomerText(relation?.coreInsight ?? ""))}</p>${bodies(dedupeLines(relation?.behaviorScenes ?? [], used, 1))}</div>
    <div><p class="col-h">사랑</p><p class="body">${esc(cleanCustomerText(love?.coreInsight ?? ""))}</p>${bodies(dedupeLines(love?.behaviorScenes ?? [], used, 1))}</div>
  </div>
  <div class="two" style="margin-top:10px">
    <div><p class="col-h">일할 때</p><p class="body">${esc(cleanCustomerText(work?.coreInsight ?? ""))}</p>${bodies(dedupeLines(work?.behaviorScenes ?? [], used, 1))}</div>
    <div><p class="col-h">돈을 대할 때</p><p class="body">${esc(cleanCustomerText(money?.coreInsight ?? ""))}</p>${bodies(dedupeLines(money?.behaviorScenes ?? [], used, 1))}</div>
  </div>
  <div class="imap" style="margin-top:12px">
    <div class="imap-head">Cross-domain Map</div>
    ${(r.profileDashboard ?? []).slice(0, 4).map((d) => `<div class="imap-row"><span class="lab">${esc(d.label)}</span><span>${esc(d.value)}</span></div>`).join("")}
  </div>
  ${footer(8, total)}
</div>`,
    `<div class="page tint sans" data-shot="contradiction" data-layout="contradiction">
  <p class="kicker">모순 · 반전</p>
  <h2 class="part-title serif">두 힘이 충돌할 때</h2>
  ${contraHtml}
  <div class="rule"></div>
  ${pack.counters.map((u) => insightHtml(u, glossSeen, "", { usedLines: used })).join("")}
  ${pullQuote(secondShare && secondShare !== primaryShare ? secondShare : undefined)}
  ${footer(9, total)}
</div>`,
    `<div class="page paper sans" data-shot="shadow" data-layout="strength-shadow">
  <p class="kicker">강점의 그림자</p>
  <h2 class="part-title serif">빛나는 만큼 조심할 곳</h2>
  <div class="shadow-compare">
  <div class="shadow-head"><span>강점</span><span>과해질 때</span><span>균형</span></div>
  ${shadowHtml}
  </div>
  ${footer(10, total)}
</div>`,
    `<div class="page tint sans" data-shot="final" data-layout="final-portrait">
  <p class="kicker">플레이북 · 최종 초상</p>
  <h2 class="part-title serif">한 사람으로 다시 묶기</h2>
  ${playbookItems(
    s("total_v4_playbook")?.behaviorScenes ?? r.actionItems?.map((a) => `${a.what} — ${a.how}`) ?? []
  )}
  <div class="rule"></div>
  ${portraitBodies(r.finalSummary.portraitNarrative, used, 3)}
  <p class="closing serif">${esc(cleanCustomerText(r.finalSummary.closingLine))}</p>
  ${glossaryCompactHtml(esc, [...glossSeen])}
  ${scopeBlockHtml(esc)}
  <p class="caption" style="margin-top:4px">${esc(r.disclaimer)}</p>
  ${footer(11, total)}
</div>`,
  ].join("\n");
}


export function buildPaidReportPdfHtmlV5(input: {
  nickname: string;
  productName: string;
  productSlug: string;
  report: PaidFortuneReport;
  ctx: FortuneAiContext;
  v2?: InterpretationContextV2;
}): string {
  const slug = input.productSlug;
  let body: string;
  if (slug.includes("money")) {
    body = buildMoney({ ...input, ctx: input.ctx });
  } else if (slug.includes("career")) {
    body = buildCareer({ ...input, ctx: input.ctx });
  } else if (slug.includes("love")) {
    body = buildLove({ ...input, ctx: input.ctx });
  } else {
    body = buildTotal(input);
  }

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>${esc(input.productName)} — 運의結</title>
${v5FontsHead()}
<style>${v5BaseCss()}</style>
</head>
<body class="sans">
${body}
</body>
</html>`;
}
