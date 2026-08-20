import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingContainer } from "@/components/landing/landing-container";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-8 pb-12 md:pt-12 md:pb-16">
      {/* subtle starfield */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, rgba(232,213,176,0.4), transparent), radial-gradient(1px 1px at 60% 20%, rgba(232,213,176,0.3), transparent), radial-gradient(1px 1px at 80% 60%, rgba(232,213,176,0.25), transparent)",
        }}
      />

      <LandingContainer>
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
          <div className="animate-fade-up md:pr-4">
            <p className="text-sm tracking-[0.2em] text-[var(--gold)]">사주로 읽는</p>
            <h1 className="display-title mt-2 text-[2.75rem] leading-[1.1] md:text-5xl lg:text-[3.25rem]">
              당신의 운명
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--ink-muted)] md:text-lg">
              태어난 순간의 기운을 풀어
              <br className="hidden sm:block" />
              당신의 삶을 더 깊이 이해해보세요.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild variant="parchment" size="lg" className="min-w-[200px]">
                <Link href="/fortune">무료 사주 보기</Link>
              </Button>
              <p className="text-sm text-[var(--ink-faint)]">
                회원가입 없이 · 약 1분 소요
              </p>
            </div>
          </div>

          <div
            className="relative mx-auto w-full max-w-md animate-fade-up md:mx-0 md:max-w-none"
            style={{ animationDelay: "0.12s" }}
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-[var(--line-strong)] shadow-[var(--shadow-deep),var(--glow-warm)]">
              <Image
                src="/images/landing/hero-saju-desk.png"
                alt=""
                fill
                priority
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 480px"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg-deep)]/60 via-transparent to-transparent" />
            </div>
            {/* corner ornaments */}
            <span className="absolute -left-1 -top-1 h-4 w-4 border-l border-t border-[var(--gold)] opacity-70" />
            <span className="absolute -right-1 -top-1 h-4 w-4 border-r border-t border-[var(--gold)] opacity-70" />
            <span className="absolute -bottom-1 -left-1 h-4 w-4 border-b border-l border-[var(--gold)] opacity-70" />
            <span className="absolute -bottom-1 -right-1 h-4 w-4 border-b border-r border-[var(--gold)] opacity-70" />
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}
