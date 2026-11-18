import { Suspense } from "react";
import { connection } from "next/server";
import StorefrontCatalog from "../../components/StorefrontCatalog";
import { getPublishedCollections } from "../../lib/collection-catalog";
import { getProducts } from "../../lib/products";

async function ShopContent() {
  await connection();
  const [collections, products] = await Promise.all([
    getPublishedCollections(),
    getProducts(),
  ]);
  return <StorefrontCatalog collections={collections} products={products} />;
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
