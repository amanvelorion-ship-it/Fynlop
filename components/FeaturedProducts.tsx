"use client";

import { useEffect, useState } from "react";
import { products as sampleProducts } from "../data/products";
import type { Product } from "../types";
import ProductCard from "./ProductCard";

export default function FeaturedProducts() {
  const [products, setProducts] = useState(sampleProducts);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/products")
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
              ? data.error
              : "Could not load products.",
          );
        }
        if (!Array.isArray(data)) throw new Error("The product catalog response is invalid.");
        if (active) setProducts(data as Product[]);
      })
      .catch((error: unknown) => {
        if (active) {
          setError(error instanceof Error ? error.message : "Could not load products.");
        }
      });
    return () => { active = false; };
  }, []);

  const featured = products.filter((product) => product.featured).slice(0, 6);
  const selection = featured.length ? featured : products.slice(0, 6);
  return (
    <div className="product-grid">
      {selection.map((product) => <ProductCard key={product.id} product={product} />)}
      {error && <p className="checkout-error" role="alert">{error}</p>}
    </div>
  );
}
