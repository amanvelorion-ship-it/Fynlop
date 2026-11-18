import "server-only";

import { getProduct as getStoredProduct, getProducts as getStoredProducts } from "./dynamodb";
import type { Product } from "../types";

function withoutPrivateFile(product: Product): Product {
  const publicProduct = { ...product };
  delete publicProduct.file_url;
  return publicProduct;
}

export async function getProducts(includeArchived = false): Promise<Product[]> {
  const products = await getStoredProducts();
  return products
    .filter((product) => includeArchived || !product.archived)
    .map(withoutPrivateFile);
}

export async function getProduct(
  id: string,
  includeArchived = false,
): Promise<Product | null> {
  const product = await getStoredProduct(id);
  return product && (includeArchived || !product.archived)
    ? withoutPrivateFile(product)
    : null;
}
