import { ProductCreateForm } from "@/components/admin/product-create-form";

export const metadata = {
  title: "상품 생성",
};

export default function AdminProductNewPage() {
  return <ProductCreateForm />;
}
