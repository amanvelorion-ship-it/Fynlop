"use client";

import { useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import type { Product } from "../types";

const categories = ["All", "Comics", "Books", "Manga"] as const;
type Category = (typeof categories)[number];
type SortOrder = "latest" | "price-low" | "popular";

export default function ShopCatalog({
  initialCategory,
  products,
}: {
  initialCategory: Category;
  products: Product[];
}) {
  const [category, setCategory] = useState<Category>(initialCategory);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("latest");

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products
      .filter((product) => category === "All" || product.category === category)
      .filter((product) =>
        !query ||
        product.title.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.author.toLowerCase().includes(query),
      )
      .sort((a, b) => {
        if (sortOrder === "price-low") return a.price_inr - b.price_inr;
        if (sortOrder === "popular") return b.popularity - a.popularity;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [category, products, search, sortOrder]);

  return (
    <main className="page-shell page-width">
      <header className="page-heading">
        <p className="eyebrow"><span className="eyebrow-mark" /> THE FYNLOP COLLECTION</p>
        <h1>Find a story<br /><em>to fall into.</em></h1>
        <p>Original comics and books for anyone ready to see what’s beyond the page.</p>
      </header>
      <div className="shop-toolbar">
        <div className="category-tabs" role="group" aria-label="Filter products by category">
          {categories.map((item) => (
            <button
              key={item}
              className={`category-tab${category === item ? " active" : ""}`}
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="sort-select"
            aria-label="Sort products"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
          >
            <option value="latest">Latest</option>
            <option value="price-low">Price: low to high</option>
            <option value="popular">Popular</option>
          </select>
        </div>
      </div>
      {filteredProducts.length ? (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No stories found.</h2>
          <p>Try a different title, creator, or category.</p>
        </div>
      )}
      <p className="shop-count">SHOWING {filteredProducts.length} OF {products.length} STORIES</p>
    </main>
  );
}
