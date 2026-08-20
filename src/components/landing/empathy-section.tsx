import Link from "next/link";
import { LandingContainer } from "@/components/landing/landing-container";

const worries = [
  "돈은 버는데 왜 남지 않을까?",
  "지금 이직해도 괜찮을까?",
  "올해 새로운 사람을 만날 수 있을까?",
  "언제쯤 일이 풀리기 시작할까?",
  "내 인생에서 좋은 시기는 언제일까?",
];

export function EmpathySection() {
  return (
    <section className="border-t border-[var(--line)] py-14 md:py-16">
      <LandingContainer>
        <p className="hanja-accent mb-2">YOUR QUESTIONS</p>
        <h2 className="display-title text-2xl">요즘 이런 고민이 있으신가요?</h2>
        <p className="mt-3 text-sm text-[var(--ink-muted)]">
          사주는 이런 질문에 대한 힌트를 줄 수 있습니다.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {worries.map((item) => (
            <Link
              key={item}
              href="/fortune"
              className="group border border-[var(--line)] bg-[var(--paper)]/50 px-4 py-4 transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--surface)]"
            >
              <p className="text-sm text-[var(--ink)] group-hover:text-[var(--ink-bright)]">{item}</p>
            </Link>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}
