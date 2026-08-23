import { describe, expect, it } from "vitest";
import { parseTransactionsFromNetworkBodies } from "@/lib/bank/hana/playwright/parse-network";

describe("Hana network transaction parser", () => {
  it("extracts IN rows from nested JSON", () => {
    const rows = parseTransactionsFromNetworkBodies([
      {
        result: {
          list: [
            {
              tranNo: "TX-100",
              tranDate: "2026-08-22 20:10:00",
              depositAmount: "6900",
              tranName: "홍길동",
              rmk: "입금",
            },
            {
              tranNo: "TX-101",
              tranDate: "2026-08-22 19:00:00",
              amount: "5000",
              rmk: "출금",
              direction: "OUT",
            },
          ],
        },
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.amount).toBe(6900);
    expect(rows[0]?.depositorName).toBe("홍길동");
    expect(rows[0]?.id).toBe("TX-100");
  });

  it("dedupes identical rows", () => {
    const body = {
      data: [
        {
          id: "dup",
          occurredAt: "2026-08-22T11:00:00+09:00",
          deposit: 6900,
          depositorName: "테스트",
        },
      ],
    };
    const rows = parseTransactionsFromNetworkBodies([body, body]);
    expect(rows).toHaveLength(1);
  });
});
