import path from "node:path";

/** Official Hana personal banking entry (no third-party sites). */
export const HANA_BANKING_ORIGIN = "https://banking.kebhana.com";

export function hanaSessionRoot(): string {
  return (
    process.env.HANA_BANK_SESSION_DIR?.trim() ||
    path.join(process.cwd(), ".playwright-hana")
  );
}

export function hanaProfileDir(): string {
  return path.join(hanaSessionRoot(), "profile");
}

export function hanaTxInquiryUrlFile(): string {
  return path.join(hanaSessionRoot(), "tx-inquiry-url.txt");
}

export function hanaPollIntervalMs(): number {
  const seconds = Number(
    process.env.BANK_POLL_INTERVAL_SECONDS ??
      process.env.BANK_POLL_INTERVAL_MS
        ? Number(process.env.BANK_POLL_INTERVAL_MS) / 1000
        : 120
  );
  const ms =
    process.env.BANK_POLL_INTERVAL_MS && !process.env.BANK_POLL_INTERVAL_SECONDS
      ? Number(process.env.BANK_POLL_INTERVAL_MS)
      : seconds * 1000;
  return Math.max(60_000, Math.min(180_000, Number.isFinite(ms) ? ms : 120_000));
}

export function isHanaAutomationEnabled(): boolean {
  return (
    process.env.HANA_BANK_AUTOMATION_ENABLED === "1" &&
    (process.env.BANK_PROVIDER ?? "").toLowerCase() === "hana"
  );
}

export function configuredTransferAccountNumber(): string | null {
  const n = process.env.BANK_TRANSFER_ACCOUNT_NUMBER?.trim();
  return n || null;
}

/** Digits only — never log full account in production paths. */
export function normalizeAccountDigits(account: string): string {
  return account.replace(/\D/g, "");
}

export function accountNumbersMatch(
  configured: string,
  observed: string
): boolean {
  const a = normalizeAccountDigits(configured);
  const b = normalizeAccountDigits(observed);
  if (!a || !b) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
}

export function maskAccountNumber(account: string): string {
  const d = normalizeAccountDigits(account);
  if (d.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, d.length - 4))}${d.slice(-4)}`;
}
