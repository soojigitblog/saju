import "server-only";

import { isPaidCheckoutEnabled } from "@/lib/ai/config";
import { isTossTestSandboxCheckoutAllowed } from "@/lib/payments/toss-sandbox";

export {
  isTossCheckoutAllowed,
  isTossTestKeyPair,
  isNonProductionAppEnv,
  isTossTestSandboxCheckoutAllowed,
} from "@/lib/payments/toss-sandbox";

export function isCustomerPaidCheckoutOpen(): boolean {
  return isPaidCheckoutEnabled() || isTossTestSandboxCheckoutAllowed();
}
