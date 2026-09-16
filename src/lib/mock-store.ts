/**
 * Process-local mock persistence for PHASE 5 when Supabase is not connected.
 * Uses globalThis so all Next.js dev bundles share one store, and writes
 * `.dev/mock-store.json` so data survives restarts.
 */

import type { Tables } from "@/types/database.types";
import type { FortuneChart } from "@/lib/fortune-engine/types";
import {
  entriesToMap,
  isMockPersistEnabled,
  loadMockStoreSnapshot,
  mapToEntries,
  nestedMapToObject,
  objectToNestedMap,
  scheduleMockStorePersist,
  writeMockStoreSnapshotSync,
} from "@/lib/mock-persist";

type Profile = Tables<"profiles">;
type FortuneChartRow = Tables<"fortune_charts">;
type FreeResult = Tables<"free_results">;
type AiGeneration = Tables<"ai_generations">;
type Order = Tables<"orders">;
type Payment = Tables<"payments">;
type Report = Tables<"reports">;
type TarotReadingRow = import("@/lib/repositories/tarot-readings").TarotReadingRow;
type TarotDrawRow = import("@/lib/repositories/tarot-readings").TarotDrawRow;
type FeedbackRow = import("@/lib/repositories/feedbacks").FeedbackRow;
type ClientIssue = import("@/lib/repositories/client-issues").ClientIssue;
type SharedResultRow = import("@/lib/repositories/shared-results").SharedResultRow;
type BankTransactionRow = import("@/lib/repositories/bank-transactions").BankTransactionRow;
type RefundRequestRow = import("@/lib/repositories/refund-requests").RefundRequestRow;

type BankPollerHealth = {
  id: string;
  status: "IDLE" | "RUNNING" | "ERROR" | "SESSION_EXPIRED";
  last_success_at: string | null;
  last_error_safe: string | null;
  last_fetched_count: number;
  last_matched_count: number;
  last_ambiguous_count: number;
  updated_at: string;
} | null;

type MockStoreBundle = {
  profiles: Map<string, Profile>;
  charts: Map<string, FortuneChartRow & { _chart?: FortuneChart }>;
  freeResults: Map<string, FreeResult>;
  aiGenerations: Map<string, AiGeneration>;
  rateBuckets: Map<string, number[]>;
  tarotReadings: Map<string, TarotReadingRow>;
  tarotDraws: Map<string, TarotDrawRow[]>;
  feedbacks: Map<string, FeedbackRow>;
  clientIssues: Map<string, ClientIssue>;
  sharedResults: Map<string, SharedResultRow>;
  orders: Map<string, Order>;
  payments: Map<string, Payment>;
  reports: Map<string, Report>;
  bankTransactions: Map<string, BankTransactionRow>;
  refundRequests: Map<string, RefundRequestRow>;
  bankPollerHealth: BankPollerHealth;
  clear(): void;
  touch(): void;
};

declare global {
  var __fortuneMockStoreBundle: MockStoreBundle | undefined;
}

function createMaps() {
  return {
    profiles: new Map<string, Profile>(),
    charts: new Map<string, FortuneChartRow & { _chart?: FortuneChart }>(),
    freeResults: new Map<string, FreeResult>(),
    aiGenerations: new Map<string, AiGeneration>(),
    rateBuckets: new Map<string, number[]>(),
    tarotReadings: new Map<string, TarotReadingRow>(),
    tarotDraws: new Map<string, TarotDrawRow[]>(),
    feedbacks: new Map<string, FeedbackRow>(),
    clientIssues: new Map<string, ClientIssue>(),
    sharedResults: new Map<string, SharedResultRow>(),
    orders: new Map<string, Order>(),
    payments: new Map<string, Payment>(),
    reports: new Map<string, Report>(),
    bankTransactions: new Map<string, BankTransactionRow>(),
    refundRequests: new Map<string, RefundRequestRow>(),
    bankPollerHealth: null as BankPollerHealth,
  };
}

function buildSnapshot(m: ReturnType<typeof createMaps>) {
  return {
    profiles: mapToEntries(m.profiles),
    charts: mapToEntries(m.charts),
    freeResults: mapToEntries(m.freeResults),
    aiGenerations: mapToEntries(m.aiGenerations),
    rateBuckets: mapToEntries(m.rateBuckets),
    tarotReadings: mapToEntries(m.tarotReadings),
    tarotDraws: nestedMapToObject(m.tarotDraws),
    feedbacks: mapToEntries(m.feedbacks),
    clientIssues: mapToEntries(m.clientIssues),
    sharedResults: mapToEntries(m.sharedResults),
    orders: mapToEntries(m.orders),
    payments: mapToEntries(m.payments),
    reports: mapToEntries(m.reports),
    bankTransactions: mapToEntries(m.bankTransactions),
    refundRequests: mapToEntries(m.refundRequests),
    bankPollerHealth: m.bankPollerHealth,
  };
}

function applySnapshot(bundle: MockStoreBundle, snap: Record<string, unknown>) {
  bundle.profiles.clear();
  entriesToMap(snap.profiles as Array<[string, Profile]>).forEach((v, k) =>
    bundle.profiles.set(k, v)
  );
  bundle.charts.clear();
  entriesToMap(snap.charts as Array<[string, FortuneChartRow]>).forEach((v, k) =>
    bundle.charts.set(k, v)
  );
  bundle.freeResults.clear();
  entriesToMap(snap.freeResults as Array<[string, FreeResult]>).forEach((v, k) =>
    bundle.freeResults.set(k, v)
  );
  bundle.aiGenerations.clear();
  entriesToMap(snap.aiGenerations as Array<[string, AiGeneration]>).forEach((v, k) =>
    bundle.aiGenerations.set(k, v)
  );
  bundle.rateBuckets.clear();
  entriesToMap(snap.rateBuckets as Array<[string, number[]]>).forEach((v, k) =>
    bundle.rateBuckets.set(k, v)
  );
  bundle.tarotReadings.clear();
  entriesToMap(snap.tarotReadings as Array<[string, TarotReadingRow]>).forEach((v, k) =>
    bundle.tarotReadings.set(k, v)
  );
  bundle.tarotDraws.clear();
  objectToNestedMap(snap.tarotDraws as Record<string, TarotDrawRow[]>).forEach((v, k) =>
    bundle.tarotDraws.set(k, v as TarotDrawRow[])
  );
  bundle.feedbacks.clear();
  entriesToMap(snap.feedbacks as Array<[string, FeedbackRow]>).forEach((v, k) =>
    bundle.feedbacks.set(k, v)
  );
  bundle.clientIssues.clear();
  entriesToMap(snap.clientIssues as Array<[string, ClientIssue]>).forEach((v, k) =>
    bundle.clientIssues.set(k, v)
  );
  bundle.sharedResults.clear();
  entriesToMap(snap.sharedResults as Array<[string, SharedResultRow]>).forEach((v, k) =>
    bundle.sharedResults.set(k, v)
  );
  bundle.orders.clear();
  entriesToMap(snap.orders as Array<[string, Order]>).forEach((v, k) =>
    bundle.orders.set(k, v)
  );
  bundle.payments.clear();
  entriesToMap(snap.payments as Array<[string, Payment]>).forEach((v, k) =>
    bundle.payments.set(k, v)
  );
  bundle.reports.clear();
  entriesToMap(snap.reports as Array<[string, Report]>).forEach((v, k) =>
    bundle.reports.set(k, v)
  );
  bundle.bankTransactions.clear();
  entriesToMap(snap.bankTransactions as Array<[string, BankTransactionRow]>).forEach(
    (v, k) => bundle.bankTransactions.set(k, v)
  );
  bundle.refundRequests.clear();
  entriesToMap(snap.refundRequests as Array<[string, RefundRequestRow]>).forEach(
    (v, k) => bundle.refundRequests.set(k, v)
  );
  bundle.bankPollerHealth = (snap.bankPollerHealth as BankPollerHealth) ?? null;
}

function patchMapMutations<K, V>(map: Map<K, V>, persist: () => void) {
  const origSet = map.set.bind(map);
  const origDelete = map.delete.bind(map);
  const origClear = map.clear.bind(map);
  map.set = ((key: K, value: V) => {
    const r = origSet(key, value);
    persist();
    return r;
  }) as typeof map.set;
  map.delete = ((key: K) => {
    const r = origDelete(key);
    persist();
    return r;
  }) as typeof map.delete;
  map.clear = (() => {
    origClear();
    persist();
  }) as typeof map.clear;
}

function patchAllMaps(m: ReturnType<typeof createMaps>, persist: () => void) {
  patchMapMutations(m.profiles, persist);
  patchMapMutations(m.charts, persist);
  patchMapMutations(m.freeResults, persist);
  patchMapMutations(m.aiGenerations, persist);
  patchMapMutations(m.rateBuckets, persist);
  patchMapMutations(m.tarotReadings, persist);
  patchMapMutations(m.tarotDraws, persist);
  patchMapMutations(m.feedbacks, persist);
  patchMapMutations(m.clientIssues, persist);
  patchMapMutations(m.sharedResults, persist);
  patchMapMutations(m.orders, persist);
  patchMapMutations(m.payments, persist);
  patchMapMutations(m.reports, persist);
  patchMapMutations(m.bankTransactions, persist);
  patchMapMutations(m.refundRequests, persist);
}

function createMockStoreBundle(): MockStoreBundle {
  const maps = createMaps();

  function persistSoon() {
    const snapshot = buildSnapshot(maps);
    scheduleMockStorePersist(snapshot);
    writeMockStoreSnapshotSync(snapshot);
  }

  patchAllMaps(maps, persistSoon);

  const bundle: MockStoreBundle = {
    ...maps,
    clear() {
      maps.profiles.clear();
      maps.charts.clear();
      maps.freeResults.clear();
      maps.aiGenerations.clear();
      maps.rateBuckets.clear();
      maps.tarotReadings.clear();
      maps.tarotDraws.clear();
      maps.feedbacks.clear();
      maps.clientIssues.clear();
      maps.sharedResults.clear();
      maps.orders.clear();
      maps.payments.clear();
      maps.reports.clear();
      maps.bankTransactions.clear();
      maps.refundRequests.clear();
      maps.bankPollerHealth = null;
      persistSoon();
    },
    touch() {
      persistSoon();
    },
  };

  Object.defineProperty(bundle, "bankPollerHealth", {
    get() {
      return maps.bankPollerHealth;
    },
    set(v: BankPollerHealth) {
      maps.bankPollerHealth = v;
      persistSoon();
    },
  });

  return bundle;
}

function initMockStoreBundle(): MockStoreBundle {
  if (!globalThis.__fortuneMockStoreBundle) {
    globalThis.__fortuneMockStoreBundle = createMockStoreBundle();
    if (isMockPersistEnabled()) {
      reloadMockStoreFromDisk();
    }
  }
  return globalThis.__fortuneMockStoreBundle;
}

/** Reload dev snapshot from disk into the shared in-memory store. */
export function reloadMockStoreFromDisk(): void {
  if (!isMockPersistEnabled()) return;
  const snap = loadMockStoreSnapshot();
  if (!snap) return;
  const bundle = globalThis.__fortuneMockStoreBundle ?? createMockStoreBundle();
  applySnapshot(bundle, snap);
  globalThis.__fortuneMockStoreBundle = bundle;
}

export const mockStore = initMockStoreBundle();
