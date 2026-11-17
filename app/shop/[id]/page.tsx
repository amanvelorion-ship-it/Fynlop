import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { connection } from "next/server";
import ProductCard from "../../../components/ProductCard";
import AddToCartButton from "../../../components/AddToCartButton";
import { getProducts } from "../../../lib/products";

async function ProductContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const products = await getProducts();
  const product = products.find((item) => item.id === id);
  if (!product) notFound();

  const relatedProducts = products
    .filter((item) => item.id !== product.id && item.category === product.category)
    .slice(0, 3);

  return (
    <main className="page-shell">
      <div className="page-width">
        <div className="detail-layout">
          <div
            className="detail-cover"
            role="img"
            aria-label={`${product.title} cover`}
            style={{ backgroundImage: `url("${product.cover_image_url}")` }}
          >
            <span className="detail-cover-mark">{product.title}</span>
          </div>
          <section className="detail-copy">
            <p className="eyebrow"><span className="eyebrow-mark" /> {product.category.toUpperCase()} · DIGITAL EDITION</p>
            <h1>{product.title}</h1>
            <p className="detail-byline">A story by {product.author}</p>
            <p>{product.description}</p>
            <div className="detail-facts">
              <span><strong>{product.pages}</strong> illustrated pages</span>
              <span><strong>PDF</strong> digital edition</span>
              <span><strong>Instant</strong> access</span>
            </div>
            <div className="detail-price">
              <strong>₹{product.price_inr.toLocaleString("en-IN")}</strong>
              <span>${product.price_usd.toFixed(2)} USD</span>
            </div>
            <div className="detail-actions">
              <AddToCartButton productId={product.id} buyNow />
              <AddToCartButton productId={product.id} />
            </div>
          </section>
        </div>

        <section className="preview-section">
          <p className="eyebrow"><span className="eyebrow-mark" /> TAKE A LOOK INSIDE</p>
          {product.preview_images?.length ? (
            <>
              <div className="preview-grid" aria-label="Preview pages">
                {product.preview_images.slice(0, 3).map((image, index) => (
                  <div className="preview-page preview-image" key={image} role="img" aria-label={`Preview page ${index + 1} of ${product.title}`} style={{ backgroundImage: `url("${image}")` }}>
                    <span>PAGE {String(index + 1).padStart(2, "0")} · PREVIEW</span>
                  </div>
                ))}
                <div className="preview-page preview-locked" aria-label="More pages are part of the full edition">
                  <span>{Math.min(4, product.pages)} / {product.pages}</span>
                  <strong>Continue reading in your library.</strong>
                </div>
              </div>
              <p className="preview-note">A glimpse of the story. The full digital edition is yours after checkout.</p>
            </>
          ) : (
            <p className="preview-note">Preview pages are not available for this edition.</p>
          )}
        </section>
      </div>

      {relatedProducts.length > 0 && (
        <section className="page-width related-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-mark" /> KEEP EXPLORING</p>
              <h2>More from this <em>world.</em></h2>
            </div>
            <Link className="text-link" href="/shop">View all <ArrowUpRight aria-hidden="true" size={16} /></Link>
          </div>
          <div className="product-grid">
            {relatedProducts.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        </section>
      )}
    </main>
  );
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="page-shell page-width"><p className="eyebrow">OPENING THE STORY…</p></main>}>
      <ProductContent params={params} />
    </Suspense>
  );
}
