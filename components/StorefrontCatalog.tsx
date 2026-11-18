"use client";

import { useMemo, useState } from "react";
import CollectionCard from "./CollectionCard";
import ProductCard from "./ProductCard";
import type { Product, PublicCollection } from "../types";

type CatalogFilter = "All" | "Collections" | Product["category"];

export default function StorefrontCatalog({
  collections,
  products,
}: {
  collections: PublicCollection[];
  products: Product[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CatalogFilter>("All");
  const [sortOrder, setSortOrder] = useState<"latest" | "price-low">("latest");
  const normalizedQuery = query.trim().toLowerCase();

  const visibleCollections = useMemo(
    () =>
      (filter === "All" || filter === "Collections" ? collections : [])
        .filter((collection) =>
          !normalizedQuery ||
          collection.title.toLowerCase().includes(normalizedQuery) ||
          collection.description.toLowerCase().includes(normalizedQuery),
        )
        .sort((a, b) =>
          sortOrder === "price-low"
            ? a.monthly_price_paise - b.monthly_price_paise
            : b.created_at.localeCompare(a.created_at),
        ),
    [collections, filter, normalizedQuery, sortOrder],
  );
  const visibleProducts = useMemo(
    () =>
      (filter === "Collections" ? [] : products)
        .filter((product) => filter === "All" || product.category === filter)
        .filter((product) =>
          !normalizedQuery ||
          product.title.toLowerCase().includes(normalizedQuery) ||
          product.description.toLowerCase().includes(normalizedQuery) ||
          product.author.toLowerCase().includes(normalizedQuery),
        )
        .sort((a, b) =>
          sortOrder === "price-low"
            ? a.price_inr - b.price_inr
            : b.created_at.localeCompare(a.created_at),
        ),
    [filter, normalizedQuery, products, sortOrder],
  );

  const hasResults = visibleCollections.length > 0 || visibleProducts.length > 0;

  return (
    <main className="page-shell page-width">
      <header className="page-heading">
        <p className="eyebrow"><span className="eyebrow-mark" /> STORIES YOUR WAY</p>
        <h1>Subscribe to a world.<br /><em>Or buy a book to keep.</em></h1>
        <p>Collections include future releases while you subscribe. Standalone books are a one-time purchase with permanent library access.</p>
      </header>
      <div className="shop-toolbar">
        <div className="category-tabs" aria-label="Filter shop items">
          {(["All", "Collections", "Comics", "Books", "Manga"] as const).map((item) => (
            <button
              className={`category-tab${filter === item ? " active" : ""}`}
              key={item}
              onClick={() => setFilter(item)}
              type="button"
              aria-pressed={filter === item}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="shop-controls">
          <input
            className="search-input"
            type="search"
            placeholder="Search stories..."
            aria-label="Search stories"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className="sort-select"
            aria-label="Sort shop items"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as "latest" | "price-low")}
          >
            <option value="latest">Latest</option>
            <option value="price-low">Price: low to high</option>
          </select>
        </div>
      </div>
      {visibleCollections.length > 0 && (
        <section className="storefront-section" aria-labelledby="collections-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-mark" /> RECURRING ACCESS</p>
              <h2 id="collections-title">Ongoing collections</h2>
            </div>
          </div>
          <div className="product-grid">
            {visibleCollections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        </section>
      )}
      {visibleProducts.length > 0 && (
        <section className="storefront-section" aria-labelledby="books-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-mark" /> ONE-TIME PURCHASE</p>
              <h2 id="books-title">Standalone books</h2>
            </div>
          </div>
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
      {!hasResults && (
        <div className="empty-state">
          <h2>{collections.length || products.length ? "No stories found." : "New stories are on their way."}</h2>
          <p>
            {collections.length || products.length
              ? "Try a different title or filter."
              : "Check back soon for collections and standalone books."}
          </p>
        </div>
      )}
      <p className="shop-count">SHOWING {visibleCollections.length + visibleProducts.length} ITEMS</p>
    </main>
  );
}
