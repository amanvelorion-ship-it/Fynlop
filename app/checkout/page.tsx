"use client";

import Link from "next/link";
import Script from "next/script";
import { ArrowLeft, ArrowRight, LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { readCart, subscribeToCart, writeCart } from "../../lib/cart";
import type { Product } from "../../types";

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

export default function CheckoutPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
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
          throw new Error(getErrorMessage(productPayload, "Could not load the book catalog."));
        }
        if (!authResponse.ok) {
          throw new Error(authPayload.error ?? "Could not check your account.");
        }
        if (!active) return;
        setProducts(productPayload as Product[]);
        setEmail(authPayload.user?.email ?? "");
        setCartIds(readCart());
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load checkout.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    const unsubscribe = subscribeToCart(() => setCartIds(readCart()));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const selectedProducts = useMemo(
    () => cartIds
      .map((id) => products.find((product) => product.id === id))
      .filter((product): product is Product => product !== undefined),
    [cartIds, products],
  );
  const total = selectedProducts.reduce((sum, product) => sum + product.price_inr, 0);

  function removeFromCart(productId: string) {
    const next = cartIds.filter((id) => id !== productId);
    writeCart(next);
    setCartIds(next);
  }

  async function beginPayment() {
    if (!email) {
      setError("Sign in to your FYNLOP account before purchasing a book.");
      return;
    }
    if (!selectedProducts.length) {
      setError("Your cart has no available books.");
      return;
    }
    if (!razorpayReady || !window.Razorpay) {
      setError("Secure checkout is still loading. Please try again in a moment.");
      return;
    }
    setBusy(true);
    setError("");

    try {
      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedProducts.map((product) => product.id) }),
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
        theme: { color: "#FFB800" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (payment) => {
          try {
            if (!payment.razorpay_order_id || !payment.razorpay_payment_id || !payment.razorpay_signature) {
              throw new Error("Razorpay returned incomplete payment verification details.");
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
              throw new Error(getErrorMessage(verifyPayload, "Payment verification failed."));
            }
            writeCart([]);
            setCartIds([]);
            setSuccess(true);
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Payment was received, but verification could not be completed. Contact support.",
            );
          } finally {
            setBusy(false);
          }
        },
      });
      checkout.open();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start secure checkout.");
      setBusy(false);
    }
  }

  return (
    <main className="page-shell page-width">
      <header className="checkout-heading">
        <p className="eyebrow"><span className="eyebrow-mark" /> ONE-TIME BOOK PURCHASE</p>
        <h1>Checkout.</h1>
        <p className="checkout-help">A single payment gives you permanent access to these books in My Library.</p>
      </header>
      {success ? (
        <section className="checkout-success checkout-complete" role="status">
          <h2>Your books are ready.</h2>
          <p>Payment verified. Your purchases are available in your FYNLOP library.</p>
          <Link className="button button-gold" href="/my-library">Open My Library <ArrowRight size={16} /></Link>
        </section>
      ) : loading ? (
        <p className="checkout-help"><LoaderCircle className="spin" size={16} /> Loading your cart…</p>
      ) : (
        <div className="checkout-layout">
          <section className="checkout-panel">
            <h2>Your books · {selectedProducts.length}</h2>
            {selectedProducts.length ? (
              selectedProducts.map((product) => (
                <article className="checkout-book" key={product.id}>
                  <div
                    className="checkout-book-cover"
                    role="img"
                    aria-label={`${product.title} cover`}
                    style={{ backgroundImage: `url("${product.cover_image_url}")` }}
                  />
                  <div className="checkout-book-copy">
                    <h3>{product.title}</h3>
                    <p>{product.category} · by {product.author}</p>
                    <strong>₹{product.price_inr.toLocaleString("en-IN")}</strong>
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
              ))
            ) : (
              <div className="empty-cart">
                <h2>{cartIds.length ? "Those books are no longer available." : "Your cart is empty."}</h2>
                <p>Browse standalone books and add the ones you want to keep.</p>
                <Link className="button button-gold" href="/shop">Browse the shop <ArrowRight size={16} /></Link>
              </div>
            )}
            {error && <p className="checkout-error" role="alert">{error}</p>}
          </section>
          <aside className="summary-panel">
            <h2>Order summary</h2>
            {selectedProducts.map((product) => (
              <div className="summary-item" key={product.id}>
                <span>{product.title}</span>
                <strong>₹{product.price_inr.toLocaleString("en-IN")}</strong>
              </div>
            ))}
            <div className="summary-total">
              <span>Total · one-time</span>
              <strong>₹{total.toLocaleString("en-IN")}</strong>
            </div>
            {email ? (
              <p className="checkout-help">Signed in as {email}</p>
            ) : (
              <p className="checkout-help">Already have an account? <Link href="/my-library">Sign in</Link> before paying.</p>
            )}
            <button
              className="button button-gold payment-button"
              type="button"
              onClick={() => void beginPayment()}
              disabled={busy || !selectedProducts.length || !email || !razorpayReady}
            >
              {busy ? <><LoaderCircle className="spin" size={16} /> Processing…</> : "Pay securely with Razorpay"}
            </button>
            <Link className="text-link checkout-back-link" href="/shop"><ArrowLeft size={14} /> Continue shopping</Link>
          </aside>
        </div>
      )}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayReady(true)}
        onError={() => setError("Razorpay checkout could not be loaded. Check your connection and try again.")}
      />
    </main>
  );
}
