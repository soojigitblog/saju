import "server-only";

import {
  isPaidCheckoutEnabled,
  isPaidReportGenerationEnabled,
} from "@/lib/ai/config";
import { isBankTransferAccountConfigured } from "@/lib/bank/account-public";
import { isPaidGeminiKeyConfigured } from "@/lib/services/paid-report-generation-readiness";

/** Safe, secret-free snapshot for deployment smoke / ops dashboards. */
export type ZeroCostLaunchPolicySnapshot = {
  paidCheckoutEnabled: boolean;
  paidGenerationEnabled: boolean;
  paidGeminiKeyConfigured: boolean;
  bankTransferConfigured: boolean;
  appEnv: string;
  nodeEnv: string;
};

export function getZeroCostLaunchPolicySnapshot(): ZeroCostLaunchPolicySnapshot {
  return {
    paidCheckoutEnabled: isPaidCheckoutEnabled(),
    paidGenerationEnabled: isPaidReportGenerationEnabled(),
    paidGeminiKeyConfigured: isPaidGeminiKeyConfigured(),
    bankTransferConfigured: isBankTransferAccountConfigured(),
    appEnv: (process.env.APP_ENV ?? "").trim() || "unset",
    nodeEnv: process.env.NODE_ENV ?? "unset",
  };
}

export function isZeroCostProductionPolicy(
  snapshot: ZeroCostLaunchPolicySnapshot
): boolean {
  return (
    snapshot.paidCheckoutEnabled &&
    !snapshot.paidGenerationEnabled &&
    !snapshot.paidGeminiKeyConfigured
  );
}
