import { notFound } from "next/navigation";
import { LoadingSequence } from "@/components/fortune/loading-sequence";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "분석 중",
  robots: { index: false, follow: false },
};

export default async function FortuneLoadingByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return <LoadingSequence freeResultId={id} />;
}
