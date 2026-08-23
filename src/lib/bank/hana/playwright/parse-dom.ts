import type { Page } from "playwright";
import type { HanaRawIncomingRow } from "@/lib/bank/hana/types";

/**
 * DOM table fallback when network JSON is unavailable.
 * Parser runs entirely in-browser (no nested named fns — tsx/esbuild safe).
 */
export async function parseDomTransactionRows(
  page: Page
): Promise<HanaRawIncomingRow[]> {
  return page.evaluate(() => {
    type Row = {
      id?: string;
      occurredAt: string;
      amount: number;
      depositorName?: string;
      description?: string;
    };

    const rows: Row[] = [];
    const trs = Array.from(document.querySelectorAll("table tr"));

    for (const tr of trs) {
      const cells = Array.from(tr.querySelectorAll("td,th")).map(
        (c) => c.textContent?.trim() ?? ""
      );
      if (cells.length < 2) continue;
      const line = cells.join(" ");
      if (!/입금|\+|받/.test(line)) continue;
      if (/출금|-\s*\d/.test(line) && !/입금/.test(line)) continue;

      let amount: number | null = null;
      for (const cell of cells) {
        if (/입금|\+/.test(cell) || /\d{1,3}(,\d{3})+/.test(cell)) {
          const m = cell.replace(/,/g, "").match(/(\d{1,9})/);
          if (m) {
            const n = Number(m[1]);
            if (Number.isFinite(n) && n > 0) {
              amount = n;
              break;
            }
          }
        }
      }
      if (!amount || amount <= 0) continue;

      let occurredAt: string | null = null;
      for (const cell of cells) {
        const dm = cell.match(
          /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/
        );
        if (dm) {
          const [, y, mo, d, hh = "0", mm = "0"] = dm;
          const iso = `${y}-${mo!.padStart(2, "0")}-${d!.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:00+09:00`;
          const dt = new Date(iso);
          if (!Number.isNaN(dt.getTime())) {
            occurredAt = dt.toISOString();
            break;
          }
        }
      }
      if (!occurredAt) continue;

      const depositorCell = cells.find(
        (c) => c.length >= 2 && c.length <= 40 && !/\d{4}[.\-]/.test(c)
      );

      rows.push({
        occurredAt,
        amount,
        depositorName: depositorCell,
        description: line.slice(0, 120),
      });
    }

    return rows;
  });
}
