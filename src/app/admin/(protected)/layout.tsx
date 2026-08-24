import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { requireAdminPage } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage("/admin/dashboard");

  return (
    <div className="admin-shell min-h-full">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col lg:flex-row">
        <AdminSidebar />
        <div className="flex-1 p-4 sm:p-5 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
