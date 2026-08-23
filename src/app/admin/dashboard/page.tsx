import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { mockAdminStats } from "@/lib/mock-data";
import { countPendingBankTransferOrders } from "@/lib/repositories/orders";

export const metadata = {
  title: "관리자 대시보드",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const pendingBankDeposits = await countPendingBankTransferOrders();

  return (
    <AdminDashboard
      stats={mockAdminStats}
      pendingBankDeposits={pendingBankDeposits}
    />
  );
}
