import Link from "next/link";

const nav = [
  { href: "/fortune", label: "사주 풀어보기" },
  { href: "/products", label: "운세 리포트" },
  { href: "/my-results", label: "결과 찾기" },
] as const;

function BrandMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="var(--gold)" strokeWidth="0.75" opacity="0.5" />
      <path
        d="M12 3 L12 21 M3 12 L21 12"
        stroke="var(--gold)"
        strokeWidth="0.5"
        opacity="0.35"
      />
      <circle cx="12" cy="12" r="3" fill="var(--gold)" opacity="0.6" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--bg-deep)_85%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 md:px-8 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink-bright)]"
        >
          <BrandMark />
          운의결
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--gold-soft)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/my-results"
          className="text-xs text-[var(--ink-muted)] transition-colors hover:text-[var(--gold-soft)] md:hidden"
        >
          결과 찾기
        </Link>
      </div>
    </header>
  );
}
