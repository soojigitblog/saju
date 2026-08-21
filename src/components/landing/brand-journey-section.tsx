import { LandingContainer } from "@/components/landing/landing-container";
import { GoldDivider } from "@/components/mystic/section-heading";

const steps = [
  {
    mark: "四柱",
    title: "나는 어떤 사람인가?",
    body: "타고난 성향과 큰 흐름을 사주로 읽습니다.",
  },
  {
    mark: "TAROT",
    title: "지금 무엇이 고민인가?",
    body: "카드로 지금의 질문과 감정을 가까이 들여다봅니다.",
  },
  {
    mark: "運의結",
    title: "두 흐름이 만나는 곳",
    body: "사주와 타로를 이어, 현실적인 언어로 해석합니다.",
  },
] as const;

export function BrandJourneySection() {
  return (
    <section className="py-12 md:py-16">
      <LandingContainer>
        <p className="hanja-accent mb-3 text-center">HOW 運의結 READS</p>
        <h2 className="display-title text-center text-2xl md:text-3xl">
          하나의 이야기처럼 이어집니다
        </h2>
        <div className="mt-10 grid gap-0 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.mark} className="relative px-4 py-6 text-center md:px-6">
              {i > 0 ? (
                <div className="absolute left-1/2 top-0 h-px w-16 -translate-x-1/2 bg-[var(--border-gold)]/40 md:left-0 md:top-1/2 md:h-16 md:w-px md:-translate-y-1/2" />
              ) : null}
              <p className="text-xs tracking-[0.25em] text-[var(--gold-primary)]">{s.mark}</p>
              <p className="display-title mt-3 text-lg">{s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                {s.body}
              </p>
              {i < steps.length - 1 ? (
                <p className="mt-4 text-[var(--gold-muted)] md:hidden">↓</p>
              ) : null}
            </div>
          ))}
        </div>
        <GoldDivider className="mx-auto mt-4 max-w-xs" />
      </LandingContainer>
    </section>
  );
}
