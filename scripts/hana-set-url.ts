/**
 * Save tx inquiry URL from CLI argument (when auto-detect misses).
 *
 * Usage:
 *   npm run bank:hana:set-url -- "https://banking.kebhana.com/..."
 */
import { writeSavedTxInquiryUrl } from "../src/lib/bank/hana/playwright/session-paths";
import { HANA_BANKING_ORIGIN } from "../src/lib/bank/hana/playwright/config";

const url = process.argv[2]?.trim();
if (!url || !url.startsWith(HANA_BANKING_ORIGIN)) {
  console.error(
    `[bank:hana:set-url] Usage: npm run bank:hana:set-url -- "${HANA_BANKING_ORIGIN}/..."`
  );
  process.exit(1);
}

writeSavedTxInquiryUrl(url);
console.log(`[bank:hana:set-url] Saved (${url.length} chars)`);
