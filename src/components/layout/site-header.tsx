import Link from "next/link";
import { BrandMark } from "@/components/mystic/brand-mark";

const nav = [
  { href: "/fortune", label: "사주 풀어보기" },
  { href: "/products", label: "운세 리포트" },
  { href: "/my-results", label: "결과 찾기" },
] as const;

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-[var(--border-gold)]/40 bg-[color-mix(in_oklab,var(--bg-primary)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5 md:px-8 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--text-primary)]"
        >
          <BrandMark size={26} />
          <span>
            운의결
            <span className="ml-1.5 hidden text-[10px] tracking-[0.2em] text-[var(--gold-muted)] sm:inline">
              運의結
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="주요 메뉴">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--gold-light)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/my-results"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-gold)]/50 text-[var(--gold-light)] transition-colors hover:bg-[var(--accent-soft)]"
          aria-label="마이페이지"
        >
          <BrandMark size={18} />
        </Link>
      </div>
    </header>
  );
}
