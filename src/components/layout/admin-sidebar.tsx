"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/dashboard", label: "대시보드" },
  { href: "/admin/products", label: "상품" },
  { href: "/admin/orders", label: "주문" },
  { href: "/admin/bank-deposits", label: "입금확인" },
  { href: "/admin/bugs", label: "버그/에러" },
  { href: "/admin/prompts", label: "프롬프트" },
  { href: "/admin/analytics", label: "분석" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-[var(--line)] bg-[var(--paper)] lg:w-56 lg:border-b-0 lg:border-r">
      <div className="px-5 py-5">
        <Link
          href="/admin/dashboard"
          className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]"
        >
          운의결 Admin
        </Link>
        <p className="mt-1 text-xs text-[var(--ink-faint)]">운영 Admin</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-6">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--surface-strong)] font-semibold text-[var(--ink)]"
                  : "text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
