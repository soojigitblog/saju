import { LandingContainer } from "@/components/landing/landing-container";

const points = [
  {
    title: "개인정보 보호",
    desc: "입력 정보는 해석 후 안전하게 처리됩니다",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"
          stroke="var(--gold)"
          strokeWidth="1"
          opacity="0.85"
        />
        <path d="M9 12l2 2 4-4" stroke="var(--gold)" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "오행 · 십성 분석",
    desc: "木火土金水의 균형을 체계적으로 살핍니다",
    icon: (
      <span className="font-[family-name:var(--font-display)] text-2xl text-[var(--gold)]">五</span>
    ),
  },
  {
    title: "운의 흐름 해석",
    desc: "명리 데이터를 바탕으로 흐름을 읽어드립니다",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="1.5" fill="var(--gold)" />
        <circle cx="6" cy="8" r="1" fill="var(--gold)" opacity="0.6" />
        <circle cx="18" cy="6" r="1" fill="var(--gold)" opacity="0.5" />
        <circle cx="16" cy="16" r="1" fill="var(--gold)" opacity="0.7" />
        <circle cx="8" cy="17" r="0.8" fill="var(--gold)" opacity="0.4" />
      </svg>
    ),
  },
];

export function TrustSection() {
  return (
    <section className="border-y border-[var(--line)] bg-[var(--paper)]/30 py-8 md:py-10">
      <LandingContainer>
        <div className="grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-10">
          {points.map((p) => (
            <div key={p.title} className="flex flex-col items-center text-center md:items-start md:text-left">
              <div className="mb-3 flex h-12 w-12 items-center justify-center">{p.icon}</div>
              <p className="text-sm font-semibold text-[var(--ink-bright)]">{p.title}</p>
              <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-[var(--ink-muted)]">{p.desc}</p>
            </div>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}
