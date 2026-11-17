import { connection } from "next/server";
import { getProducts } from "../lib/products";
import ProductCard from "./ProductCard";

export default async function FeaturedProducts() {
  await connection();
  const products = await getProducts();
  const featured = products.filter((product) => product.featured).slice(0, 6);
  const selection = featured.length ? featured : products.slice(0, 6);

  if (!selection.length) {
    return (
      <div className="empty-cart">
        <h2>New stories are on their way.</h2>
        <p>Check back soon to discover the FYNLOP collection.</p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {selection.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}
