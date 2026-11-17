import { Suspense } from "react";
import { connection } from "next/server";
import CollectionCatalog from "../../components/CollectionCatalog";
import { getPublishedCollections } from "../../lib/collection-catalog";

async function ShopContent() {
  await connection();
  const collections = await getPublishedCollections();
  return <CollectionCatalog collections={collections} />;
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
