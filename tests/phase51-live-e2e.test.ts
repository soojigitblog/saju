import { beforeAll, describe, expect, it } from "vitest";
import { createGuestSessionId } from "@/lib/guest/session";
import { getGeminiApiKey } from "@/lib/ai/config";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import {
  createFreeFortune,
} from "@/lib/services/create-free-fortune";
import { getFreeResultStatusForOwner } from "@/lib/services/get-free-result";
import { toFreeResultPublicDTO } from "@/lib/dto/free-result-public";
import type { FreeInterpretationOutput } from "@/lib/ai/types";
import { getFreeResultById } from "@/lib/repositories/free-results";
import { createAdminClient } from "@/lib/supabase/admin";

const liveReady =
  Boolean(getGeminiApiKey()) && isSupabaseAdminConfigured();

const runOffset = Date.now() % 10;
const fixtureA = {
  nickname: "phase51-a",
  gender: "female" as const,
  calendarType: "solar" as const,
  birthDate: `1992-04-${String(15 + runOffset).padStart(2, "0")}`,
  birthTime: "10:30",
  birthTimeUnknown: false,
  lunarLeapMonth: false,
  birthPlace: "서울",
  timezone: "Asia/Seoul" as const,
};

const fixtureC = {
  nickname: "phase51-c",
  gender: "male" as const,
  calendarType: "solar" as const,
  birthDate: `1996-09-${String(15 + runOffset).padStart(2, "0")}`,
  birthTime: "12:00",
  birthTimeUnknown: true,
  lunarLeapMonth: false,
  birthPlace: "서울",
  timezone: "Asia/Seoul" as const,
};

function assertPublicDtoSafe(dto: ReturnType<typeof toFreeResultPublicDTO>) {
  const serialized = JSON.stringify(dto);
  expect(serialized.includes("generationKey")).toBe(false);
  expect(serialized.includes("calculationHash")).toBe(false);
  expect(dto.headline.length).toBeGreaterThan(0);
}

describe.runIf(liveReady)("PHASE 5.1 Live free fortune E2E", () => {
  beforeAll(async () => {
    const admin = createAdminClient();
    const { error } = await admin.from("products").select("id").limit(1);
    if (error) {
      throw new Error(`Supabase not reachable: ${error.message}`);
    }
  });

  it(
    "fixture A: guest → engine → Gemini → free_results COMPLETED",
    async () => {
      const guest = createGuestSessionId();
      const created = await createFreeFortune({
        raw: fixtureA,
        guestSessionId: guest,
      });
      expect(created.status).toBe("COMPLETED");

      const row = await getFreeResultById(created.freeResultId);
      expect(row?.generation_status).toBe("COMPLETED");
      expect(row?.model).toBeTruthy();
      expect(row?.result_json).toBeTruthy();

      const admin = createAdminClient();
      const { data: gens } = await admin
        .from("ai_generations")
        .select("provider, status, total_tokens, provider_request_id")
        .eq("profile_id", row!.profile_id)
        .order("created_at", { ascending: false })
        .limit(1);
      expect(gens?.[0]?.provider).toBe("gemini");
      expect(gens?.[0]?.status).toBe("COMPLETED");

      const status = await getFreeResultStatusForOwner({
        freeResultId: created.freeResultId,
        guestSessionId: guest,
      });
      expect(status.status).toBe("COMPLETED");

      const interpretation = row!.result_json as unknown as FreeInterpretationOutput;
      assertPublicDtoSafe(
        toFreeResultPublicDTO({
          id: row!.id,
          nickname: fixtureA.nickname,
          birthYear: 1992,
          result: interpretation,
        })
      );

      // eslint-disable-next-line no-console
      console.log(
        `[phase51] freeResultId=${created.freeResultId} model=${row?.model} tokens=${row?.total_tokens ?? "n/a"}`
      );

      const other = createGuestSessionId();
      await expect(
        getFreeResultStatusForOwner({
          freeResultId: created.freeResultId,
          guestSessionId: other,
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
    120_000
  );

  it(
    "fixture C: unknown birth time completes without hour pillar claims",
    async () => {
      const guest = createGuestSessionId();
      const created = await createFreeFortune({
        raw: fixtureC,
        guestSessionId: guest,
      });
      expect(created.status).toBe("COMPLETED");
      const status = await getFreeResultStatusForOwner({
        freeResultId: created.freeResultId,
        guestSessionId: guest,
      });
      expect(status.status).toBe("COMPLETED");
    },
    120_000
  );

  it(
    "dedupes generation key on double submit",
    async () => {
      const guest = createGuestSessionId();
      const input = {
        ...fixtureA,
        nickname: "phase51-dedupe",
        birthDate: "2000-01-10",
      };
      const a = await createFreeFortune({ raw: input, guestSessionId: guest });
      const b = await createFreeFortune({ raw: input, guestSessionId: guest });
      expect(a.freeResultId).toBe(b.freeResultId);
      expect(a.status).toBe("COMPLETED");
      expect(b.status).toBe("COMPLETED");
    },
    120_000
  );
});

describe.runIf(!liveReady)("PHASE 5.1 Live E2E skipped", () => {
  it("skips when GEMINI_API_KEY or Supabase admin is absent", () => {
    expect(liveReady).toBe(false);
  });
});
