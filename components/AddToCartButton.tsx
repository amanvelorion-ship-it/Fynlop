"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "../lib/cart";

export default function AddToCartButton({
  productId,
  buyNow = false,
}: {
  productId: string;
  buyNow?: boolean;
}) {
  const [added, setAdded] = useState(false);
  const router = useRouter();

  function handleClick() {
    addToCart(productId);
    if (buyNow) {
      router.push("/checkout");
      return;
    }

    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <button className="button button-gold add-button" onClick={handleClick}>
      {buyNow ? "Buy now with Razorpay" : added ? "Added to cart ✓" : "Add to cart"}
      <span aria-hidden="true">↗</span>
    </button>
  );
}
