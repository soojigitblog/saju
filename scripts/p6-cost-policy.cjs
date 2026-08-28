/**
 * Pre-launch cost policy — GEMINI_API_KEY_PAID intentionally deferred until
 * first real paid customer or explicit user approval.
 */

function isPaidKeyConfigured(env = process.env) {
  return Boolean(env.GEMINI_API_KEY_PAID?.trim());
}

/** SET | NOT_CONFIGURED_BY_POLICY (never prints values) */
function paidKeyStatus(env = process.env) {
  return isPaidKeyConfigured(env) ? "SET" : "NOT_CONFIGURED_BY_POLICY";
}

/** Paid Gemini activation gate — separate from infrastructure recovery */
function paidGeminiActivationStatus(env = process.env) {
  return isPaidKeyConfigured(env)
    ? "READY"
    : "DEFERRED_BY_COST_POLICY";
}

module.exports = {
  isPaidKeyConfigured,
  paidKeyStatus,
  paidGeminiActivationStatus,
};
