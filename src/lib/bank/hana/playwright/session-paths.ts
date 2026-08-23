import fs from "node:fs";
import {
  hanaProfileDir,
  hanaSessionRoot,
  hanaTxInquiryUrlFile,
} from "@/lib/bank/hana/playwright/config";

export function sessionProfileExists(): boolean {
  try {
    return fs.existsSync(hanaProfileDir());
  } catch {
    return false;
  }
}

export function readSavedTxInquiryUrl(): string | null {
  try {
    const raw = fs.readFileSync(hanaTxInquiryUrlFile(), "utf8").trim();
    return raw || null;
  } catch {
    return null;
  }
}

export function writeSavedTxInquiryUrl(url: string): void {
  fs.mkdirSync(hanaSessionRoot(), { recursive: true });
  fs.writeFileSync(hanaTxInquiryUrlFile(), url.trim(), "utf8");
}

export function assertSessionReady(): void {
  if (!sessionProfileExists()) {
    throw new Error("HANA_SESSION_PROFILE_MISSING");
  }
  if (!readSavedTxInquiryUrl()) {
    throw new Error("HANA_TX_URL_MISSING");
  }
}
