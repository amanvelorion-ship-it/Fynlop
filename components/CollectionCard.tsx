"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import { formatInrPaise } from "../lib/currency";
import type { PublicCollection } from "../types";

export default function CollectionCard({ collection }: { collection: PublicCollection }) {
  return (
    <motion.article
      className="product-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -7, scale: 1.02 }}
    >
      <Link
        className="product-cover"
        href={`/collections/${collection.id}`}
        style={{ "--cover-image": `url("${collection.cover_image_url}")` } as CSSProperties}
        aria-label={`View ${collection.title} collection`}
      >
        <span className="category-badge">ONGOING COLLECTION</span>
        <span className="cover-view">Explore series <ArrowUpRight aria-hidden="true" size={16} /></span>
      </Link>
      <div className="product-info">
        <div className="product-meta">
          <span>New releases included</span>
          <span>Monthly access</span>
        </div>
        <Link href={`/collections/${collection.id}`} className="product-title">
          {collection.title}
        </Link>
        <p className="product-description">{collection.description}</p>
        <div className="product-card-bottom">
          <div className="product-price">
            <strong>{formatInrPaise(collection.monthly_price_paise)}</strong>
            <span>per month</span>
          </div>
          <Link className="text-link" href={`/collections/${collection.id}`}>
            View <ArrowUpRight aria-hidden="true" size={14} />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
