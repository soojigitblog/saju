import { TarotFlowClient } from "@/components/tarot/tarot-flow-client";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { getFreeResultById } from "@/lib/repositories/free-results";
import { getProfileById } from "@/lib/repositories/profiles";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "사주 × 타로",
  robots: { index: false, follow: false },
};

export default async function TarotFromResultPage({
  params,
}: {
  params: Promise<{ freeResultId: string }>;
}) {
  const { freeResultId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(freeResultId)) notFound();

  const guestSessionId = await getGuestSessionId();
  if (!guestSessionId) notFound();

  const free = await getFreeResultById(freeResultId);
  if (!free || free.generation_status !== "COMPLETED") notFound();

  const profile = await getProfileById(free.profile_id);
  if (!profile || profile.guest_session_id !== guestSessionId) notFound();

  return <TarotFlowClient freeResultId={freeResultId} />;
}
