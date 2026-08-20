import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { mockAdminStats } from "@/lib/mock-data";

export const metadata = {
  title: "관리자 대시보드",
};

export default function AdminDashboardPage() {
  return <AdminDashboard stats={mockAdminStats} />;
}
