import type { FortuneAiContext } from "@/lib/ai/types";

export type ProfileScaleLevel = "low" | "mid" | "high";

export type ProfileScale = {
  label: string;
  level: ProfileScaleLevel;
  leftLabel: string;
  rightLabel: string;
  note: string;
};

function levelFromRatio(ratio: number): ProfileScaleLevel {
  if (ratio <= 0.35) return "low";
  if (ratio >= 0.65) return "high";
  return "mid";
}

/** Rule-based qualitative money profile — no arbitrary scores. */
export function buildMoneyProfileScales(ctx: FortuneAiContext): ProfileScale[] {
  const fe = ctx.fiveElements;
  const total = fe.wood + fe.fire + fe.earth + fe.metal + fe.water || 1;
  const metalR = fe.metal / total;
  const earthR = fe.earth / total;
  const fireR = fe.fire / total;
  const waterR = fe.water / total;

  const stability = levelFromRatio(earthR + metalR);
  const control = levelFromRatio(metalR + earthR * 0.5);
  const riskAppetite = levelFromRatio(fireR + waterR * 0.6);
  const structurePref = levelFromRatio(metalR + earthR);

  return [
    {
      label: "안정 추구",
      level: stability,
      leftLabel: "변화 쪽",
      rightLabel: "안정 쪽",
      note: `土${fe.earth}·金${fe.metal} 상대 비중`,
    },
    {
      label: "통제 욕구",
      level: control,
      leftLabel: "흐름 맡김",
      rightLabel: "직접 통제",
      note: `金${fe.metal} 기운 + 土 보조`,
    },
    {
      label: "리스크 대응",
      level: riskAppetite,
      leftLabel: "회피",
      rightLabel: "감수",
      note: `火${fe.fire}·水${fe.water} 상대 비중`,
    },
    {
      label: "수입 구조 선호",
      level: structurePref,
      leftLabel: "변동·성과형",
      rightLabel: "정기·구조형",
      note: `金·土 우세 시 구조·검수 선호`,
    },
    {
      label: "돈 결정 속도",
      level: metalR > fireR ? "low" : fireR > metalR + 0.15 ? "high" : "mid",
      leftLabel: "빠른 결정",
      rightLabel: "확인 후 결정",
      note: `火 vs 金 상대 분포`,
    },
  ];
}
