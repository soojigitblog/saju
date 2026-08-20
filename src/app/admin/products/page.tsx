import { ProductList } from "@/components/admin/product-list";
import { listAllProducts } from "@/lib/repositories/products";

export const metadata = {
  title: "상품 관리",
};

export default async function AdminProductsPage() {
  const products = await listAllProducts();
  return <ProductList products={products} />;
}
