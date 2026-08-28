"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/admin/dashboard", label: "대시보드" },
  { href: "/admin/bank-deposits", label: "입금 확인" },
  { href: "/admin/orders", label: "주문" },
  { href: "/admin/runbook", label: "첫 결제 런북" },
  { href: "/admin/report-waiting", label: "리포트 생성 대기" },
  { href: "/admin/reports", label: "유료 리포트" },
  { href: "/admin/ai-generations", label: "AI 생성 현황" },
  { href: "/admin/feedback", label: "피드백" },
  { href: "/admin/products", label: "상품 관리" },
  { href: "/admin/prompts", label: "Prompt 관리" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/bank", label: "은행 상태" },
  { href: "/admin/bugs", label: "버그/에러" },
  { href: "/admin/settings", label: "설정" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <aside className="w-full border-b border-[var(--admin-line)] bg-[var(--admin-panel)] lg:w-56 lg:border-b-0 lg:border-r">
      <div className="px-5 py-5">
        <Link
          href="/admin/dashboard"
          className="font-[family-name:var(--font-display)] text-lg text-[var(--admin-gold)]"
        >
          운의결 Admin
        </Link>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">운영 대시보드</p>
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
                  ? "bg-[var(--admin-accent-soft)] font-semibold text-[var(--admin-gold)]"
                  : "text-[var(--admin-muted)] hover:bg-[var(--admin-accent-soft)] hover:text-[var(--admin-ink)]"
              )}
            >
              {link.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-[var(--admin-muted)] hover:bg-[var(--admin-accent-soft)] hover:text-[var(--admin-ink)] lg:mt-4"
        >
          로그아웃
        </button>
      </nav>
    </aside>
  );
}
