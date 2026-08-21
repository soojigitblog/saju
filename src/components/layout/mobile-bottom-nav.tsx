"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/mystic/brand-mark";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "홈", match: (p: string) => p === "/" },
  {
    href: "/fortune",
    label: "사주",
    match: (p: string) => p.startsWith("/fortune") || p.startsWith("/result"),
  },
  {
    href: "/products",
    label: "리포트",
    match: (p: string) => p.startsWith("/product"),
  },
  {
    href: "/my-results",
    label: "나의 결과",
    match: (p: string) => p.startsWith("/my-results"),
  },
] as const;

/** Mobile bottom nav — hidden during immersive tarot / fortune form. */
export function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/tarot")) return null;
  if (pathname.startsWith("/fortune")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-gold)]/30 bg-[color-mix(in_oklab,var(--bg-primary)_94%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="하단 메뉴"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[10px] tracking-wide",
                  active
                    ? "text-[var(--gold-light)]"
                    : "text-[var(--text-muted)]"
                )}
              >
                {item.href === "/" ? (
                  <BrandMark size={16} />
                ) : (
                  <span
                    className={cn(
                      "h-1 w-1 rounded-full",
                      active ? "bg-[var(--gold-primary)]" : "bg-transparent"
                    )}
                  />
                )}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
