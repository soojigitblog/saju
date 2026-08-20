import "server-only";

import { randomUUID } from "crypto";

/**
 * Guest session identifiers must be unpredictable.
 * Do NOT use sequential integers or short guessable strings.
 *
 * Note: guest_session_id is a correlation id for ownership linking,
 * NOT sufficient proof for viewing paid reports.
 * Paid report access uses orders.access_token_hash (PHASE 6).
 */
export function createGuestSessionId(): string {
  return randomUUID();
}
