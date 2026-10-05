import { notFound } from "next/navigation";
import { AdultV2Preview } from "@/components/report/adult-v2-preview";

export const dynamic = "force-dynamic";

/**
 * Isolated internal preview: never reads reports/orders and is controlled by
 * its own QA flag, independently from the future customer V2 feature flag.
 */
export default function AdultV2PreviewPage() {
  if (process.env.ADULT_REPORT_V2_PREVIEW !== "true") notFound();
  return <AdultV2Preview />;
}
