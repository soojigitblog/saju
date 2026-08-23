import { NextResponse } from "next/server";
import { getPublicShareByToken } from "@/lib/services/share-result";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

export const dynamic = "force-dynamic";

/** Public read-only — no auth, no guest cookie, one token → one snapshot. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  try {
    const data = await getPublicShareByToken(token);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    throw error;
  }
}
