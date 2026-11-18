"use client";

import Link from "next/link";
import Script from "next/script";
import {
  ArrowRight,
  LoaderCircle,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { readCart, subscribeToCart, writeCart } from "../lib/cart";
import type { Product } from "../types";

type AuthResponse = { user?: { email: string } | null; error?: string };
type CheckoutOrderResponse = {
  orderId?: string;
  keyId?: string;
  amount?: number;
  currency?: string;
  email?: string;
  error?: string;
};

function getErrorMessage(payload: unknown, fallback: string): string {
  return typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback;
}

export default function CheckoutModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const closeModal = useCallback(() => {
    setLoading(true);
    setError("");
    setSuccess(false);
    onClose();
  }, [onClose]);

  /* ── Load products + auth when modal opens ── */
  useEffect(() => {
    if (!open) return;
    let active = true;

    async function load() {
      try {
        const [productResponse, authResponse] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/auth", { cache: "no-store" }),
        ]);
        const productPayload: unknown = await productResponse.json();
        const authPayload: AuthResponse = await authResponse.json();
        if (!productResponse.ok || !Array.isArray(productPayload)) {
          throw new Error(
            getErrorMessage(productPayload, "Could not load the book catalog.")
          );
        }
        if (!authResponse.ok) {
          throw new Error(
            authPayload.error ?? "Could not check your account."
          );
        }
        if (!active) return;
        setProducts(productPayload as Product[]);
        setEmail(authPayload.user?.email ?? "");
        setCartIds(readCart());
      } catch (reason) {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load checkout."
          );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [open]);

  /* ── Keep cartIds in sync while modal is open ── */
  useEffect(() => {
    if (!open) return;
    const unsubscribe = subscribeToCart(() => setCartIds(readCart()));
    return unsubscribe;
  }, [open]);

  /* ── Lock body scroll when open ── */
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  /* ── Close on Escape ── */
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) closeModal();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, busy, closeModal]);

  const selectedProducts = useMemo(
    () =>
      cartIds
        .map((id) => products.find((product) => product.id === id))
        .filter((product): product is Product => product !== undefined),
    [cartIds, products]
  );
  const total = selectedProducts.reduce(
    (sum, product) => sum + product.price_inr,
    0
  );

  function removeFromCart(productId: string) {
    const next = cartIds.filter((id) => id !== productId);
    writeCart(next);
    setCartIds(next);
  }

  const beginPayment = useCallback(async () => {
    if (!email) {
      setError(
        "Sign in to your FYNLOP account before purchasing a book."
      );
      return;
    }
    if (!selectedProducts.length) {
      setError("Your cart has no available books.");
      return;
    }
    if (!razorpayReady || !window.Razorpay) {
      setError(
        "Secure checkout is still loading. Please try again in a moment."
      );
      return;
    }
    setBusy(true);
    setError("");

    try {
      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: selectedProducts.map((product) => product.id),
        }),
      });
      const order = (await orderResponse.json()) as CheckoutOrderResponse;
      if (!orderResponse.ok || !order.orderId || !order.keyId) {
        throw new Error(order.error ?? "Could not start your payment.");
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        name: "FYNLOP",
        description: `${selectedProducts.length} standalone book${selectedProducts.length === 1 ? "" : "s"}`,
        prefill: { email: order.email ?? email },
        image: `${window.location.origin}/fynlop-icon.png`,
        theme: { color: "#FFB800" },
        modal: {
          confirm_close: true,
          backdropclose: false,
          handleback: false,
          ondismiss: () => setBusy(false),
        },
        handler: async (payment) => {
          try {
            if (
              !payment.razorpay_order_id ||
              !payment.razorpay_payment_id ||
              !payment.razorpay_signature
            ) {
              throw new Error(
                "Razorpay returned incomplete payment verification details."
              );
            }
            const verifyResponse = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_signature: payment.razorpay_signature,
                productIds: selectedProducts.map((product) => product.id),
              }),
            });
            const verifyPayload: unknown = await verifyResponse.json();
            if (!verifyResponse.ok) {
              throw new Error(
                getErrorMessage(
                  verifyPayload,
                  "Payment verification failed."
                )
              );
            }
            writeCart([]);
            setCartIds([]);
            setSuccess(true);
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Payment was received, but verification could not be completed. Contact support."
            );
          } finally {
            setBusy(false);
          }
        },
      });
      checkout.on("payment.failed", (payment) => {
        setError(
          payment.error?.description ??
            payment.error?.reason ??
            "Razorpay could not complete the payment. Please try again.",
        );
      });
      checkout.open();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not start secure checkout."
      );
      setBusy(false);
    }
  }, [email, selectedProducts, razorpayReady]);

  if (!open) return null;

  return (
    <>
      {/* Razorpay SDK */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayReady(true)}
        onError={() =>
          setError(
            "Razorpay checkout could not be loaded. Check your connection and try again."
          )
        }
      />

      {/* Backdrop */}
      <div
        className="checkout-modal-backdrop"
        onClick={() => !busy && closeModal()}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="checkout-modal-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
      >
        {/* Header */}
        <div className="checkout-modal-header">
          <h2>
            <ShoppingBag size={20} /> Your Cart
          </h2>
          <button
            className="checkout-modal-close"
            onClick={closeModal}
            disabled={busy}
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="checkout-modal-body">
          {success ? (
            <div className="checkout-complete" style={{ margin: 0 }}>
              <h2>Your books are ready.</h2>
              <p>
                Payment verified. Your purchases are available in your FYNLOP
                library.
              </p>
              <Link
                className="button button-gold"
                href="/my-library"
                onClick={closeModal}
              >
                Open My Library <ArrowRight size={16} />
              </Link>
            </div>
          ) : loading ? (
            <p className="checkout-modal-loading">
              <LoaderCircle className="spin" size={18} /> Loading your cart…
            </p>
          ) : selectedProducts.length === 0 ? (
            <div className="checkout-modal-empty">
              <ShoppingBag size={40} strokeWidth={1} />
              <h3>
                {cartIds.length
                  ? "Those books are no longer available."
                  : "Your cart is empty."}
              </h3>
              <p>Browse standalone books and add the ones you want to keep.</p>
              <Link
                className="button button-gold"
                href="/shop"
                onClick={closeModal}
              >
                Browse the shop <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              {/* Book list */}
              <div className="checkout-modal-items">
                {selectedProducts.map((product) => (
                  <article className="checkout-book" key={product.id}>
                    <div
                      className="checkout-book-cover"
                      role="img"
                      aria-label={`${product.title} cover`}
                      style={{
                        backgroundImage: `url("${product.cover_image_url}")`,
                      }}
                    />
                    <div className="checkout-book-copy">
                      <h3>{product.title}</h3>
                      <p>
                        {product.category} · by {product.author}
                      </p>
                      <strong>
                        ₹{product.price_inr.toLocaleString("en-IN")}
                      </strong>
                    </div>
                    <button
                      className="admin-icon-button"
                      type="button"
                      aria-label={`Remove ${product.title} from cart`}
                      onClick={() => removeFromCart(product.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              </div>

              {error && (
                <p className="checkout-error" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer — only show when there are items and not in success state */}
        {!loading && !success && selectedProducts.length > 0 && (
          <div className="checkout-modal-footer">
            {/* Summary */}
            <div className="checkout-modal-summary">
              {selectedProducts.map((product) => (
                <div className="summary-item" key={product.id}>
                  <span>{product.title}</span>
                  <strong>
                    ₹{product.price_inr.toLocaleString("en-IN")}
                  </strong>
                </div>
              ))}
              <div className="summary-total">
                <span>Total · one-time</span>
                <strong>₹{total.toLocaleString("en-IN")}</strong>
              </div>
            </div>

            {email ? (
              <p className="checkout-help">Signed in as {email}</p>
            ) : (
              <p className="checkout-help">
                Already have an account?{" "}
                <Link href="/my-library" onClick={closeModal}>
                  Sign in
                </Link>{" "}
                before paying.
              </p>
            )}

            <button
              className="button button-gold payment-button"
              type="button"
              onClick={() => void beginPayment()}
              disabled={
                busy || !selectedProducts.length || !email || !razorpayReady
              }
            >
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={16} /> Processing…
                </>
              ) : (
                "Pay securely with Razorpay"
              )}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
