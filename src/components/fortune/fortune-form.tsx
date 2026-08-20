"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { birthPlaces } from "@/lib/mock-data";
import { FORTUNE_RELEASE_MANIFEST } from "@/lib/fortune-engine/release-manifest";
import type { FortuneFormValues } from "@/types";
import { trackClientEvent } from "@/lib/analytics/client";

const SUPPORT_MIN = FORTUNE_RELEASE_MANIFEST.supportYear.min;
const SUPPORT_MAX = FORTUNE_RELEASE_MANIFEST.supportYear.max;

const initial: FortuneFormValues = {
  nickname: "",
  gender: "",
  birthYear: "",
  birthMonth: "",
  birthDay: "",
  calendarType: "solar",
  lunarLeapMonth: false,
  birthTimeKnown: true,
  birthTime: "12:00",
  birthPlace: "서울",
};

function isValidGregorian(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= lengths[m - 1];
}

export function FortuneForm() {
  const router = useRouter();
  const [form, setForm] = useState<FortuneFormValues>(initial);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const years = useMemo(() => {
    const max = Math.min(SUPPORT_MAX, new Date().getFullYear());
    return Array.from({ length: max - SUPPORT_MIN + 1 }, (_, i) => String(max - i));
  }, []);

  function update<K extends keyof FortuneFormValues>(
    key: K,
    value: FortuneFormValues[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    if (!form.nickname.trim()) return "닉네임을 입력해 주세요.";
    if (!form.gender) return "성별을 선택해 주세요.";
    const y = Number(form.birthYear);
    const m = Number(form.birthMonth);
    const d = Number(form.birthDay);
    if (!y || !m || !d) return "생년월일을 모두 입력해 주세요.";
    if (y < SUPPORT_MIN || y > SUPPORT_MAX) {
      return `지원 연도는 ${SUPPORT_MIN}–${SUPPORT_MAX}입니다.`;
    }
    if (form.calendarType === "solar" && !isValidGregorian(y, m, d)) {
      return "올바른 양력 생년월일을 입력해 주세요.";
    }
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const inputStr = `${form.birthYear}-${form.birthMonth}-${form.birthDay}`;
    if (form.calendarType === "solar" && inputStr > todayStr) {
      return "미래 날짜는 입력할 수 없습니다.";
    }
    if (form.birthTimeKnown) {
      if (!/^\d{2}:\d{2}$/.test(form.birthTime)) return "출생시간을 확인해 주세요.";
    }
    if (!form.birthPlace) return "출생지역을 선택해 주세요.";
    return "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setSubmitting(true);

    const birthDate = `${form.birthYear}-${form.birthMonth}-${form.birthDay}`;
    const payload = {
      nickname: form.nickname.trim(),
      gender: form.gender,
      calendarType: form.calendarType,
      birthDate,
      birthTime: form.birthTimeKnown ? form.birthTime : null,
      birthTimeUnknown: !form.birthTimeKnown,
      lunarLeapMonth:
        form.calendarType === "lunar" ? form.lunarLeapMonth : false,
      birthPlace: form.birthPlace,
      timezone: "Asia/Seoul" as const,
    };

    try {
      void trackClientEvent({ eventName: "fortune_start", path: "/fortune" });
      const res = await fetch("/api/fortune/free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        freeResultId?: string;
        status?: string;
        code?: string;
        message?: string;
      };

      if (!res.ok || !data.freeResultId) {
        setError(data.message ?? "요청을 처리하지 못했습니다.");
        setSubmitting(false);
        return;
      }

      router.push(`/fortune/loading/${data.freeResultId}`);
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" aria-busy={submitting}>
      <FormStep step="01" title="기본 정보">
        <div className="space-y-2">
          <Label htmlFor="nickname">닉네임</Label>
          <Input
            id="nickname"
            placeholder="예: 수지"
            value={form.nickname}
            onChange={(e) => update("nickname", e.target.value)}
            maxLength={20}
            disabled={submitting}
          />
        </div>

        <fieldset className="mt-5 space-y-3" disabled={submitting}>
          <Legend>성별</Legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "male", label: "남성" },
              { value: "female", label: "여성" },
            ].map((opt) => (
              <Choice
                key={opt.value}
                selected={form.gender === opt.value}
                onClick={() => update("gender", opt.value as "male" | "female")}
                label={opt.label}
              />
            ))}
          </div>
        </fieldset>
      </FormStep>

      <FormStep step="02" title="태어난 날">
        <fieldset className="space-y-3" disabled={submitting}>
        <div className="grid grid-cols-3 gap-2">
          <select
            className="field-select"
            value={form.birthYear}
            onChange={(e) => update("birthYear", e.target.value)}
            aria-label="년"
          >
            <option value="">YYYY</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            className="field-select"
            value={form.birthMonth}
            onChange={(e) => update("birthMonth", e.target.value)}
            aria-label="월"
          >
            <option value="">MM</option>
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(
              (m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              )
            )}
          </select>
          <select
            className="field-select"
            value={form.birthDay}
            onChange={(e) => update("birthDay", e.target.value)}
            aria-label="일"
          >
            <option value="">DD</option>
            {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map(
              (d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              )
            )}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "solar", label: "양력" },
            { value: "lunar", label: "음력" },
          ].map((opt) => (
            <Choice
              key={opt.value}
              selected={form.calendarType === opt.value}
              onClick={() => {
                update("calendarType", opt.value as "solar" | "lunar");
                if (opt.value === "solar") update("lunarLeapMonth", false);
              }}
              label={opt.label}
            />
          ))}
        </div>
        {form.calendarType === "lunar" ? (
          <div className="grid grid-cols-2 gap-3">
            <Choice
              selected={!form.lunarLeapMonth}
              onClick={() => update("lunarLeapMonth", false)}
              label="평달"
            />
            <Choice
              selected={form.lunarLeapMonth}
              onClick={() => update("lunarLeapMonth", true)}
              label="윤달"
            />
          </div>
        ) : null}
        </fieldset>
      </FormStep>

      <FormStep step="03" title="태어난 시간">
        <fieldset className="space-y-3" disabled={submitting}>
          <Legend>출생 시간</Legend>
        <div className="grid grid-cols-2 gap-3">
          <Choice
            selected={form.birthTimeKnown}
            onClick={() => update("birthTimeKnown", true)}
            label="시간 알고 있음"
          />
          <Choice
            selected={!form.birthTimeKnown}
            onClick={() => update("birthTimeKnown", false)}
            label="시간 모름"
          />
        </div>
        {!form.birthTimeKnown ? (
          <p className="rounded-md border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--ink-muted)]">
            태어난 시간을 몰라도 기본 분석은 가능합니다. 시주는 계산하지 않습니다.
          </p>
        ) : (
          <Input
            type="time"
            value={form.birthTime}
            onChange={(e) => update("birthTime", e.target.value)}
          />
        )}
        </fieldset>

        <div className="mt-5 space-y-2">
          <Label htmlFor="birthPlace">출생지역</Label>
          <select
            id="birthPlace"
            className="field-select"
            value={form.birthPlace}
            onChange={(e) => update("birthPlace", e.target.value)}
            disabled={submitting}
          >
            {birthPlaces.map((place) => (
              <option key={place} value={place}>
                {place}
              </option>
            ))}
          </select>
        </div>
      </FormStep>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-[var(--error-text)]/30 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" size="full" disabled={submitting}>
        {submitting ? "명식을 구성하는 중..." : "사주 풀어보기"}
      </Button>
    </form>
  );
}

function FormStep({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mystic-card p-5">
      <div className="mb-5 flex items-center gap-3 border-b border-[var(--line)] pb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--line-strong)] bg-[var(--surface-strong)] text-xs font-semibold text-[var(--gold)]">
          {step}
        </span>
        <h2 className="text-sm font-semibold text-[var(--ink-bright)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <legend className="text-sm font-medium text-[var(--ink-muted)]">{children}</legend>
  );
}

function Choice({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 rounded-md border text-sm font-medium transition-all ${
        selected
          ? "border-[var(--gold)] bg-[var(--accent-soft)] text-[var(--ink-bright)] shadow-[var(--glow-gold)]"
          : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)] hover:border-[var(--line-strong)]"
      }`}
    >
      {label}
    </button>
  );
}
