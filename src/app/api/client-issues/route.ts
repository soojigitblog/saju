import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { assertClientIssueRateLimit } from "@/lib/client-issues/rate-limit";
import { insertClientIssue } from "@/lib/repositories/client-issues";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

const MAX_BODY = 8_192;
const ANALYTICS_COOKIE = "fortune_analytics_session";

const bodySchema = z.object({
  kind: z.enum(["BUG_REPORT", "CLIENT_ERROR"]),
  message: z.string().trim().min(1).max(500),
  details: z.string().trim().max(4000).optional().nullable(),
  path: z.string().trim().max(300).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function truncate(value: string | null | undefined, max: number) {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "잘못된 요청입니다." },
      { status: 403 }
    );
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return NextResponse.json({ ok: true });
  }
  if (rawText.length > MAX_BODY) {
    return NextResponse.json(
      { code: "PAYLOAD_TOO_LARGE", message: "요청이 너무 큽니다." },
      { status: 413 }
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "입력을 확인해 주세요." },
      { status: 400 }
    );
  }

  const guestSessionId = await getGuestSessionId();
  const jar = await cookies();
  const analyticsSessionId = jar.get(ANALYTICS_COOKIE)?.value ?? null;
  const rateKey =
    guestSessionId ??
    analyticsSessionId ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anon";

  try {
    assertClientIssueRateLimit({
      kind: parsed.data.kind,
      key: rateKey,
    });
  } catch {
    return NextResponse.json(
      { code: "RATE_LIMITED", message: "잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const ua = truncate(request.headers.get("user-agent"), 300);
  const meta = {
    ...(parsed.data.metadata ?? {}),
    source: "client",
  };

  try {
    const row = await insertClientIssue({
      kind: parsed.data.kind,
      guest_session_id: guestSessionId,
      analytics_session_id: analyticsSessionId,
      path: truncate(parsed.data.path, 300),
      user_agent: ua,
      message: parsed.data.message,
      details: truncate(parsed.data.details, 4000),
      metadata: meta as Json,
    });
    return NextResponse.json({ ok: true, id: row.id });
  } catch {
    return NextResponse.json(
      { code: "UNKNOWN", message: "저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
