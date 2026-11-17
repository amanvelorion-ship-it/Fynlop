import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProductCard from "../../../components/ProductCard";
import AddToCartButton from "../../../components/AddToCartButton";
import { getProducts } from "../../../lib/products";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ id: product.id }));
}

async function ProductContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
          <div className="preview-grid" aria-label="Sample pages">
            {(product.preview_images?.length ? product.preview_images.slice(0, 3) : []).map((image, index) => (
              <div className="preview-page preview-image" key={image} role="img" aria-label={`Preview page ${index + 1} of ${product.title}`} style={{ backgroundImage: `url("${image}")` }}>
                <span>PAGE {String(index + 1).padStart(2, "0")} · PREVIEW</span>
              </div>
            ))}
            {!product.preview_images?.length && (
              <>
                <div className="preview-page"><span>PAGE 01 · {product.category.toUpperCase()}</span><strong>{product.title}</strong><span>AN ORIGINAL STORY BY {product.author.toUpperCase()}</span></div>
                <div className="preview-page"><span>CHAPTER ONE</span><strong>Somewhere beyond the ordinary.</strong><span>02 / {product.pages}</span></div>
                <div className="preview-page"><span>THE STORY CONTINUES</span><strong>Every world starts with a question.</strong><span>03 / {product.pages}</span></div>
              </>
            )}
            <div className="preview-page preview-locked" aria-label="Page 4 is part of the full edition">
              <span>04 / {product.pages}</span>
              <strong>Keep reading in your library.</strong>
            </div>
          </div>
          <p className="preview-note">A glimpse of the story. The full digital edition is yours after checkout.</p>
        </section>
      </div>

      {relatedProducts.length > 0 && (
        <section className="page-width related-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-mark" /> KEEP EXPLORING</p>
              <h2>More from this <em>world.</em></h2>
            </div>
            <Link className="text-link" href="/shop">View all <span aria-hidden="true">↗</span></Link>
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
