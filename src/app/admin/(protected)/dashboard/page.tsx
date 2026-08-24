import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getAdminTodayStats } from "@/lib/repositories/admin-stats";

export const metadata = {
  title: "관리자 대시보드",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await getAdminTodayStats();
  return <AdminDashboard stats={stats} />;
}
