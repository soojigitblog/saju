/**
 * Vitest setup — allow importing Next `server-only` modules in Node tests.
 * Isolate from leftover .env.local / shell secrets so mock tests stay mock.
 */
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

if (process.env.VITEST_LIVE_DB !== "1") {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

if (process.env.GEMINI_LIVE !== "1") {
  delete process.env.GEMINI_API_KEY;
}

process.env.AI_PROVIDER ??= "mock";
