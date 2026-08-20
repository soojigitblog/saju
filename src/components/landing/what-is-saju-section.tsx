import { BaguaLarge } from "@/components/mystic/bagua-large";
import { LandingContainer } from "@/components/landing/landing-container";

const items = [
  { title: "정확한 사주 구성", desc: "년·월·일·시 명식 계산", icon: "命" },
  { title: "오행 균형 분석", desc: "木火土金水의 기운", icon: "行" },
  { title: "운의 흐름 해석", desc: "현재와 앞으로의 흐름", icon: "運" },
  { title: "삶의 방향 안내", desc: "성향·재물·관계 정리", icon: "道" },
];

export function WhatIsSajuSection() {
  return (
    <section className="py-14 md:py-20">
      <LandingContainer>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-16">
          <div className="flex justify-center lg:justify-start">
            <BaguaLarge />
          </div>
          <div>
            <p className="hanja-accent mb-2">WHAT IS SAJU</p>
            <h2 className="display-title text-2xl md:text-3xl">사주란 무엇인가요?</h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--ink-muted)] md:text-base">
              사주(四柱)는 태어난 연·월·일·시의 네 기둥으로 구성된 명리학의 기본
              틀입니다. 천간과 지지, 오행과 십성을 통해 타고난 성향과 삶의
              흐름을 읽어냅니다.
            </p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {items.map((item) => (
            <div
              key={item.title}
              className="border-t border-[var(--line)] pt-5 text-center md:text-left"
            >
              <span className="font-[family-name:var(--font-display)] text-xl text-[var(--gold)] md:text-2xl">
                {item.icon}
              </span>
              <p className="mt-2 text-sm font-semibold text-[var(--ink-bright)]">{item.title}</p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}
