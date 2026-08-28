import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/product-detail";
import { getProductBySlug } from "@/lib/repositories/products";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { getFreeResultById } from "@/lib/repositories/free-results";
import { getProfileById } from "@/lib/repositories/profiles";
import { isPaidCheckoutEnabled } from "@/lib/ai/config";
import { isKnownPaidFortuneProductSlug } from "@/lib/report/paid-report-kind";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return {
    title: product?.name ?? "상품",
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ result?: string; tarot?: string }>;
}) {
  const { slug } = await params;
  const { result: resultId, tarot: tarotReadingId } = await searchParams;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== "ACTIVE") notFound();

  let linkedResultId: string | null = null;
  if (resultId && /^[0-9a-f-]{36}$/i.test(resultId)) {
    const guestSessionId = await getGuestSessionId();
    if (guestSessionId) {
      const row = await getFreeResultById(resultId);
      if (row?.generation_status === "COMPLETED") {
        const profile = await getProfileById(row.profile_id);
        if (profile?.guest_session_id === guestSessionId) {
          linkedResultId = row.id;
        }
      }
    }
    // Unowned/invalid result query is ignored — never trust URL alone for PHASE 6 checkout
  }

  const linkedTarotReadingId =
    tarotReadingId && /^[0-9a-f-]{36}$/i.test(tarotReadingId)
      ? tarotReadingId
      : null;

  const checkoutEnabled = isPaidCheckoutEnabled();
  const purchaseBlocked =
    product.productType === "fortune" &&
    isKnownPaidFortuneProductSlug(product.slug) &&
    !checkoutEnabled;

  return (
    <ProductDetail
      product={product}
      linkedFreeResultId={linkedResultId}
      linkedTarotReadingId={linkedTarotReadingId}
      purchaseBlocked={purchaseBlocked}
      purchaseBlockedMessage={
        purchaseBlocked
          ? "현재 최종 점검 중입니다. 유료 리포트 판매는 잠시 후 오픈됩니다."
          : null
      }
    />
  );
}
