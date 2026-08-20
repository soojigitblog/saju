import { NextResponse } from "next/server";
import { fortuneEngine } from "@/lib/fortune-engine";
import { FortuneEngineError } from "@/lib/fortune-engine/types";
import { birthInputSchema } from "@/lib/fortune-engine/validation/birth-input-schema";

const MAX_BODY_BYTES = 8_192;

/**
 * Thin calculate endpoint — does NOT persist to DB.
 * Returns standardized FortuneErrorCode only (no stack traces / raw provider errors).
 */
export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { code: "INVALID_INPUT", message: "Request body too large" },
      { status: 413 }
    );
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return NextResponse.json(
      { code: "INVALID_INPUT", message: "Unable to read body" },
      { status: 400 }
    );
  }

  if (rawText.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { code: "INVALID_INPUT", message: "Request body too large" },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText) as unknown;
  } catch {
    return NextResponse.json(
      { code: "INVALID_INPUT", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { code: "INVALID_INPUT", message: "Body must be a JSON object" },
      { status: 400 }
    );
  }

  const parsed = birthInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "INVALID_INPUT",
        message: "Validation failed",
      },
      { status: 400 }
    );
  }

  try {
    const chart = fortuneEngine.calculate(parsed.data);
    return NextResponse.json({ chart });
  } catch (error) {
    if (error instanceof FortuneEngineError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { code: "CALCULATION_FAILED", message: "Calculation failed" },
      { status: 500 }
    );
  }
}
