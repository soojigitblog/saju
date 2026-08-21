import { EmpathySection } from "@/components/landing/empathy-section";
import { LandingBottomCta } from "@/components/landing/landing-bottom-cta";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingAnalytics } from "@/components/landing/landing-analytics";
import { BrandJourneySection } from "@/components/landing/brand-journey-section";
import { PopularFortuneSection } from "@/components/landing/popular-fortune-section";
import { TrustSection } from "@/components/landing/trust-section";
import { WhatIsSajuSection } from "@/components/landing/what-is-saju-section";

export default function LandingPage() {
  return (
    <>
      <LandingAnalytics />
      <div className="mx-auto w-full pb-8">
        <LandingHero />
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
