"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { birthPlaces } from "@/lib/mock-data";
import { FORTUNE_RELEASE_MANIFEST } from "@/lib/fortune-engine/release-manifest";
import type { FortuneFormValues } from "@/types";
import { trackClientEvent } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

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
  maritalStatus: "",
  hasChildren: "",
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
  const errorRef = useRef<HTMLParagraphElement>(null);
  const childrenRef = useRef<HTMLFieldSetElement>(null);

  const years = useMemo(() => {
    // Avoid `new Date()` during render — hydration mismatch on mobile.
    const max = Math.min(SUPPORT_MAX, 2026);
    return Array.from({ length: max - SUPPORT_MIN + 1 }, (_, i) => String(max - i));
  }, []);

  useEffect(() => {
    if (form.maritalStatus !== "married") return;
    childrenRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [form.maritalStatus]);

  useEffect(() => {
    if (!error) return;
    errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  function update<K extends keyof FortuneFormValues>(
    key: K,
    value: FortuneFormValues[K]
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "maritalStatus" && value !== "married") {
        next.hasChildren = "";
      }
      return next;
    });
  }

  function validate() {
    if (!form.nickname.trim()) return "닉네임을 입력해 주세요.";
    if (!form.gender) return "성별을 선택해 주세요.";
    if (!form.maritalStatus) return "혼인 여부를 선택해 주세요.";
    if (form.maritalStatus === "married" && !form.hasChildren) {
      return "자녀 유무를 선택해 주세요.";
    }
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
      maritalStatus: form.maritalStatus,
      hasChildren:
        form.maritalStatus === "married" ? form.hasChildren || null : null,
    };

    try {
      void trackClientEvent({ eventName: "fortune_start", path: "/fortune" });
      const res = await fetch("/api/fortune/free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
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
    <form onSubmit={onSubmit} className="space-y-7" aria-busy={submitting}>
      <FormStep step="01" title="기본 정보">
        <div className="space-y-2">
          <Label htmlFor="nickname">닉네임</Label>
          <Input
            id="nickname"
            placeholder="예: 운의결"
            value={form.nickname}
            onChange={(e) => update("nickname", e.target.value)}
            maxLength={20}
            disabled={submitting}
          />
        </div>

        <fieldset className="mt-5 space-y-3">
          <Legend>성별</Legend>
          <div className="grid grid-cols-2 gap-3">
            <Choice
              selected={form.gender === "male"}
              onSelect={() => update("gender", "male")}
              label="남성"
            />
            <Choice
              selected={form.gender === "female"}
              onSelect={() => update("gender", "female")}
              label="여성"
            />
          </div>
        </fieldset>

        <fieldset className="mt-5 space-y-3">
          <Legend>혼인 여부</Legend>
          <p className="text-xs text-[var(--text-muted)]">
            관계·가정 해석을 더 구체적으로 맞추기 위해 받습니다. 추측하지 않습니다.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <Choice
              selected={form.maritalStatus === "unmarried"}
              onSelect={() => update("maritalStatus", "unmarried")}
              label="미혼"
            />
            <Choice
              selected={form.maritalStatus === "married"}
              onSelect={() => update("maritalStatus", "married")}
              label="기혼"
            />
            <Choice
              selected={form.maritalStatus === "prefer_not"}
              onSelect={() => update("maritalStatus", "prefer_not")}
              label="선택 안 함"
            />
          </div>
        </fieldset>

        {form.maritalStatus === "married" ? (
          <fieldset
            ref={childrenRef}
            className="mt-5 space-y-3 rounded-sm border border-[#d4a84f] bg-[rgba(212,168,79,0.12)] p-4"
          >
            <Legend>자녀 유무</Legend>
            <p className="text-xs text-[var(--text-muted)]">
              기혼을 선택하셨어요. 자녀 유무를 알려 주세요.
            </p>
            <div className="grid grid-cols-1 gap-2">
              <Choice
                selected={form.hasChildren === "yes"}
                onSelect={() => update("hasChildren", "yes")}
                label="있음"
              />
              <Choice
                selected={form.hasChildren === "no"}
                onSelect={() => update("hasChildren", "no")}
                label="없음"
              />
              <Choice
                selected={form.hasChildren === "prefer_not"}
                onSelect={() => update("hasChildren", "prefer_not")}
                label="선택 안 함"
              />
            </div>
          </fieldset>
        ) : null}
      </FormStep>

      <FormStep step="02" title="태어난 날">
        <fieldset className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <select
              className="field-select"
              value={form.birthYear}
              onChange={(e) => update("birthYear", e.target.value)}
              aria-label="년"
              disabled={submitting}
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
              disabled={submitting}
            >
              <option value="">MM</option>
              {Array.from({ length: 12 }, (_, i) =>
                String(i + 1).padStart(2, "0")
              ).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className="field-select"
              value={form.birthDay}
              onChange={(e) => update("birthDay", e.target.value)}
              aria-label="일"
              disabled={submitting}
            >
              <option value="">DD</option>
              {Array.from({ length: 31 }, (_, i) =>
                String(i + 1).padStart(2, "0")
              ).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Choice
              selected={form.calendarType === "solar"}
              onSelect={() => {
                update("calendarType", "solar");
                update("lunarLeapMonth", false);
              }}
              label="양력"
            />
            <Choice
              selected={form.calendarType === "lunar"}
              onSelect={() => update("calendarType", "lunar")}
              label="음력"
            />
          </div>
          {form.calendarType === "lunar" ? (
            <div className="grid grid-cols-2 gap-3">
              <Choice
                selected={!form.lunarLeapMonth}
                onSelect={() => update("lunarLeapMonth", false)}
                label="평달"
              />
              <Choice
                selected={form.lunarLeapMonth}
                onSelect={() => update("lunarLeapMonth", true)}
                label="윤달"
              />
            </div>
          ) : null}
        </fieldset>
      </FormStep>

      <FormStep step="03" title="태어난 시간">
        <fieldset className="space-y-3">
          <Legend>출생 시간</Legend>
          <div className="grid grid-cols-2 gap-3">
            <Choice
              selected={form.birthTimeKnown}
              onSelect={() => update("birthTimeKnown", true)}
              label="시간 알고 있음"
            />
            <Choice
              selected={!form.birthTimeKnown}
              onSelect={() => update("birthTimeKnown", false)}
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
              disabled={submitting}
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
          ref={errorRef}
          role="alert"
          className="rounded-md border border-[var(--error-text)]/30 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]"
        >
          {error}
        </p>
      ) : null}

      <div className="pt-2">
        <Button type="submit" size="full" variant="default" disabled={submitting}>
          {submitting ? "명식을 구성하는 중..." : "내 사주 풀어보기"}
        </Button>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
          생년월일·시간은 사주 계산에만 쓰이며, 외부에 공개되지 않습니다.
        </p>
      </div>
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
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3 border-b border-[var(--border-subtle)] pb-3">
        <span className="flex h-7 w-7 items-center justify-center border border-[var(--border-gold)] bg-[var(--bg-primary)] text-xs font-semibold text-[var(--gold-primary)]">
          {step}
        </span>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Legend({ children }: { children: ReactNode }) {
  return (
    <legend className="text-sm font-medium text-[var(--ink-muted)]">{children}</legend>
  );
}

function Choice({
  selected,
  onSelect,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        onSelect();
      }}
      aria-pressed={selected}
      className={cn(
        "flex min-h-[3.25rem] w-full items-center gap-3 border px-3 py-3 text-left text-sm font-semibold touch-manipulation select-none",
        selected
          ? "border-[#d4a84f] bg-[#d4a84f] text-[#0a0f16]"
          : "border-[rgba(212,168,79,0.45)] bg-[#101f30] text-[rgba(245,240,230,0.88)]"
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center border-2 text-sm font-black leading-none",
          selected
            ? "border-[#0a0f16] bg-[#0a0f16] text-[#d4a84f]"
            : "border-[rgba(212,168,79,0.75)] bg-transparent"
        )}
        aria-hidden
      >
        {selected ? "✓" : null}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}
