"use client";

import { cn } from "@/lib/utils";
import {
  formatBirthTimeKorean,
  HOUR12_OPTIONS,
  MINUTE_OPTIONS,
  toDisplayTime,
  toStorageTime,
  type AmPmPeriod,
  type BirthTimeDisplay,
} from "@/lib/birth-time/am-pm";

type BirthTimePickerProps = {
  value: string;
  onChange: (isoTime: string) => void;
  disabled?: boolean;
  className?: string;
};

export function BirthTimePicker({
  value,
  onChange,
  disabled = false,
  className,
}: BirthTimePickerProps) {
  const display = toDisplayTime(value);

  function update(patch: Partial<BirthTimeDisplay>) {
    const next = { ...display, ...patch };
    onChange(toStorageTime(next));
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-3">
        <PeriodChoice
          label="오전"
          selected={display.period === "AM"}
          disabled={disabled}
          onSelect={() => update({ period: "AM" })}
        />
        <PeriodChoice
          label="오후"
          selected={display.period === "PM"}
          disabled={disabled}
          onSelect={() => update({ period: "PM" })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]" htmlFor="birth-hour">
            시
          </label>
          <select
            id="birth-hour"
            className="field-select w-full"
            value={display.hour12}
            disabled={disabled}
            onChange={(e) => update({ hour12: Number(e.target.value) })}
          >
            {HOUR12_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h}시
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)]" htmlFor="birth-minute">
            분
          </label>
          <select
            id="birth-minute"
            className="field-select w-full"
            value={display.minute}
            disabled={disabled}
            onChange={(e) => update({ minute: Number(e.target.value) })}
          >
            {MINUTE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}분
              </option>
            ))}
          </select>
        </div>
      </div>

      <p
        className="rounded-md border border-[var(--border-gold)]/40 bg-[var(--surface-strong)] px-4 py-3 text-center text-sm font-medium text-[var(--gold-light)]"
        aria-live="polite"
      >
        {formatBirthTimeKorean(value)}
      </p>
    </div>
  );
}

function PeriodChoice({
  label,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        if (!disabled) onSelect();
      }}
      aria-pressed={selected}
      className={cn(
        "flex min-h-[3rem] items-center justify-center border px-3 py-2 text-sm font-semibold touch-manipulation select-none",
        selected
          ? "border-[#d4a84f] bg-[#d4a84f] text-[#0a0f16]"
          : "border-[rgba(212,168,79,0.45)] bg-[#101f30] text-[rgba(245,240,230,0.88)]",
        disabled && "opacity-50"
      )}
    >
      {label}
    </button>
  );
}

export { formatBirthTimeKorean, toDisplayTime, toStorageTime };
export type { AmPmPeriod, BirthTimeDisplay };
