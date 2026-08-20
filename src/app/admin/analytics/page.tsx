export const metadata = { title: "분석" };

export default function AdminAnalyticsPage() {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Analytics
      </h1>
      <p className="mt-3 text-sm text-[var(--ink-muted)]">
        UTM/Funnel 상세는 PHASE 9에서 구현합니다. 요약은 대시보드를 참고하세요.
      </p>
    </div>
  );
}
