import { EmpathySection } from "@/components/landing/empathy-section";
import { LandingBottomCta } from "@/components/landing/landing-bottom-cta";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingAnalytics } from "@/components/landing/landing-analytics";
import { PopularFortuneSection } from "@/components/landing/popular-fortune-section";
import { TrustSection } from "@/components/landing/trust-section";
import { WhatIsSajuSection } from "@/components/landing/what-is-saju-section";
import { StickyCta } from "@/components/layout/sticky-cta";

export default function LandingPage() {
  return (
    <>
      <LandingAnalytics />
      <div className="mx-auto w-full pb-24">
        <LandingHero />
        <TrustSection />
        <WhatIsSajuSection />
        <PopularFortuneSection />
        <EmpathySection />
        <LandingBottomCta />
        <footer className="px-5 pb-8 pt-4 text-center text-xs text-[var(--ink-faint)] md:px-8">
          © 운의결 · 참고/엔터테인먼트 목적의 운세 콘텐츠
        </footer>
      </div>
      <StickyCta />
    </>
  );
}
