import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-[var(--surface)]">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col lg:flex-row">
        <AdminSidebar />
        <div className="flex-1 p-5 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
