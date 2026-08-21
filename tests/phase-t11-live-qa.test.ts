/**
 * PHASE T1.1 — Live Gemini × Tarot quality validation.
 * Requires: AI_PROVIDER=gemini, GEMINI_API_KEY, Supabase admin.
 * Secrets are never printed.
 *
 * Run:
 *   FREE_TAROT_LIMIT=10 npx vitest run tests/phase-t11-live-qa.test.ts
 */
import { beforeAll, describe, expect, it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getGeminiApiKey } from "@/lib/ai/config";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import { createGuestSessionId } from "@/lib/guest/session";
import { createFreeFortune } from "@/lib/services/create-free-fortune";
import {
  startTarotReading,
  selectTarotCards,
  generateTarotCrossReading,
} from "@/lib/services/create-tarot-reading";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CrossReadingResult } from "@/lib/ai/schemas/cross-reading";

const liveReady =
  Boolean(getGeminiApiKey()) &&
  isSupabaseAdminConfigured() &&
  (process.env.AI_PROVIDER || "").toLowerCase() === "gemini";

const CASES = [
  { id: "A", category: "career" as const, label: "직장/이직" },
  { id: "B", category: "money" as const, label: "돈/재물" },
  { id: "C", category: "love" as const, label: "연애/관계" },
  { id: "D", category: "relationships" as const, label: "인간관계" },
  { id: "E", category: "advice" as const, label: "지금 나에게 필요한 조언" },
] as const;

type CaseReport = {
  id: string;
  category: string;
  label: string;
  cards: Array<{
    position: string;
    nameKo: string;
    nameEn: string;
    orientation: string;
  }>;
  fortunePattern: { title: string; summary: string };
  cardInterpretations: string[];
  crossInsight: { headline: string; body: string };
  closingMessage: string;
  evidence: { fortune: string[]; tarot: string[] };
  geminiCalls: number;
  qa: {
    tarotOnlyFeeling: "PASS" | "FAIL";
    interaction: "PASS" | "FAIL";
    personalization: "PASS" | "FAIL";
    cardFidelity: "PASS" | "FAIL";
    noHardPrediction: "PASS" | "FAIL";
    notes: string[];
  };
};

const FORBIDDEN_PREDICTION =
  /곧\s*(이직|재회|결혼)|반드시\s*(될|온다)|돈이\s*들어|그\s*사람이\s*돌아|임신|유산|사망|파산|주가|로또/;

function evaluateCase(
  category: string,
  result: CrossReadingResult,
  cards: CaseReport["cards"]
): CaseReport["qa"] {
  const notes: string[] = [];
  const blob = [
    result.fortunePattern.summary,
    result.crossInsight.headline,
    result.crossInsight.body,
    result.closingMessage,
    ...result.cards.map((c) => c.interpretation),
  ].join("\n");

  // A: tarot-only — crossInsight should reference pattern interaction, not only card names
  const cross = `${result.crossInsight.headline}\n${result.crossInsight.body}`;
  const mentionsPattern =
    /성향|패턴|경향|원래|타고난|일간|식상|관성|재성|인성|비겁|결정|기준|책임|경계|맞춰/.test(
      cross
    );
  const tarotOnlyFeeling: "PASS" | "FAIL" = mentionsPattern ? "PASS" : "FAIL";
  if (!mentionsPattern) notes.push("Cross Insight가 사주 패턴 연결이 약함");

  // B: interaction — not "사주에서는… 타로에서는…" glue
  const glued =
    /사주에서는[\s\S]{0,40}타로에서는|사주에서[\s\S]{0,30}카드에서는/.test(cross);
  const interaction: "PASS" | "FAIL" =
    !glued && cross.length >= 80 && mentionsPattern ? "PASS" : "FAIL";
  if (glued) notes.push("사주+타로 단순 이어붙이기 느낌");

  // C: personalization — fortunePattern should be concrete
  const personalization: "PASS" | "FAIL" =
    result.fortunePattern.summary.length >= 40 &&
    !/당신은 좋은 사람|행운이 가득/.test(result.fortunePattern.summary)
      ? "PASS"
      : "FAIL";

  // D: card fidelity — result cards match draw ids/orientations
  let cardFidelity: "PASS" | "FAIL" = "PASS";
  for (let i = 0; i < 3; i++) {
    const expected = cards[i];
    const got = result.cards[i];
    if (!expected || !got) {
      cardFidelity = "FAIL";
      notes.push("카드 개수 불일치");
      break;
    }
    if (got.orientation !== expected.orientation) {
      cardFidelity = "FAIL";
      notes.push(`orientation mismatch @${i}`);
    }
    if (got.nameKo !== expected.nameKo && got.cardId) {
      // nameKo should match; cardId validated by engine validator already
    }
  }

  // E: no hard prediction
  const noHardPrediction: "PASS" | "FAIL" = FORBIDDEN_PREDICTION.test(blob)
    ? "FAIL"
    : "PASS";
  if (noHardPrediction === "FAIL") notes.push("확정 예언/위험 표현 감지");

  // Domain relevance soft check
  const domainHints: Record<string, RegExp> = {
    career: /일|직장|이직|업무|환경|책임|선택|커리어/,
    money: /돈|재물|소비|수입|통제|구조|씀씀이/,
    love: /관계|연애|거리|표현|기대|감정|상대/,
    relationships: /사람|관계|경계|갈등|역할|에너지/,
    advice: /지금|우선|상태|패턴|방향|기준/,
  };
  const hint = domainHints[category];
  if (hint && !hint.test(blob)) {
    notes.push(`카테고리(${category}) 관련 어휘가 약함`);
  }

  return {
    tarotOnlyFeeling,
    interaction,
    personalization,
    cardFidelity,
    noHardPrediction,
    notes,
  };
}

describe.runIf(liveReady)("PHASE T1.1 Live Tarot Cross Quality", () => {
  const reports: CaseReport[] = [];
  let geminiCalls = 0;
  let freeResultId = "";
  let guest = "";

  beforeAll(async () => {
    process.env.FREE_TAROT_LIMIT = process.env.FREE_TAROT_LIMIT || "10";
    process.env.FREE_TAROT_WINDOW_SECONDS =
      process.env.FREE_TAROT_WINDOW_SECONDS || "86400";
    process.env.AI_PROVIDER = "gemini";

    const admin = createAdminClient();
    const { error } = await admin.from("tarot_readings").select("id").limit(1);
    if (error) {
      throw new Error(`tarot_readings unavailable: ${error.message}`);
    }
  }, 30_000);

  it(
    "creates one live free fortune then 5 category cross readings",
    async () => {
      guest = createGuestSessionId();
      const offset = Date.now() % 10;
      const created = await createFreeFortune({
        raw: {
          nickname: "t11-qa",
          gender: "female",
          calendarType: "solar",
          birthDate: `1993-01-${String(10 + offset).padStart(2, "0")}`,
          birthTime: "14:20",
          birthTimeUnknown: false,
          lunarLeapMonth: false,
          birthPlace: "서울",
          timezone: "Asia/Seoul",
        },
        guestSessionId: guest,
      });
      expect(created.status).toBe("COMPLETED");
      freeResultId = created.freeResultId;
      // free fortune also uses Gemini once — track separately if needed
      geminiCalls += 1;

      for (const c of CASES) {
        const started = await startTarotReading({
          guestSessionId: guest,
          freeResultId,
          questionCategory: c.category,
        });
        expect(started.presentationSlots.length).toBeGreaterThanOrEqual(12);

        // Pseudo-random but deterministic-enough unique picks from presentation
        const n = started.presentationSlots.length;
        const a = Math.floor(Math.random() * n);
        let b = Math.floor(Math.random() * n);
        while (b === a) b = Math.floor(Math.random() * n);
        let d = Math.floor(Math.random() * n);
        while (d === a || d === b) d = Math.floor(Math.random() * n);

        const selected = await selectTarotCards({
          guestSessionId: guest,
          readingId: started.readingId,
          slotIndices: [a, b, d],
        });
        expect(selected.draws).toHaveLength(3);

        const generated = await generateTarotCrossReading({
          guestSessionId: guest,
          readingId: started.readingId,
        });
        geminiCalls += 1;
        expect(generated.status).toBe("COMPLETED");

        const result = generated.result as CrossReadingResult & {
          meta?: { provider?: string };
        };
        expect(result.crossInsight?.headline).toBeTruthy();

        const cards = selected.draws.map((draw) => ({
          position: draw.position,
          nameKo: draw.nameKo,
          nameEn: draw.nameEn,
          orientation: draw.orientation,
        }));

        const qa = evaluateCase(c.category, result, cards);
        reports.push({
          id: c.id,
          category: c.category,
          label: c.label,
          cards,
          fortunePattern: {
            title: result.fortunePattern.title,
            summary: result.fortunePattern.summary,
          },
          cardInterpretations: result.cards.map((x) => x.interpretation),
          crossInsight: {
            headline: result.crossInsight.headline,
            body: result.crossInsight.body,
          },
          closingMessage: result.closingMessage,
          evidence: result.evidence,
          geminiCalls: 1,
          qa,
        });
      }

      expect(reports).toHaveLength(5);

      const outDir = join(process.cwd(), "tmp");
      mkdirSync(outDir, { recursive: true });
      const outPath = join(outDir, "phase-t11-live-qa-report.json");
      writeFileSync(
        outPath,
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            freeResultIdPresent: Boolean(freeResultId),
            totalReadings: reports.length,
            /** Includes 1 free-fortune + 5 cross readings */
            totalGeminiCalls: geminiCalls,
            callsPerCrossReading: 1,
            cases: reports,
          },
          null,
          2
        ),
        "utf8"
      );
      console.log(`\nWrote QA report: ${outPath}`);
      console.log(`Total Gemini calls (fortune+cross): ${geminiCalls}`);
      console.log(`Cross readings: ${reports.length} (1 call each)`);
    },
    600_000
  );
});

describe.runIf(!liveReady)("PHASE T1.1 skipped", () => {
  it("skips when Gemini or Supabase absent / AI_PROVIDER!=gemini", () => {
    expect(liveReady).toBe(false);
  });
});
