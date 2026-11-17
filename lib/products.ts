import "server-only";

import { createClient } from "@supabase/supabase-js";
import { products as sampleProducts } from "../data/products";
import type { Database, Product } from "../types";

function withoutPrivateFile(product: Product): Product {
  const { file_url, ...publicProduct } = product;
  void file_url;
  return publicProduct;
}

export async function getProducts(): Promise<Product[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return sampleProducts;

  const supabase = createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const allProducts: Product[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .range(start, start + 999);
    if (error) throw new Error(`Could not load the product catalog: ${error.message}`);
    allProducts.push(...data.map(withoutPrivateFile));
    if (data.length < 1000) break;
  }
  return allProducts;
}
