import {
  getProductById,
  getProductBySlug,
  listActiveProducts,
  listAllProducts,
} from "@/lib/repositories/products";
import { mockFreeResult, mockPaidReport, mockAdminStats } from "@/lib/mock-data";
import { listPromptDefinitions } from "@/lib/repositories/prompts";
import { getDataMode } from "@/lib/repositories/data-mode";

export {
  getProductById,
  getProductBySlug,
  listActiveProducts,
  listAllProducts,
  listPromptDefinitions,
  getDataMode,
  mockFreeResult,
  mockPaidReport,
  mockAdminStats,
};
