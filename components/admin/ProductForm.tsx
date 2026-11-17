"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useActionState } from "react";
import { createProduct } from "../../app/admin/actions";

export default function ProductForm() {
  const [state, action, pending] = useActionState(createProduct, {});

  return (
    <form action={action} className="admin-product-form">
      <div className="admin-setting-panel">
        <div className="admin-form-grid">
          <label className="wide">Title<input className="admin-input" name="title" required maxLength={100} /></label>
          <label className="wide">Description<textarea className="admin-textarea" name="description" required maxLength={5000} /></label>
          <label>Category
            <select className="admin-select" name="category" defaultValue="Comics">
              <option>Comics</option><option>Books</option><option>Manga</option>
            </select>
          </label>
          <label>Author<input className="admin-input" name="author" required maxLength={120} /></label>
          <label>Checkout price (INR)<input className="admin-input" name="price_inr" type="number" min="1" step="1" required /></label>
          <label>Catalog price (USD)<input className="admin-input" name="price_usd" type="number" min="0.01" step="0.01" required /></label>
          <label>Pages<input className="admin-input" name="pages" type="number" min="1" step="1" required /></label>
          <label className="admin-switch-row">
            <input type="checkbox" name="featured" />
            Mark as featured
          </label>
        </div>
      </div>
      <div className="admin-setting-panel">
        <h2>Cover and digital edition</h2>
        <div className="admin-form-grid">
          <label className="admin-upload">Cover image (JPG, PNG, WebP · max 3 MB)
            <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" required />
          </label>
          <label className="admin-upload">PDF edition (max 50 MB)
            <input name="pdf" type="file" accept="application/pdf,.pdf" required />
          </label>
          <label className="admin-upload wide">Preview images (up to 3 · max 2 MB each)
            <input name="previews" type="file" accept="image/jpeg,image/png,image/webp" multiple />
          </label>
        </div>
        <p className="admin-muted">PDF files are stored privately and are only available through the verified purchase download flow.</p>
      </div>
      {state.error && <p className="admin-error" role="alert">{state.error}</p>}
      {state.success && (
        <p className="admin-message" role="status">
          {state.success} <Link href="/admin/products">View products <ArrowRight size={14} /></Link>
        </p>
      )}
      <button className="admin-button admin-button-primary" disabled={pending}>
        {pending ? "Uploading and saving…" : "Create product"}
      </button>
    </form>
  );
}
