import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getProductById } from "@/lib/repositories/products";

export const metadata = {
  title: "결제",
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product || product.status !== "ACTIVE") notFound();
  return <CheckoutForm product={product} />;
}
