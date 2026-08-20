import type { Tables } from "@/types/database.types";
import type { Product } from "@/types";

type ProductRow = Tables<"products">;

export function mapProductRow(
  row: ProductRow,
  promptLabel?: string | null
): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description,
    regularPrice: row.regular_price,
    salePrice: row.sale_price,
    thumbnailUrl: row.thumbnail_url ?? "",
    freeRatio: row.free_ratio,
    promptName: promptLabel ?? row.prompt_version_id ?? "",
    templateId: row.template_id,
    status: row.status,
    sortOrder: row.sort_order,
    productType: row.product_type,
    promptVersionId: row.prompt_version_id,
  };
}
