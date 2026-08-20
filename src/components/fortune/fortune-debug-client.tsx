"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ChartResponse = {
  chart?: {
    normalizedBirth: unknown;
    pillars: {
      year: { ganji: { hanja: string; hangul: string } };
      month: { ganji: { hanja: string; hangul: string } };
      day: { ganji: { hanja: string; hangul: string } };
      hour: { ganji: { hanja: string; hangul: string } } | null;
    };
    dayMaster: unknown;
    fiveElements: unknown;
    tenGods: unknown;
    conventions: unknown;
    warnings: string[];
    engine: unknown;
  };
  code?: string;
  message?: string;
};

export function FortuneDebugClient() {
  const [birthDate, setBirthDate] = useState("1992-10-24");
  const [birthTime, setBirthTime] = useState("05:30");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");
  const [lunarLeapMonth, setLunarLeapMonth] = useState(false);
  const [unknownTime, setUnknownTime] = useState(false);
  const [result, setResult] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function onCalculate() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/fortune/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender: "female",
          calendarType,
          birthDate,
          birthTime: unknownTime ? null : birthTime,
          birthTimeUnknown: unknownTime,
          lunarLeapMonth: calendarType === "lunar" ? lunarLeapMonth : false,
          timezone: "Asia/Seoul",
          countryCode: "KR",
        }),
      });
      const json = (await res.json()) as ChartResponse;
      setResult(json);
    } finally {
      setLoading(false);
    }
  }

  const chart = result?.chart;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>birthDate</Label>
          <Input value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>birthTime</Label>
          <Input
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
            disabled={unknownTime}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={calendarType === "solar"}
            onChange={() => setCalendarType("solar")}
          />
          solar
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={calendarType === "lunar"}
            onChange={() => setCalendarType("lunar")}
          />
          lunar
        </label>
        {calendarType === "lunar" ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={lunarLeapMonth}
              onChange={(e) => setLunarLeapMonth(e.target.checked)}
            />
            leap month
          </label>
        ) : null}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={unknownTime}
            onChange={(e) => setUnknownTime(e.target.checked)}
          />
          time unknown
        </label>
      </div>

      <Button onClick={onCalculate} disabled={loading}>
        {loading ? "Calculating..." : "Calculate"}
      </Button>

      {result?.code ? (
        <p className="rounded-xl bg-[#f8e8e4] px-4 py-3 text-sm text-[#8a3b2d]">
          {result.code}: {result.message}
        </p>
      ) : null}

      {chart ? (
        <div className="space-y-4 text-sm">
          <Section title="Engine">{JSON.stringify(chart.engine, null, 2)}</Section>
          <Section title="Normalized">{JSON.stringify(chart.normalizedBirth, null, 2)}</Section>
          <Section
            title="Pillars"
            body={`${chart.pillars.year.ganji.hanja} / ${chart.pillars.month.ganji.hanja} / ${chart.pillars.day.ganji.hanja} / ${chart.pillars.hour?.ganji.hanja ?? "null"}`}
          />
          <Section title="Day Master">{JSON.stringify(chart.dayMaster, null, 2)}</Section>
          <Section title="Five Elements">{JSON.stringify(chart.fiveElements, null, 2)}</Section>
          <Section title="Ten Gods">{JSON.stringify(chart.tenGods, null, 2)}</Section>
          <Section title="Conventions">{JSON.stringify(chart.conventions, null, 2)}</Section>
          <Section title="Warnings">{JSON.stringify(chart.warnings, null, 2)}</Section>
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
  body,
}: {
  title: string;
  children?: string;
  body?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4">
      <p className="font-semibold text-[var(--ink)]">{title}</p>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-[var(--ink-muted)]">
        {body ?? children}
      </pre>
    </div>
  );
}
