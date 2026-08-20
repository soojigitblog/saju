import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { FORTUNE_ENGINE_VERSION } from "@/lib/fortune-engine/version";
import { mockStore } from "@/lib/mock-store";
import type { FortuneChart } from "@/lib/fortune-engine/types";
import type { Json, Tables, TablesInsert } from "@/types/database.types";

export type FortuneChartRow = Tables<"fortune_charts">;

export async function createFortuneChart(input: {
  profileId: string;
  chart: FortuneChart;
  chartVersion?: string;
}): Promise<FortuneChartRow> {
  const row: TablesInsert<"fortune_charts"> = {
    profile_id: input.profileId,
    chart_version: input.chartVersion ?? FORTUNE_ENGINE_VERSION,
    raw_chart_json: input.chart as unknown as Json,
  };

  if (getDataMode() === "mock") {
    const saved: FortuneChartRow & { _chart?: FortuneChart } = {
      id: crypto.randomUUID(),
      profile_id: row.profile_id,
      chart_version: row.chart_version ?? FORTUNE_ENGINE_VERSION,
      raw_chart_json: row.raw_chart_json ?? {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _chart: input.chart,
    };
    mockStore.charts.set(saved.id, saved);
    return saved;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("fortune_charts")
      .insert(row)
      .select("*")
      .single();
    if (!error && data) return data;
  } catch {
    // guest path uses admin
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fortune_charts")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function findFortuneChartByProfileAndHash(input: {
  profileId: string;
  calculationHash: string;
  chartVersion?: string;
}): Promise<(FortuneChartRow & { chart?: FortuneChart }) | null> {
  const version = input.chartVersion ?? FORTUNE_ENGINE_VERSION;

  if (getDataMode() === "mock") {
    for (const row of mockStore.charts.values()) {
      if (row.profile_id !== input.profileId) continue;
      if (row.chart_version !== version) continue;
      const hash =
        row._chart?.engine.calculationHash ??
        (row.raw_chart_json as { engine?: { calculationHash?: string } } | null)
          ?.engine?.calculationHash;
      if (hash === input.calculationHash) {
        return { ...row, chart: row._chart };
      }
    }
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fortune_charts")
    .select("*")
    .eq("profile_id", input.profileId)
    .eq("chart_version", version)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  const match = (data ?? []).find((row) => {
    const json = row.raw_chart_json as {
      engine?: { calculationHash?: string };
    } | null;
    return json?.engine?.calculationHash === input.calculationHash;
  });
  if (!match) return null;
  return {
    ...match,
    chart: match.raw_chart_json as unknown as FortuneChart,
  };
}

export async function getFortuneChartById(
  id: string
): Promise<(FortuneChartRow & { chart?: FortuneChart }) | null> {
  if (getDataMode() === "mock") {
    const row = mockStore.charts.get(id);
    if (!row) return null;
    return { ...row, chart: row._chart };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fortune_charts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    chart: data.raw_chart_json as unknown as FortuneChart,
  };
}
