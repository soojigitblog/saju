import { NextResponse } from "next/server";
import {
  getZeroCostLaunchPolicySnapshot,
  isZeroCostProductionPolicy,
} from "@/lib/ops/zero-cost-launch-policy";

export const dynamic = "force-dynamic";

/** Public, secret-free deployment policy probe for P7 smoke. */
export async function GET() {
  const policy = getZeroCostLaunchPolicySnapshot();
  return NextResponse.json({
    zeroCostLaunch: isZeroCostProductionPolicy(policy),
    paidCheckoutEnabled: policy.paidCheckoutEnabled,
    paidGenerationEnabled: policy.paidGenerationEnabled,
    paidGeminiKeyConfigured: policy.paidGeminiKeyConfigured,
    bankTransferConfigured: policy.bankTransferConfigured,
    appEnv: policy.appEnv,
  });
}
