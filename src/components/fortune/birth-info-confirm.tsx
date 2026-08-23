"use client";

import { cn } from "@/lib/utils";
import { formatBirthTimeKorean } from "@/lib/birth-time/am-pm";
import type { FortuneFormValues } from "@/types";
import { Button } from "@/components/ui/button";

const GENDER_LABEL: Record<string, string> = {
  male: "남성",
  female: "여성",
};

const MARITAL_LABEL: Record<string, string> = {
  unmarried: "미혼",
  married: "기혼",
  prefer_not: "선택 안 함",
};

const CHILDREN_LABEL: Record<string, string> = {
  yes: "있음",
  no: "없음",
  prefer_not: "선택 안 함",
};

export function BirthInfoConfirmStep({
  form,
  onEdit,
  onConfirm,
  submitting,
}: {
  form: FortuneFormValues;
  onEdit: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  const birthDate = `${form.birthYear}년 ${Number(form.birthMonth)}월 ${Number(form.birthDay)}일`;
  const calendarLabel =
    form.calendarType === "solar"
      ? "양력"
      : form.lunarLeapMonth
        ? "음력 (윤달)"
        : "음력";

  return (
    <section className="space-y-6">
      <div>
        <p className="hanja-accent mb-2">CONFIRM</p>
        <h2 className="display-title text-xl">분석할 출생정보를 확인해주세요</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          특히 오전/오후와 시·분이 맞는지 꼭 확인해 주세요.
        </p>
      </div>

      <div className="space-y-4 border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
        <ConfirmRow label="닉네임" value={form.nickname.trim()} />
        <ConfirmRow label="생년월일" value={`${birthDate} · ${calendarLabel}`} />
        <ConfirmRow
          label="출생시간"
          highlight
          value={
            form.birthTimeKnown
              ? formatBirthTimeKorean(form.birthTime)
              : "시간 모름 (시주 미계산)"
          }
        />
        <ConfirmRow label="성별" value={GENDER_LABEL[form.gender] ?? ""} />
        <ConfirmRow label="출생지역" value={form.birthPlace} />
        <ConfirmRow label="혼인" value={MARITAL_LABEL[form.maritalStatus] ?? ""} />
        {form.maritalStatus === "married" ? (
          <ConfirmRow
            label="자녀"
            value={CHILDREN_LABEL[form.hasChildren] ?? ""}
          />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          size="full"
          disabled={submitting}
          onClick={onEdit}
        >
          수정하기
        </Button>
        <Button
          type="button"
          variant="default"
          size="full"
          disabled={submitting}
          onClick={onConfirm}
        >
          {submitting ? "분석 시작 중..." : "이 정보로 분석하기"}
        </Button>
      </div>
    </section>
  );
}

function ConfirmRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="shrink-0 text-xs text-[var(--text-muted)]">{label}</span>
      <span
        className={cn(
          "text-sm",
          highlight
            ? "font-semibold text-[var(--gold-light)]"
            : "text-[var(--text-primary)]"
        )}
      >
        {value}
      </span>
    </div>
  );
}
