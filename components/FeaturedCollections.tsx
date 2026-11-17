import { connection } from "next/server";
import { getPublishedCollections } from "../lib/collection-catalog";
import CollectionCard from "./CollectionCard";

export default async function FeaturedCollections() {
  await connection();
  const collections = (await getPublishedCollections()).slice(0, 3);
  if (!collections.length) {
    return <p className="checkout-help">The first ongoing collections are being prepared.</p>;
  }
  return (
    <div className="product-grid">
      {collections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  );
}
