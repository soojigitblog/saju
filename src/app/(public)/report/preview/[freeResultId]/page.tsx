import Link from "next/link";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { isPaidPreviewAllowed } from "@/lib/services/preview-paid-report";
import { PaidReportPreviewClient } from "@/components/report/paid-report-preview-client";
import { MysticPage } from "@/components/mystic/celestial-background";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "유료 리포트 품질 미리보기",
  robots: { index: false, follow: false },
};

function PreviewMessage({
  eyebrow,
  title,
  body,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <MysticPage>
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="hanja-accent">{eyebrow}</p>
        <h1 className="display-title mt-4 text-2xl">{title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          {body}
        </p>
        <Button asChild className="mt-8" variant="outline">
          <Link href={href}>{linkLabel}</Link>
        </Button>
      </div>
    </MysticPage>
  );
}

export default async function PaidReportPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ freeResultId: string }>;
  searchParams: Promise<{ product?: string }>;
}) {
  if (!isPaidPreviewAllowed()) {
    return (
      <PreviewMessage
        eyebrow="QA ONLY"
        title="미리보기를 사용할 수 없습니다"
        body="유료 리포트 품질 미리보기는 운영자 검수용입니다. 사용자에게는 노출되지 않습니다."
        href="/"
        linkLabel="홈으로"
      />
    );
  }

  const { freeResultId } = await params;
  const { product } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(freeResultId)) {
    return (
      <PreviewMessage
        eyebrow="PREVIEW"
        title="잘못된 미리보기 주소입니다"
        body="사주 결과 페이지의 미리보기 버튼으로 다시 들어와 주세요."
        href="/fortune"
        linkLabel="사주 보러 가기"
      />
    );
  }

  const guestSessionId = await getGuestSessionId();
  if (!guestSessionId) {
    return (
      <PreviewMessage
        eyebrow="SESSION"
        title="세션이 없습니다"
        body="세션이 없습니다. 사주 결과 페이지에서 다시 들어와 주세요."
        href="/fortune"
        linkLabel="사주 보러 가기"
      />
    );
  }

  return (
    <PaidReportPreviewClient
      freeResultId={freeResultId}
      productSlug={product ?? null}
    />
  );
}
