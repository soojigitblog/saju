import Link from "next/link";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { getPaidReportForOwner } from "@/lib/services/get-paid-report";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { getProfileById } from "@/lib/repositories/profiles";
import { PaidReportView } from "@/components/report/paid-report-view";
import { MysticPage } from "@/components/mystic/celestial-background";
import { Button } from "@/components/ui/button";
import { mockPaidReport } from "@/lib/mock-data";
import type { PaidReport } from "@/types";
import type { PaidFortuneReport } from "@/lib/ai/schemas/paid-report";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "상세 리포트",
  robots: { index: false, follow: false },
};

function Message({
  title,
  body,
  href,
  label,
}: {
  title: string;
  body: string;
  href: string;
  label: string;
}) {
  return (
    <MysticPage>
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="hanja-accent">REPORT</p>
        <h1 className="display-title mt-4 text-2xl">{title}</h1>
        <p className="mt-4 text-sm text-[var(--text-secondary)]">{body}</p>
        <Button asChild className="mt-8" variant="outline">
          <Link href={href}>{label}</Link>
        </Button>
      </div>
    </MysticPage>
  );
}

function mapToPaidReportView(input: {
  reportJson: PaidFortuneReport;
  nickname: string;
  productName: string;
  orderNo: string;
  id: string;
}): PaidReport {
  const r = input.reportJson;
  return {
    id: input.id,
    orderNo: input.orderNo,
    nickname: input.nickname,
    productName: input.productName,
    headline: r.title,
    summary: r.executiveSummary,
    keywords: r.keywords ?? [],
    chapters: (r.sections ?? []).map((s, i) => ({
      number: String(i + 1).padStart(2, "0"),
      title: s.title,
      body: s.detail,
    })),
    monthlyOutlook: r.monthlyOutlook?.map((m) => ({
      month: m.month,
      title: m.title,
      summary: m.summary,
      detail: m.detail,
      focus: m.focus,
    })),
  };
}

type PageModel =
  | { kind: "demo"; report: PaidReport }
  | { kind: "view"; report: PaidReport }
  | {
      kind: "message";
      title: string;
      body: string;
      href: string;
      label: string;
    };

async function loadPage(input: {
  id: string;
  access?: string;
}): Promise<PageModel> {
  if (input.id === "demo" || input.id === mockPaidReport.id) {
    return { kind: "demo", report: mockPaidReport };
  }

  const guestSessionId = await getGuestSessionId();

  try {
    const { order, report } = await getPaidReportForOwner({
      reportOrOrderId: input.id,
      guestSessionId: guestSessionId ?? null,
      accessToken: input.access ?? null,
    });

    if (report.generation_status !== "COMPLETED" || !report.result_json) {
      return {
        kind: "message",
        title:
          report.generation_status === "FAILED"
            ? "리포트 생성에 실패했습니다"
            : "리포트를 준비하고 있습니다",
        body:
          report.generation_status === "FAILED"
            ? "결제는 완료되었습니다. 결제 완료 화면에서 다시 생성을 시도해 주세요."
            : "잠시 후 다시 확인해 주세요.",
        href: "/my-results",
        label: "내 결과 보기",
      };
    }

    const profile = await getProfileById(order.profile_id);
    return {
      kind: "view",
      report: mapToPaidReportView({
        reportJson: report.result_json as unknown as PaidFortuneReport,
        nickname: profile?.nickname ?? "고객",
        productName: order.product_name_snapshot ?? "유료 리포트",
        orderNo: order.order_no,
        id: report.id,
      }),
    };
  } catch (error) {
    if (error instanceof FreeFlowError) {
      if (error.code === "FORBIDDEN") {
        return {
          kind: "message",
          title: "접근할 수 없습니다",
          body: "이 리포트를 볼 권한이 없습니다.",
          href: "/my-results",
          label: "내 결과",
        };
      }
      return {
        kind: "message",
        title: "리포트를 찾을 수 없습니다",
        body: error.message,
        href: "/products",
        label: "상품 목록",
      };
    }
    return {
      kind: "message",
      title: "오류가 발생했습니다",
      body: "잠시 후 다시 시도해 주세요.",
      href: "/",
      label: "홈으로",
    };
  }
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ access?: string }>;
}) {
  const { id } = await params;
  const { access } = await searchParams;
  const model = await loadPage({ id, access });

  if (model.kind === "demo" || model.kind === "view") {
    return <PaidReportView report={model.report} />;
  }

  return (
    <Message
      title={model.title}
      body={model.body}
      href={model.href}
      label={model.label}
    />
  );
}
