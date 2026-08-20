import Link from "next/link";
import { LandingContainer } from "@/components/landing/landing-container";

const cards = [
  {
    title: "종합 사주 풀이",
    desc: "타고난 성향과 전체 흐름",
    mood: "scroll",
    href: "/products",
  },
  {
    title: "연애 · 궁합",
    desc: "관계와 인연의 흐름",
    mood: "moon",
    href: "/products",
  },
  {
    title: "재물 · 사업운",
    desc: "재물의 흐름과 기회",
    mood: "coin",
    href: "/products",
  },
  {
    title: "무료 사주",
    desc: "지금 바로 시작하기",
    mood: "year",
    href: "/fortune",
  },
  {
    title: "인생 시기별 운세",
    desc: "대운별 흐름 안내",
    mood: "mountain",
    href: "/products",
  },
];

function CardThumb({ mood }: { mood: string }) {
  const styles: Record<string, { bg: string; label: string }> = {
    scroll: {
      bg: "radial-gradient(circle at 30% 40%, rgba(184,147,90,0.25), transparent 50%), linear-gradient(145deg, #1a1814 0%, #0d1218 100%)",
      label: "命書",
    },
    moon: {
      bg: "radial-gradient(circle at 70% 25%, rgba(200,180,220,0.15), transparent 45%), linear-gradient(145deg, #121828 0%, #0a1018 100%)",
      label: "緣",
    },
    coin: {
      bg: "radial-gradient(circle at 50% 60%, rgba(184,147,90,0.3), transparent 40%), linear-gradient(145deg, #1a1510 0%, #101820 100%)",
      label: "財",
    },
    year: {
      bg: "radial-gradient(circle at 40% 30%, rgba(120,160,200,0.2), transparent 50%), linear-gradient(145deg, #0f1520 0%, #080d12 100%)",
      label: "歲運",
    },
    mountain: {
      bg: "linear-gradient(180deg, rgba(80,100,120,0.3) 0%, transparent 40%), linear-gradient(145deg, #0f1418 0%, #151a1f 100%)",
      label: "大運",
    },
  };
  const s = styles[mood] ?? styles.scroll;

  return (
    <div
      className="relative mb-3 aspect-square w-full overflow-hidden border border-[var(--line)]"
      style={{ background: s.bg }}
      aria-hidden
    >
      <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-display)] text-lg text-[var(--gold)] opacity-60">
        {s.label}
      </span>
    </div>
  );
}

export function PopularFortuneSection() {
  return (
    <section className="py-14 md:py-20">
      <LandingContainer>
        <p className="hanja-accent mb-2">POPULAR</p>
        <h2 className="display-title text-2xl md:text-3xl">많은 분들이 보고 있는 운세</h2>

        <div className="-mx-5 mt-8 flex gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group w-[140px] shrink-0 md:w-auto"
            >
              <CardThumb mood={card.mood} />
              <p className="text-sm font-semibold text-[var(--ink-bright)] transition-colors group-hover:text-[var(--gold-soft)]">
                {card.title}
              </p>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{card.desc}</p>
            </Link>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}
