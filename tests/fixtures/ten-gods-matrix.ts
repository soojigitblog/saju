import type { TenGodLabel } from "@/lib/fortune-engine/types";
import frozen from "./ten-gods-matrix.json";

/**
 * Frozen 10×10 ten-god expected table (dayMaster row × target stem col).
 * Hand-authored from element/yinYang rules — not generated from manseryeok at runtime.
 */
export const TEN_GODS_EXPECTED_MATRIX = frozen as TenGodLabel[][];

export function assertTenGodsMatrixShape(matrix: TenGodLabel[][]) {
  if (matrix.length !== 10) throw new Error("expected 10 rows");
  for (let i = 0; i < 10; i++) {
    if (matrix[i].length !== 10) throw new Error("expected 10 cols");
    if (matrix[i][i] !== "일간") throw new Error(`diagonal ${i} must be 일간`);
  }
}
