import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, BookOpen, ShoppingBag } from "lucide-react";
import { connection } from "next/server";
import AddToCartButton from "../../../components/AddToCartButton";
import BookPurchaseButton from "../../../components/BookPurchaseButton";
import { formatInrPaise } from "../../../lib/currency";
import { getProduct } from "../../../lib/products";

async function ProductDetails({ id }: { id: string }) {
  await connection();
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <main className="page-shell page-width">
      <Link className="text-link collection-back" href="/shop"><ArrowLeft size={15} /> Back to shop</Link>
      <section className="detail-layout">
        <div
          className="detail-cover"
          role="img"
          aria-label={`${product.title} cover`}
          style={{ backgroundImage: `url("${product.cover_image_url}")` }}
        >
          <span className="detail-cover-mark">{product.title}</span>
        </div>
        <div className="detail-copy">
          <p className="eyebrow"><span className="eyebrow-mark" /> STANDALONE EDITION · ONE-TIME PURCHASE</p>
          <h1>{product.title}</h1>
          <p className="detail-byline">By {product.author}</p>
          <p>{product.description}</p>
          <div className="detail-facts">
            <span><strong>{product.category}</strong></span>
            <span><BookOpen size={14} aria-hidden="true" /> <strong>{product.pages}</strong> pages</span>
          </div>
          <div className="detail-price">
            <strong>{formatInrPaise(product.price_inr * 100)}</strong>
            <span>one-time · yours to keep in My Library</span>
          </div>
          <div className="detail-actions">
            <BookPurchaseButton productId={product.id} title={product.title} />
            <AddToCartButton productId={product.id} />
          </div>
          <p className="checkout-help">Your private PDF download appears in My Library after payment is verified.</p>
        </div>
      </section>
      {product.preview_images?.length ? (
        <section className="preview-section">
          <p className="eyebrow"><span className="eyebrow-mark" /> A FIRST LOOK</p>
          <h2 className="section-heading-title">Preview pages</h2>
          <div className="preview-grid">
            {product.preview_images.map((image, index) => (
              <div className="product-preview-image" key={image}>
                <Image
                  src={image}
                  alt={`${product.title} preview ${index + 1}`}
                  fill
                  sizes="(max-width: 700px) 100vw, 33vw"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <div className="standalone-detail-note">
        <ShoppingBag size={17} aria-hidden="true" />
        This standalone book is purchased separately and is not included in collection subscriptions.
      </div>
    </main>
  );
}

async function ProductRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetails id={id} />;
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<main className="page-shell page-width"><p className="eyebrow">OPENING THE BOOK…</p></main>}>
      <ProductRoute params={params} />
    </Suspense>
  );
}
