import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isCurrentUserAdmin } from "@/lib/repositories/roles";

export const metadata = { title: "운의결 관리자 로그인" };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isCurrentUserAdmin()) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="admin-shell flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-8 shadow-lg">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-gold)]">
          운의결 관리자
        </h1>
        <p className="mt-2 text-sm text-[var(--admin-muted)]">
          운영 계정으로 로그인해 주세요.
        </p>
        <Suspense fallback={<p className="mt-8 text-sm text-[var(--admin-muted)]">로딩…</p>}>
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
