import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { mapProductRow } from "@/lib/repositories/mappers";
import {
  getMockProductById,
  getMockProductBySlug,
  mockProducts,
} from "@/lib/mock-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/types";
import type { TablesInsert, TablesUpdate } from "@/types/database.types";

export async function listActiveProducts(): Promise<Product[]> {
  if (getDataMode() === "mock") {
    return mockProducts
      .filter((p) => p.status === "ACTIVE")
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "ACTIVE")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapProductRow(row));
}

export async function listAllProducts(): Promise<Product[]> {
  if (getDataMode() === "mock") {
    return [...mockProducts].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapProductRow(row));
}

export async function getProductBySlug(
  slug: string
): Promise<Product | null> {
  if (getDataMode() === "mock") {
    return getMockProductBySlug(slug) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data ? mapProductRow(data) : null;
}

export async function getProductById(id: string): Promise<Product | null> {
  if (getDataMode() === "mock") {
    if (id === "demo") {
      return getMockProductById(mockProducts[0].id) ?? null;
    }
    return getMockProductById(id) ?? null;
  }

  // Admin client: paid-report job / poller run outside Next request cookies.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapProductRow(data) : null;
}

export async function createProduct(
  input: TablesInsert<"products">
): Promise<Product> {
  if (getDataMode() === "mock") {
    throw new Error("Product create requires Supabase configuration.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return mapProductRow(data);
}

export async function updateProduct(
  id: string,
  input: TablesUpdate<"products">
): Promise<Product> {
  if (getDataMode() === "mock") {
    throw new Error("Product update requires Supabase configuration.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapProductRow(data);
}
