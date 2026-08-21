import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingContainer, OrnateFrame } from "@/components/landing/landing-container";

export function LandingBottomCta() {
  return (
    <section className="py-14 md:py-20">
      <LandingContainer>
        <OrnateFrame className="text-center">
          <p className="hanja-accent mb-2">BEGIN YOUR READING</p>
          <h2 className="display-title text-2xl md:text-3xl">
            지금, 당신의 사주를 풀어보세요
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-[var(--ink-muted)]">
            회원가입 없이 약 1분이면 첫 해석을 받아볼 수 있습니다.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild variant="default" size="lg" className="min-w-[220px]">
              <Link href="/fortune">무료 사주 풀어보기</Link>
            </Button>
          </div>
        </OrnateFrame>
      </LandingContainer>
    </section>
  );
}
