import Link from "next/link";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { getPaidReportForOwner } from "@/lib/services/get-paid-report";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { getProfileById } from "@/lib/repositories/profiles";
import { PaidReportView } from "@/components/report/paid-report-view";
import { PaidConsultingReportView } from "@/components/report/paid-consulting-report-view";
import { PaidTarotReportView } from "@/components/report/paid-tarot-report-view";
import { MysticPage } from "@/components/mystic/celestial-background";
import { Button } from "@/components/ui/button";
import { mockPaidReport } from "@/lib/mock-data";
import { isConsultingReportRenderVersion } from "@/lib/report/paid-report-versions";
import { deriveReportGenerationMode } from "@/lib/services/paid-report-metadata";
import { isTossTestSandboxCheckoutAllowed } from "@/lib/payments/toss-sandbox";
import type { PaidReport } from "@/types";
import type { PaidFortuneReport } from "@/lib/ai/schemas/paid-report";
import type { PaidCrossReading } from "@/lib/ai/schemas/paid-cross-reading";

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
    signatureStatement: r.signatureStatement,
    freeBridge: r.freeBridge ?? undefined,
    profileDashboard: r.profileDashboard,
    profileScales: r.profileScales ?? undefined,
    fiveElementsSnapshot: r.fiveElementsSnapshot,
    keywords: r.keywords ?? [],
    blueprint: r.blueprint ?? undefined,
    chapters: (r.sections ?? []).map((s, i) => ({
      number: String(i + 1).padStart(2, "0"),
      title: s.title,
      question: s.question ?? undefined,
      coreInsight: s.coreInsight,
      body: [
        s.coreInsight,
        ...(s.behaviorScenes ?? []),
        s.practicalMeaning ?? "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      behaviorScenes: s.behaviorScenes,
      strengthSide: s.strengthSide ?? undefined,
      riskSide: s.riskSide ?? undefined,
      triggerSituation: s.triggerSituation ?? undefined,
      practicalMeaning: s.practicalMeaning ?? undefined,
      actionAdvice: s.actionAdvice ?? undefined,
      evidenceExplanation: s.evidenceExplanation,
      takeaway: s.takeaway ?? undefined,
      whyReading: (s.evidenceExplanation ?? []).join(" "),
      evidence: s.evidence,
      cautions: s.cautions ?? undefined,
      pullQuote: s.pullQuote ?? undefined,
      narrativeBridge: s.narrativeBridge ?? undefined,
      paradoxNote: s.paradoxNote ?? undefined,
      includeWhyBox: s.includeWhyBox ?? undefined,
    })),
    contradictions: r.contradictions?.map((c) => ({
      poleA: c.poleA,
      poleB: c.poleB,
      howItShows: c.howItShows,
      upside: c.upside,
      downside: c.downside,
      whenStronger: c.whenStronger,
      result: c.result ?? undefined,
    })),
    strengthShadows: r.strengthShadows?.map((s) => ({
      strength: s.strength,
      overuse: s.overuse,
      problem: s.problem,
      balancePoint: s.balancePoint ?? undefined,
    })),
    lifeScenes: r.lifeScenes ?? undefined,
    scopeNotes: r.scopeNotes ?? undefined,
    actionItems: r.actionItems.map((a) => ({ ...a, when: a.when ?? undefined })),
    finalSummary: {
      ...r.finalSummary,
      changeHabits: r.finalSummary.changeHabits ?? undefined,
      keepHabits: r.finalSummary.keepHabits ?? undefined,
    },
    monthlyOutlook: r.monthlyOutlook?.map((m) => ({
      month: m.month,
      title: m.title,
      summary: m.summary,
      detail: m.detail,
      focus: m.focus ?? undefined,
    })),
  };
}

type PageModel =
  | { kind: "demo"; report: PaidReport }
  | { kind: "view"; report: PaidReport }
  | {
      kind: "consulting";
      reportId: string;
      orderNo: string;
      productName: string;
      nickname: string;
      headline: string;
      summary: string;
      accessToken?: string | null;
      testMode?: boolean;
    }
  | {
      kind: "paid_tarot";
      reading: PaidCrossReading;
      nickname: string;
      orderNo: string;
      productName: string;
    }
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
      if (
        report.generation_status === "PENDING" &&
        report.error_code === "WAITING_FOR_AI"
      ) {
        return {
          kind: "message",
          title: "결제가 확인되었습니다",
          body: "리포트를 준비하고 있습니다. 준비가 완료되면 이 페이지에서 확인하실 수 있습니다.",
          href: "/my-results",
          label: "내 결과 보기",
        };
      }
      if (
        report.generation_status === "FAILED" &&
        report.error_code === "PAID_REPORT_LIVE_DISABLED"
      ) {
        return {
          kind: "message",
          title: "리포트 준비 중",
          body: "결제는 확인되었으며, 리포트 생성 준비 중입니다. 오픈 후 이 페이지에서 확인하실 수 있습니다.",
          href: "/my-results",
          label: "내 결과 보기",
        };
      }
      return {
        kind: "message",
        title:
          report.generation_status === "FAILED"
            ? "리포트 생성에 실패했습니다"
            : "리포트를 준비하고 있습니다",
        body:
          report.generation_status === "FAILED"
            ? "결제는 확인되었습니다. 잠시 후 다시 시도해 주세요."
            : "잠시 후 다시 확인해 주세요.",
        href: "/my-results",
        label: "내 결과 보기",
      };
    }

    const profile = await getProfileById(order.profile_id);
    const raw = report.result_json as {
      reportKind?: string;
      reportRenderVersion?: string;
      title?: string;
      executiveSummary?: string;
    };
    if (raw?.reportKind === "paid_tarot") {
      return {
        kind: "paid_tarot",
        reading: report.result_json as unknown as PaidCrossReading,
        nickname: profile?.nickname ?? "고객",
        productName:
          order.product_name_snapshot ?? "사주×타로 심층 교차리딩",
        orderNo: order.order_no,
      };
    }

    if (isConsultingReportRenderVersion(raw?.reportRenderVersion)) {
      const generationMode = deriveReportGenerationMode(report);
      if (
        generationMode === "mock" &&
        !isTossTestSandboxCheckoutAllowed()
      ) {
        return {
          kind: "message",
          title: "리포트를 확인할 수 없습니다",
          body: "이 결과는 아직 고객에게 제공되지 않습니다.",
          href: "/my-results",
          label: "내 결과",
        };
      }
      return {
        kind: "consulting",
        reportId: report.id,
        orderNo: order.order_no,
        productName: order.product_name_snapshot ?? "유료 리포트",
        nickname: profile?.nickname ?? "고객",
        headline: raw.title ?? "나만의 사용설명서",
        summary: raw.executiveSummary ?? "",
        accessToken: input.access ?? null,
        testMode: isTossTestSandboxCheckoutAllowed(),
      };
    }

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

  if (model.kind === "consulting") {
    return (
      <PaidConsultingReportView
        reportId={model.reportId}
        orderNo={model.orderNo}
        productName={model.productName}
        nickname={model.nickname}
        headline={model.headline}
        summary={model.summary}
        accessToken={model.accessToken}
        testMode={model.testMode}
      />
    );
  }

  if (model.kind === "paid_tarot") {
    return (
      <PaidTarotReportView
        reading={model.reading}
        nickname={model.nickname}
        orderNo={model.orderNo}
        productName={model.productName}
      />
    );
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
