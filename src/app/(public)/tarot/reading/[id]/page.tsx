import { TarotReadingView } from "@/components/tarot/tarot-reading-view";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { getTarotReadingById } from "@/lib/repositories/tarot-readings";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "사주 × 타로 리딩",
  robots: { index: false, follow: false },
};

export default async function TarotReadingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const guestSessionId = await getGuestSessionId();
  if (!guestSessionId) notFound();

  const reading = await getTarotReadingById(id);
  if (!reading || reading.guest_session_id !== guestSessionId) notFound();

  return <TarotReadingView readingId={id} />;
}
