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

/**
 * Allows a read-only, pre-payment checkout review for a PG assessor.
 *
 * This deliberately does not relax the customer checkout or order-creation
 * gates above. The review route fetches the live product catalog on the
 * server, but cannot create an order or invoke a payment provider.
 */
export function isPgReviewMode(): boolean {
  const value = process.env.PG_REVIEW_MODE?.trim().toLowerCase();
  return value === "true" || value === "1";
}
