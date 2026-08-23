import type { HanaRawIncomingRow } from "@/lib/bank/hana/types";

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(Math.abs(value));
  }
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(Math.abs(n)) : null;
}

function parseOccurredAt(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .replace(/\./g, "-")
    .replace(/\s+/g, " ")
    .replace(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::\d{2})?/, "$1T$2:00+09:00");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function isDepositLike(record: Record<string, unknown>): boolean {
  const direction = String(
    record.direction ??
      record.tranType ??
      record.txType ??
      record.inoutType ??
      record.rmk ??
      record.summary ??
      ""
  );
  if (/출금|지급|DEBIT|OUT/i.test(direction)) return false;
  if (/입금|CREDIT|IN|수취|받/i.test(direction)) return true;

  const depositAmt = parseAmount(
    record.depositAmount ?? record.deposit ?? record.inAmt ?? record.crAmt
  );
  if (depositAmt && depositAmt > 0) return true;

  const amt = parseAmount(record.amount ?? record.tranAmt ?? record.txAmt);
  if (amt && amt > 0 && /\+|입금/.test(JSON.stringify(record))) return true;

  return false;
}

function rowFromRecord(record: Record<string, unknown>): HanaRawIncomingRow | null {
  if (!isDepositLike(record)) return null;

  const amount =
    parseAmount(
      record.depositAmount ??
        record.deposit ??
        record.inAmt ??
        record.crAmt ??
        record.amount ??
        record.tranAmt
    ) ?? null;

  if (!amount || amount <= 0) return null;

  const occurredAt =
    parseOccurredAt(
      record.occurredAt ??
        record.tranDate ??
        record.txDate ??
        record.tradeDate ??
        record.dateTime ??
        record.tranDt
    ) ?? null;

  if (!occurredAt) return null;

  const depositorName = String(
    record.depositorName ??
      record.senderName ??
      record.remitter ??
      record.counterparty ??
      record.tranName ??
      record.rmk ??
      ""
  ).trim();

  const id = String(
    record.id ??
      record.transactionId ??
      record.tranNo ??
      record.txNo ??
      record.seq ??
      ""
  ).trim();

  return {
    id: id || undefined,
    occurredAt,
    amount,
    depositorName: depositorName || undefined,
    description: String(record.description ?? record.memo ?? record.rmk ?? "").trim() || undefined,
  };
}

function walkJson(node: unknown, out: HanaRawIncomingRow[]): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const row = rowFromRecord(item as Record<string, unknown>);
        if (row) out.push(row);
      }
      walkJson(item, out);
    }
    return;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node as Record<string, unknown>)) {
      walkJson(value, out);
    }
  }
}

/** Extract deposit rows from arbitrary bank JSON payloads (normal browser XHR). */
export function parseTransactionsFromNetworkBodies(
  bodies: unknown[]
): HanaRawIncomingRow[] {
  const out: HanaRawIncomingRow[] = [];
  for (const body of bodies) {
    walkJson(body, out);
  }

  const seen = new Set<string>();
  return out.filter((row) => {
    const key = `${row.id ?? ""}|${row.occurredAt}|${row.amount}|${row.depositorName ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
