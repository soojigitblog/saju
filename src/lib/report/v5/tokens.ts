/**
 * PHASE P3 — Premium Editorial Design System V5 tokens.
 * Deep Navy / Warm Ivory / Near Black / Antique Gold / Warm Gray.
 * Gold is accent only.
 */

export const V5_COLORS = {
  navy: "#0a1628",
  navyMid: "#132238",
  ivory: "#f7f2e8",
  ivoryAlt: "#faf7f1",
  paper: "#fffdf8",
  nearBlack: "#12141a",
  ink: "#1c2230",
  body: "#2c3340",
  warmGray: "#6e675c",
  muted: "#8a8276",
  line: "#ddd4c4",
  lineSoft: "#ebe4d8",
  gold: "#a8893d",
  goldSoft: "#c4a85a",
  goldDim: "rgba(168,137,61,0.35)",
} as const;

export const V5_FONTS = {
  serif: '"Noto Serif KR", "Nanum Myeongjo", serif',
  sans: 'Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
} as const;

/** Cover title without “나의 … 나의 …” duplication. */
export function coverTitleForProduct(
  nickname: string,
  kind: "money" | "career" | "love" | "total" | "tarot"
): { brandLine: string; titleLines: string[] } {
  const short =
    kind === "money"
      ? "돈 사용설명서"
      : kind === "career"
        ? "일 사용설명서"
        : kind === "love"
          ? "연애 사용설명서"
          : kind === "tarot"
            ? "사주×타로 심층 교차리딩"
            : "사주 사용설명서";
  return {
    brandLine: "運의結",
    titleLines: [`${nickname}님의`, short],
  };
}

export const KNOWN_PARTICLE_ERRORS = [
  /겁재이/,
  /겁재은/,
  /식신이/,
  /비견이(?!라)/,
  /조율와/,
  /확정가/,
  /구조은/,
  /관계은/,
  /정체은/,
  /되고와/,
  /두드러지고와/,
  /상대적으로 적고와/,
  /반대로\s+,/,
  /상대에게는\s*상대는/,
  /일간\s*[甲乙丙丁戊己庚辛壬癸][가-힣]{1,3}(과|와)/,
  /경님/,
  /갑님/,
  /을님/,
  /병님/,
  /정님/,
  /무님/,
  /기님/,
  /신님/,
  /임님/,
  /계님/,
];
