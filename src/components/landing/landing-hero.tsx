import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingContainer } from "@/components/landing/landing-container";
import { CelestialBackground } from "@/components/mystic/celestial-background";
import { BrandMark } from "@/components/mystic/brand-mark";
import { OrnamentCard } from "@/components/mystic/ornament-card";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-10 pb-14 md:pt-16 md:pb-20">
      <CelestialBackground intensity="rich" />
      <LandingContainer>
        <div className="relative mx-auto max-w-3xl text-center animate-fade-up">
          <p className="hanja-accent">四柱 · 命式 · 運의結</p>
          <div className="mt-5 flex justify-center">
            <BrandMark size={42} />
          </div>
          <h1 className="display-title mt-6 text-[1.85rem] leading-[1.25] md:text-4xl lg:text-[2.75rem]">
            내 안에 이미 있는 흐름,
            <br />
            지금의 고민과 연결해 보다.
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
            사주로 타고난 성향을 읽고,
            <br className="sm:hidden" />
            타로로 지금의 질문을 들여다보며
            <br />
            두 흐름을 잇는 프리미엄 리딩.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3">
            <Button asChild variant="default" size="lg" className="min-w-[220px]">
              <Link href="/fortune">무료 사주 풀어보기</Link>
            </Button>
            <p className="text-xs text-[var(--text-muted)]">
              회원가입 없이 시작 · 약 1분 소요
            </p>
          </div>
        </div>

        <div className="relative mx-auto mt-14 max-w-2xl animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <OrnamentCard density="corners" className="relative overflow-hidden px-5 py-8 text-center md:px-10">
            <CelestialBackground intensity="soft" className="opacity-60" />
            <p className="relative text-xs tracking-[0.2em] text-[var(--gold-muted)]">
              생년월일로 시작하는
            </p>
            <p className="display-title relative mt-2 text-lg md:text-xl">나만의 운의 흐름</p>
            <div className="relative mx-auto mt-6 flex max-w-sm justify-between text-[11px] tracking-[0.35em] text-[var(--text-muted)]">
              <span>木</span>
              <span>火</span>
              <span className="text-[var(--gold-light)]">土</span>
              <span>金</span>
              <span>水</span>
            </div>
          </OrnamentCard>
        </div>
      </LandingContainer>
    </section>
  );
}
