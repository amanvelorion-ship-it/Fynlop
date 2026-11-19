import { Suspense } from "react";
import { connection } from "next/server";
import ShopCatalog from "../../components/ShopCatalog";
import { getProducts } from "../../lib/products";

async function ShopContent() {
  await connection();
  const products = await getProducts();
  return <ShopCatalog initialCategory="All" products={products} />;
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <main className="page-shell page-width">
          <div className="page-heading"><p className="eyebrow">OPENING THE COLLECTION…</p></div>
        </main>
      }
    >
      <ShopContent />
    </Suspense>
  );
}
