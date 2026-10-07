import Link from "next/link";
import { EmpathySection } from "@/components/landing/empathy-section";
import { LandingBottomCta } from "@/components/landing/landing-bottom-cta";
import { LandingContainer, OrnateFrame } from "@/components/landing/landing-container";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingAnalytics } from "@/components/landing/landing-analytics";
import { BrandJourneySection } from "@/components/landing/brand-journey-section";
import { PopularFortuneSection } from "@/components/landing/popular-fortune-section";
import { TrustSection } from "@/components/landing/trust-section";
import { WhatIsSajuSection } from "@/components/landing/what-is-saju-section";
import { Button } from "@/components/ui/button";
import { getProductBySlug } from "@/lib/repositories/products";
import { formatKRW } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  // Public, server-rendered product facts help visitors and PG crawlers find the
  // actual purchasable digital report without relying on client-side navigation.
  const adultReport = await getProductBySlug("2026-total");

  return (
    <>
      <LandingAnalytics />
      <div className="mx-auto w-full pb-8">
        <LandingHero />
        {adultReport?.status === "ACTIVE" ? (
          <section aria-labelledby="adult-report-title" className="py-14 md:py-20">
            <LandingContainer>
              <OrnateFrame className="mx-auto max-w-3xl">
                <p className="hanja-accent mb-2">ADULT SAJU REPORT</p>
                <h2 id="adult-report-title" className="display-title text-2xl md:text-3xl">
                  운의결 성인 사주 리포트
                </h2>
                <p className="mt-2 text-sm text-[var(--ink-muted)]">
                  개인 맞춤형 디지털 콘텐츠
                </p>
                <div className="mt-6 border-y border-[var(--line)] py-5">
                  <p className="text-base font-semibold text-[var(--ink-bright)]">
                    {adultReport.name}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
                    {adultReport.shortDescription}
                  </p>
                  <p className="mt-4 text-2xl font-semibold text-[var(--gold-soft)]">
                    {formatKRW(adultReport.salePrice)}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--ink-muted)]">
                    생년월일과 출생시간을 바탕으로 리포트를 생성해 웹사이트 「내 결과」에서 다시 열람할 수 있습니다.
                  </p>
                </div>
                <div className="mt-6">
                  <Button asChild variant="default" size="lg">
                    <Link href={`/product/${adultReport.slug}`}>상품 상세 보기</Link>
                  </Button>
                </div>
              </OrnateFrame>
            </LandingContainer>
          </section>
        ) : null}
        <BrandJourneySection />
        <TrustSection />
        <WhatIsSajuSection />
        <PopularFortuneSection />
        <EmpathySection />
        <LandingBottomCta />
        <footer className="px-5 pb-8 pt-4 text-center text-xs text-[var(--text-muted)] md:px-8">
          © 운의결 · 운세 해석은 참고용이며, 결정은 스스로의 것입니다
        </footer>
      </div>
    </>
  );
}
