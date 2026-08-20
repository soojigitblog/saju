import type { Pillar } from "../types";
import {
  branchByHanja,
  branchByHangul,
  stemByHanja,
  stemByHangul,
} from "../constants";

export function pillarFromHangulGanji(hangul: string): Pillar {
  if (hangul.length !== 2) {
    throw new Error(`Invalid hangul ganji: ${hangul}`);
  }
  const stem = stemByHangul(hangul[0]);
  const branch = branchByHangul(hangul[1]);
  return {
    stem,
    branch,
    ganji: {
      hangul: `${stem.hangul}${branch.hangul}`,
      hanja: `${stem.hanja}${branch.hanja}`,
    },
  };
}

export function pillarFromHanjaGanji(hanja: string): Pillar {
  if (hanja.length !== 2) {
    throw new Error(`Invalid hanja ganji: ${hanja}`);
  }
  const stem = stemByHanja(hanja[0]);
  const branch = branchByHanja(hanja[1]);
  return {
    stem,
    branch,
    ganji: {
      hangul: `${stem.hangul}${branch.hangul}`,
      hanja: `${stem.hanja}${branch.hanja}`,
    },
  };
}
