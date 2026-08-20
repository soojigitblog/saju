import { notFound } from "next/navigation";
import { PaidReportView } from "@/components/report/paid-report-view";
import { mockPaidReport } from "@/lib/mock-data";

export const metadata = {
  title: "상세 리포트",
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id !== "demo" && id !== mockPaidReport.id) {
    notFound();
  }
  return <PaidReportView report={mockPaidReport} />;
}
