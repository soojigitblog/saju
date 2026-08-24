import { getCurrentAdminUser } from "@/lib/repositories/roles";

export const dynamic = "force-dynamic";
export const metadata = { title: "설정 | Admin" };

export default async function AdminSettingsPage() {
  const admin = await getCurrentAdminUser();

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-gold)]">
        설정
      </h1>
      <section className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-5 text-sm">
        <p className="text-[var(--admin-muted)]">로그인 계정</p>
        <p className="mt-2 font-medium">{admin?.email ?? "—"}</p>
        <p className="mt-4 text-xs text-[var(--admin-muted)]">
          ADMIN_MANUAL_TOKEN 입력 UI는 제거되었습니다. Supabase Auth + ADMIN
          role만 사용합니다.
        </p>
        <p className="mt-2 text-xs text-[var(--admin-muted)]">
          로그아웃은 사이드바 하단 버튼을 사용하세요.
        </p>
      </section>
    </div>
  );
}
