"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { addToCart } from "../lib/cart";

export default function AddToCartButton({
  productId,
}: {
  productId: string;
}) {
  const [added, setAdded] = useState(false);

  function handleClick() {
    addToCart(productId);
    window.dispatchEvent(new Event("fynlop:open-checkout"));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <button className="button button-gold add-button" onClick={handleClick}>
      {added ? "Added to cart" : "Add to cart"}
      {added ? <Check aria-hidden="true" size={16} /> : <ShoppingBag aria-hidden="true" size={16} />}
    </button>
  );
}
