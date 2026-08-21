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
type Order = Tables<"orders">;
type Payment = Tables<"payments">;
type Report = Tables<"reports">;

const profiles = new Map<string, Profile>();
const charts = new Map<string, FortuneChartRow & { _chart?: FortuneChart }>();
const freeResults = new Map<string, FreeResult>();
const aiGenerations = new Map<string, AiGeneration>();
const rateBuckets = new Map<string, number[]>();
const tarotReadings = new Map<string, import("@/lib/repositories/tarot-readings").TarotReadingRow>();
const tarotDraws = new Map<string, import("@/lib/repositories/tarot-readings").TarotDrawRow[]>();
const feedbacks = new Map<string, import("@/lib/repositories/feedbacks").FeedbackRow>();
const clientIssues = new Map<string, import("@/lib/repositories/client-issues").ClientIssue>();
const orders = new Map<string, Order>();
const payments = new Map<string, Payment>();
const reports = new Map<string, Report>();
const bankTransactions = new Map<
  string,
  import("@/lib/repositories/bank-transactions").BankTransactionRow
>();
let bankPollerHealth: {
  id: string;
  status: "IDLE" | "RUNNING" | "ERROR";
  last_success_at: string | null;
  last_error_safe: string | null;
  last_fetched_count: number;
  last_matched_count: number;
  last_ambiguous_count: number;
  updated_at: string;
} | null = null;

export const mockStore = {
  profiles,
  charts,
  freeResults,
  aiGenerations,
  rateBuckets,
  tarotReadings,
  tarotDraws,
  feedbacks,
  clientIssues,
  orders,
  payments,
  reports,
  bankTransactions,
  get bankPollerHealth() {
    return bankPollerHealth;
  },
  set bankPollerHealth(v) {
    bankPollerHealth = v;
  },

  clear() {
    profiles.clear();
    charts.clear();
    freeResults.clear();
    aiGenerations.clear();
    rateBuckets.clear();
    tarotReadings.clear();
    tarotDraws.clear();
    feedbacks.clear();
    clientIssues.clear();
    orders.clear();
    payments.clear();
    reports.clear();
    bankTransactions.clear();
    bankPollerHealth = null;
  },
};
