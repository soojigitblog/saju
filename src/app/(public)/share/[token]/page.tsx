import { notFound } from "next/navigation";
import { SharedResultView } from "@/components/share/shared-result-view";
import { getPublicShareByToken } from "@/lib/services/share-result";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { isValidShareToken } from "@/lib/share/share-token";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "공유된 결과",
  robots: { index: false, follow: false },
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isValidShareToken(token)) notFound();

  let data;
  try {
    data = await getPublicShareByToken(token);
  } catch (error) {
    if (error instanceof FreeFlowError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return <SharedResultView data={data} />;
}
