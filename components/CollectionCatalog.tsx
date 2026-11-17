"use client";

import { useMemo, useState } from "react";
import CollectionCard from "./CollectionCard";
import type { PublicCollection } from "../types";

export default function CollectionCatalog({ collections }: { collections: PublicCollection[] }) {
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"latest" | "price-low">("latest");

  const filteredCollections = useMemo(() => {
    const query = search.trim().toLowerCase();
    return collections
      .filter((collection) =>
        !query ||
        collection.title.toLowerCase().includes(query) ||
        collection.description.toLowerCase().includes(query),
      )
      .sort((a, b) =>
        sortOrder === "price-low"
          ? a.monthly_price_paise - b.monthly_price_paise
          : b.created_at.localeCompare(a.created_at),
      );
  }, [collections, search, sortOrder]);

  return (
    <main className="page-shell page-width">
      <header className="page-heading">
        <p className="eyebrow"><span className="eyebrow-mark" /> ONGOING STORY WORLDS</p>
        <h1>Choose a world.<br /><em>Stay for every chapter.</em></h1>
        <p>Subscribe monthly to a collection for its current releases and the new stories that follow.</p>
      </header>
      <div className="shop-toolbar">
        <div className="shop-controls">
          <input
            className="search-input"
            type="search"
            placeholder="Search collections..."
            aria-label="Search collections"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="sort-select"
            aria-label="Sort collections"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as "latest" | "price-low")}
          >
            <option value="latest">Latest</option>
            <option value="price-low">Price: low to high</option>
          </select>
        </div>
      </div>
      {filteredCollections.length ? (
        <div className="product-grid">
          {filteredCollections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{collections.length ? "No collections found." : "New worlds are coming soon."}</h2>
          <p>{collections.length ? "Try another title or search term." : "Check back soon for the first ongoing series."}</p>
        </div>
      )}
      <p className="shop-count">SHOWING {filteredCollections.length} OF {collections.length} COLLECTIONS</p>
    </main>
  );
}
