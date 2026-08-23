import { notFound, redirect } from "next/navigation";
import { FreeResultView } from "@/components/result/free-result-view";
import { ResultAccessBlocked } from "@/components/result/result-access-blocked";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { reloadMockStoreFromDisk } from "@/lib/mock-store";
import { getDataMode } from "@/lib/repositories/data-mode";
import { getFreeResultPageForOwner } from "@/lib/services/get-free-result";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "무료 사주 결과",
  robots: { index: false, follow: false },
};

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const guestSessionId = await getGuestSessionId();
  if (!guestSessionId) {
    return <ResultAccessBlocked reason="no_session" />;
  }

  const pageOrRedirect = await loadResultPage(id, guestSessionId);
  if (pageOrRedirect.kind === "redirect") {
    redirect(pageOrRedirect.to);
  }
  if (pageOrRedirect.kind === "blocked") {
    return <ResultAccessBlocked reason={pageOrRedirect.reason} />;
  }
  if (pageOrRedirect.kind === "not_found") {
    return <ResultAccessBlocked reason="not_found" />;
  }

  return (
    <FreeResultView
      result={pageOrRedirect.page.result}
      products={pageOrRedirect.page.products}
    />
  );
}

async function loadResultPage(id: string, guestSessionId: string) {
  if (getDataMode() === "mock") {
    reloadMockStoreFromDisk();
  }
  try {
    const page = await getFreeResultPageForOwner({
      freeResultId: id,
      guestSessionId,
    });
    return { kind: "ok" as const, page };
  } catch (error) {
    if (error instanceof FreeFlowError) {
      if (error.code === "NOT_READY") {
        return { kind: "redirect" as const, to: `/fortune/loading/${id}` };
      }
      if (error.code === "FORBIDDEN") {
        return { kind: "blocked" as const, reason: "forbidden" as const };
      }
      return { kind: "not_found" as const };
    }
    throw error;
  }
}
