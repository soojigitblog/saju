import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { MysticCard } from "@/components/ui/card";

export function PreviewSection() {
  return (
    <section className="px-5 py-14">
      <p className="hanja-accent mb-2">PREVIEW</p>
      <h2 className="display-title text-2xl">결과 미리보기</h2>

      <MysticCard className="mt-8 p-6">
        <p className="text-xs text-[var(--ink-faint)]">샘플 리포트 · 2026년 흐름</p>

        <div className="mt-5 space-y-3">
          {[
            { label: "전체운", value: 4 },
            { label: "직업운", value: 5 },
            { label: "재물운", value: 4 },
            { label: "연애운", value: 3 },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-sm text-[var(--ink-muted)]">{row.label}</span>
              <StarRating value={row.value} />
            </div>
          ))}
        </div>

        <div className="gold-divider my-6" />

        <p className="text-xs tracking-wide text-[var(--ink-faint)]">올해의 핵심 키워드</p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-[var(--ink-bright)]">
          변화 · 선택 · 확장
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">
          당신에게 중요한 변화가 다가오고 있습니다.
        </p>

        <Button asChild size="full" className="mt-8">
          <Link href="/fortune">내 사주 무료로 확인하기</Link>
        </Button>
      </MysticCard>
    </section>
  );
}
