"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import {
  deleteProduct,
  setProductFeatured,
  updateProduct,
} from "../../app/admin/actions";
import type { Product, ProductCategory } from "../../types";

const categories: ProductCategory[] = ["Comics", "Books", "Manga"];

export default function ProductsTable({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [editing, setEditing] = useState<Product | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const visibleProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return products.filter((product) => {
      return (
        (category === "All" || product.category === category) &&
        (!search || product.title.toLowerCase().includes(search))
      );
    });
  }, [products, query, category]);

  function runAction(action: () => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.error ?? result.success ?? "");
    });
  }

  function saveProduct(formData: FormData) {
    startTransition(async () => {
      const result = await updateProduct(formData);
      setMessage(result.error ?? result.success ?? "");
      if (result.success) setEditing(null);
    });
  }

  return (
    <>
      <div className="admin-toolbar">
        <input
          className="admin-input"
          placeholder="Search products..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search products"
        />
        <select
          className="admin-select"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter products by category"
        >
          <option>All</option>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      {message && <p className="admin-message" role="status">{message}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>COVER</th><th>TITLE</th><th>CATEGORY</th><th>PRICE (USD)</th><th>FEATURED</th><th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((product) => (
              <tr key={product.id}>
                <td><span className="admin-cover-thumb" style={{ backgroundImage: `url("${product.cover_image_url}")` }} /></td>
                <td><strong>{product.title}</strong><br /><span className="admin-muted">{product.id}</span></td>
                <td>{product.category}</td>
                <td>${product.price_usd.toFixed(2)}</td>
                <td>
                  <button
                    className="admin-toggle"
                    type="button"
                    aria-label={`${product.featured ? "Unfeature" : "Feature"} ${product.title}`}
                    aria-pressed={product.featured}
                    disabled={pending}
                    onClick={() => runAction(() => setProductFeatured(product.id, !product.featured))}
                  />
                </td>
                <td>
                  <div className="admin-table-actions">
                    <button className="admin-button" onClick={() => setEditing(product)}><Pencil size={13} /> Edit</button>
                    <button
                      className="admin-button admin-button-danger"
                      disabled={pending}
                      onClick={() => {
                        if (window.confirm(`Delete “${product.title}”? This does not refund existing orders.`)) {
                          runAction(() => deleteProduct(product.id));
                        }
                      }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!visibleProducts.length && (
              <tr><td colSpan={6} className="admin-empty">No products match this search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setEditing(null);
        }}>
          <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="edit-product-title">
            <div className="admin-modal-header">
              <h2 id="edit-product-title">Edit product</h2>
              <button className="admin-icon-button" onClick={() => setEditing(null)} aria-label="Close"><X size={17} /></button>
            </div>
            <form action={saveProduct}>
              <input type="hidden" name="id" value={editing.id} />
              <div className="admin-form-grid">
                <label className="wide">Title<input className="admin-input" name="title" defaultValue={editing.title} required maxLength={100} /></label>
                <label className="wide">Description<textarea className="admin-textarea" name="description" defaultValue={editing.description} required maxLength={5000} /></label>
                <label>Category<select className="admin-select" name="category" defaultValue={editing.category}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Author<input className="admin-input" name="author" defaultValue={editing.author} /></label>
                <label>Checkout price (INR)<input className="admin-input" name="price_inr" type="number" min="1" step="1" defaultValue={editing.price_inr} required /></label>
                <label>Catalog price (USD)<input className="admin-input" name="price_usd" type="number" min="0.01" step="0.01" defaultValue={editing.price_usd} required /></label>
                <label>Pages<input className="admin-input" name="pages" type="number" min="0" step="1" defaultValue={editing.pages} required /></label>
              </div>
              <div className="admin-modal-footer">
                <button className="admin-button" type="button" onClick={() => setEditing(null)}>Cancel</button>
                <button className="admin-button admin-button-primary" disabled={pending}>Save changes</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
