import { notFound } from "next/navigation";
import { AdultV2Preview } from "@/components/report/adult-v2-preview";

export const dynamic = "force-dynamic";

/**
 * Isolated internal preview: never reads reports/orders and remains unavailable
 * unless the V2 production flag is explicitly kept false for preview QA.
 */
export default function AdultV2PreviewPage() {
  if (process.env.ADULT_REPORT_V2 !== "false") notFound();
  return <AdultV2Preview />;
}
