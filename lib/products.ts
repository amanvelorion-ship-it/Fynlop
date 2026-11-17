import "server-only";

import { getProduct as getStoredProduct, getProducts as getStoredProducts } from "./dynamodb";
import type { Product } from "../types";

function withoutPrivateFile(product: Product): Product {
  const publicProduct = { ...product };
  delete publicProduct.file_url;
  return publicProduct;
}

export async function getProducts(): Promise<Product[]> {
  const products = await getStoredProducts();
  return products.map(withoutPrivateFile);
}

export async function getProduct(id: string): Promise<Product | null> {
  const product = await getStoredProduct(id);
  return product ? withoutPrivateFile(product) : null;
}
