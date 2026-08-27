import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdminRequest } from "@/lib/admin/manual-auth";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { seedAdminQaConsultingReport } from "@/lib/services/admin-qa-seed-consulting-report";
import { MOCK_PRODUCT_IDS } from "@/lib/mock-data";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  productStem: z.enum(["money", "career", "love", "total"]),
});

const PRODUCT_BY_STEM = {
  money: MOCK_PRODUCT_IDS.money,
  career: MOCK_PRODUCT_IDS.career,
  love: MOCK_PRODUCT_IDS.love,
  total: MOCK_PRODUCT_IDS.total,
} as const;

/**
 * Admin-only seed for pre-live PDF authenticity HTTP smoke.
 * Does not weaken customer mock PDF blocking.
 */
export async function POST(request: Request) {
  try {
    await assertAdminRequest(request);

    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { code: "INVALID_BODY", message: "productStem required" },
        { status: 400 }
      );
    }

    const seeded = await seedAdminQaConsultingReport({
      productId: PRODUCT_BY_STEM[parsed.data.productStem],
    });

    return NextResponse.json({
      ok: true,
      productStem: parsed.data.productStem,
      ...seeded,
    });
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    console.error("[admin/qa/seed-consulting-report] failed", error);
    return NextResponse.json(
      { code: "INTERNAL", message: "Seed failed" },
      { status: 500 }
    );
  }
}
