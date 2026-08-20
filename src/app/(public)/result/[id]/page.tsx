import { notFound, redirect } from "next/navigation";
import { FreeResultView } from "@/components/result/free-result-view";
import { getGuestSessionId } from "@/lib/guest/cookie";
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
  if (!guestSessionId) notFound();

  const pageOrRedirect = await loadResultPage(id, guestSessionId);
  if (pageOrRedirect.kind === "redirect") {
    redirect(pageOrRedirect.to);
  }
  if (pageOrRedirect.kind === "not_found") {
    notFound();
  }

  return (
    <FreeResultView
      result={pageOrRedirect.page.result}
      products={pageOrRedirect.page.products}
    />
  );
}

async function loadResultPage(id: string, guestSessionId: string) {
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
      return { kind: "not_found" as const };
    }
    throw error;
  }
}
