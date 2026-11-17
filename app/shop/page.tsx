import { Suspense } from "react";
import { connection } from "next/server";
import ShopCatalog from "../../components/ShopCatalog";
import { getProducts } from "../../lib/products";

type Category = "All" | "Comics" | "Books" | "Manga";

async function ShopContent({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await connection();
  const { category } = await searchParams;
  const initialCategory: Category =
    category === "Comics" || category === "Books" || category === "Manga"
      ? category
      : "All";

  const products = await getProducts();
  return <ShopCatalog initialCategory={initialCategory} products={products} />;
}

export default function ShopPage(props: {
  searchParams: Promise<{ category?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="page-shell page-width">
          <div className="page-heading"><p className="eyebrow">OPENING THE COLLECTION…</p></div>
        </main>
      }
    >
      <ShopContent searchParams={props.searchParams} />
    </Suspense>
  );
}
