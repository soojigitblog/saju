import { notFound } from "next/navigation";
import { PgReviewCheckoutClient } from "@/components/checkout/pg-review-checkout-client";
import { isPgReviewMode } from "@/lib/payments/checkout-policy";
import { getProductBySlug } from "@/lib/repositories/products";

export const dynamic = "force-dynamic";
export const metadata = { title: "PG 심사용 결제 화면", robots: { index: false, follow: false } };

export default async function PgReviewCheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isPgReviewMode()) notFound();
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== "ACTIVE") notFound();

  return <PgReviewCheckoutClient product={{ name: product.name, salePrice: product.salePrice, description: product.description }} />;
}
