"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import type { Product } from "../types";
import AddToCartButton from "./AddToCartButton";

export default function ProductCard({ product }: { product: Product }) {
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
        href={`/shop/${product.id}`}
        style={
          { "--cover-image": `url("${product.cover_image_url}")` } as CSSProperties
        }
        aria-label={`View ${product.title}`}
      >
        <span className="category-badge">{product.category}</span>
        <span className="cover-view">View story <ArrowUpRight aria-hidden="true" size={16} /></span>
      </Link>
      <div className="product-info">
        <div className="product-meta">
          <span>{product.author}</span>
          <span>{product.pages} pages</span>
        </div>
        <Link href={`/shop/${product.id}`} className="product-title">
          {product.title}
        </Link>
        <p className="product-description">{product.description}</p>
        <div className="product-card-bottom">
          <div className="product-price">
            <strong>₹{product.price_inr.toLocaleString("en-IN")}</strong>
            <span>${product.price_usd.toFixed(2)} USD</span>
          </div>
          <AddToCartButton productId={product.id} />
        </div>
      </div>
    </motion.article>
  );
}
