/**
 * Question validation + dangerous-topic guard for tarot (PHASE T1).
 * No AI imports.
 */

const MAX_QUESTION_LEN = 200;

const DANGEROUS_PATTERNS: RegExp[] = [
  /암\s*진단|질병\s*진단|수술\s*결과|임신\s*했|임신\s*여부|태아\s*성별|남아|여아\s*낳/,
  /언제\s*죽|죽을까|사망|사고\s*날|교통사고\s*날/,
  /살인|범죄|감옥|판결|유죄|무죄/,
  /주식\s*사|코인\s*사|종목\s*추천|도박|로또\s*번호|대출\s*승인|파산/,
  /자해|자살|타해|살해/,
  /바람\s*피우|외도\s*했|실종.*살|생사/,
];

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|above)\s+instructions/i,
  /system\s*prompt/i,
  /<\/?\s*script/i,
  /\{\{.*\}\}/,
];

export function sanitizeQuestionText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_QUESTION_LEN);
}

export function validateTarotQuestion(input: {
  category: string;
  questionText?: string | null;
}): { ok: true; questionText: string | null } | { ok: false; code: string; message: string } {
  const allowed = ["money", "career", "love", "relationships", "advice", "custom"];
  if (!allowed.includes(input.category)) {
    return { ok: false, code: "INVALID_CATEGORY", message: "질문 카테고리를 확인해 주세요." };
  }

  if (input.category !== "custom") {
    return { ok: true, questionText: null };
  }

  const cleaned = sanitizeQuestionText(input.questionText ?? "");
  if (cleaned.length < 4) {
    return { ok: false, code: "QUESTION_TOO_SHORT", message: "질문을 조금 더 구체적으로 적어 주세요." };
  }
  if ([...cleaned].length > MAX_QUESTION_LEN) {
    return { ok: false, code: "QUESTION_TOO_LONG", message: "질문은 200자 이내로 적어 주세요." };
  }

  for (const re of INJECTION_PATTERNS) {
    if (re.test(cleaned)) {
      return { ok: false, code: "INVALID_QUESTION", message: "질문을 다시 작성해 주세요." };
    }
  }

  const danger = findDangerous(cleaned);
  if (danger) {
    return {
      ok: false,
      code: "UNSAFE_QUESTION",
      message:
        "이 질문은 운의결에서 카드로 판단하기 어려운 내용이에요. 관계, 선택, 감정, 일, 돈의 방향처럼 현재의 고민을 중심으로 질문해 주세요.",
    };
  }

  return { ok: true, questionText: cleaned };
}

function findDangerous(text: string): boolean {
  return DANGEROUS_PATTERNS.some((re) => re.test(text));
}

export { MAX_QUESTION_LEN, DANGEROUS_PATTERNS };
