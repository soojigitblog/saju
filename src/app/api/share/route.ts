import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { createShareLink } from "@/lib/services/share-result";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  resourceType: z.enum(["FREE_RESULT", "TAROT_READING"]),
  resourceId: z.string().uuid(),
});

export async function POST(request: Request) {
  assertSameOrigin(request);
  const guestSessionId = await getGuestSessionId();
  if (!guestSessionId) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "접근 권한이 없습니다." },
      { status: 403 }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { code: "INVALID_INPUT", message: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  try {
    const { shareToken, shareUrl } = await createShareLink({
      guestSessionId,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
    });
    return NextResponse.json({ shareToken, shareUrl });
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
