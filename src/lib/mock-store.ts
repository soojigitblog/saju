/**
 * Process-local mock persistence for PHASE 5 when Supabase is not connected.
 * Not for production traffic (production requires Supabase / OpenAI).
 */

import type { Tables } from "@/types/database.types";
import type { FortuneChart } from "@/lib/fortune-engine/types";

type Profile = Tables<"profiles">;
type FortuneChartRow = Tables<"fortune_charts">;
type FreeResult = Tables<"free_results">;
type AiGeneration = Tables<"ai_generations">;

const profiles = new Map<string, Profile>();
const charts = new Map<string, FortuneChartRow & { _chart?: FortuneChart }>();
const freeResults = new Map<string, FreeResult>();
const aiGenerations = new Map<string, AiGeneration>();
const rateBuckets = new Map<string, number[]>();

export const mockStore = {
  profiles,
  charts,
  freeResults,
  aiGenerations,
  rateBuckets,

  clear() {
    profiles.clear();
    charts.clear();
    freeResults.clear();
    aiGenerations.clear();
    rateBuckets.clear();
  },
};
