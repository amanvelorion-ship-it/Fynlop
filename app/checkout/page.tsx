"use client";

import Link from "next/link";
import Script from "next/script";
import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { readCart, subscribeToCart, writeCart } from "../../lib/cart";
import type { Product, User } from "../../types";

type SessionState = "loading" | "signed-in" | "signed-out";

export default function CheckoutPage() {
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [email, setEmail] = useState("");
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [emailWarning, setEmailWarning] = useState("");

  useEffect(() => {
    const updateCart = () => setCartIds(readCart());
    updateCart();
    const unsubscribe = subscribeToCart(updateCart);
    let active = true;

    fetch("/api/products")
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!response.ok || !Array.isArray(data)) {
          throw new Error(
            typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
              ? data.error
              : "Could not load the product catalog.",
          );
        }
        if (active) {
          setCatalog(data as Product[]);
          setCatalogReady(true);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Could not load the product catalog.");
        }
      });

    fetch("/api/auth")
      .then(async (response) => {
        const payload = (await response.json()) as { user?: User | null; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not check your account.");
        if (!active) return;
        if (payload.user) {
          setEmail(payload.user.email);
          setSessionState("signed-in");
        } else {
          setSessionState("signed-out");
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Could not check your account.");
        setSessionState("signed-out");
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const cartProducts = useMemo(
    () => cartIds.map((id) => catalog.find((product) => product.id === id)).filter((product) => product !== undefined),
    [cartIds, catalog],
  );
  const total = cartProducts.reduce((sum, product) => sum + product.price_inr, 0);

  async function startPayment() {
    if (!catalogReady) {
      setError("The product catalog is still loading. Please wait a moment and try again.");
      return;
    }
    if (!window.Razorpay || !razorpayReady || sessionState !== "signed-in") {
      setError("Sign in and wait for secure checkout to load before continuing.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: cartProducts.map((product) => product.id) }),
      });
      const orderPayload = (await orderResponse.json()) as {
        error?: string;
        orderId?: string;
        amount?: number;
        keyId?: string;
      };

      if (!orderResponse.ok || !orderPayload.orderId || !orderPayload.keyId || !orderPayload.amount) {
        throw new Error(orderPayload.error ?? "Could not create your secure payment order.");
      }

      const checkout = new window.Razorpay({
        key: orderPayload.keyId,
        amount: orderPayload.amount,
        currency: "INR",
        name: "FYNLOP",
        description: `${cartProducts.length} digital ${cartProducts.length === 1 ? "story" : "stories"}`,
        order_id: orderPayload.orderId,
        prefill: { email },
        theme: { color: "#FFB800" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (payment) => {
          try {
            const verifyResponse = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...payment,
                productIds: cartProducts.map((product) => product.id),
              }),
            });
            const verifyPayload = (await verifyResponse.json()) as {
              error?: string;
              emailWarning?: string;
            };
            if (!verifyResponse.ok) {
              throw new Error(verifyPayload.error ?? "Payment could not be verified.");
            }
            writeCart([]);
            setCartIds([]);
            setEmailWarning(verifyPayload.emailWarning ?? "");
            setSuccess(true);
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Payment was received, but verification could not be completed. Contact support with your payment ID.",
            );
          } finally {
            setBusy(false);
          }
        },
      });
      checkout.open();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start checkout.");
      setBusy(false);
    }
  }

  return (
    <main className="page-shell page-width">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayReady(true)}
        onError={() => setError("Razorpay checkout could not be loaded. Check your connection and try again.")}
      />
      <header className="checkout-heading">
        <p className="eyebrow"><span className="eyebrow-mark" /> YOUR NEXT CHAPTER</p>
        <h1>Almost <em>yours.</em></h1>
      </header>

      {cartProducts.length === 0 && !success ? (
        <div className="empty-cart">
          <h2>Your cart is waiting for a story.</h2>
          <p>Explore the collection and add something wonderful.</p>
          <Link className="button button-gold" href="/shop">Explore the shop <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <div className="checkout-layout">
          <section className="checkout-panel">
            {success ? (
              <div className="checkout-success" role="status">
                <h2>Payment confirmed. Your stories are in your library.</h2>
                <p>Open your library to access the editions on your account.</p>
                {emailWarning && <p className="checkout-help" role="status">{emailWarning}</p>}
                <Link href="/my-library">Go to my library <ArrowRight size={15} /></Link>
              </div>
            ) : (
              <>
                <h2>YOUR DETAILS</h2>
                <label className="checkout-label" htmlFor="checkout-email">Account email</label>
                <input
                  className="form-control"
                  id="checkout-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  readOnly
                />
                {sessionState === "signed-out" && (
                  <p className="checkout-help">Sign in to keep your purchase in your library. <Link href="/my-library">Sign in or create an account <ArrowRight size={14} /></Link></p>
                )}
                <p className="checkout-help"><LockKeyhole size={14} /> Secure payment powered by Razorpay. Prices are charged in Indian rupees.</p>
                {error && <p className="checkout-error" role="alert">{error}</p>}
                <button
                  className="button button-gold payment-button"
                  onClick={startPayment}
                  disabled={busy || !catalogReady || sessionState !== "signed-in" || !razorpayReady || cartProducts.length === 0}
                >
                  {busy ? <><LoaderCircle className="spin" size={16} /> Verifying securely…</> : `Pay ₹${total.toLocaleString("en-IN")} with Razorpay`}
                  {!busy && <ArrowRight size={16} />}
                </button>
              </>
            )}
          </section>
          <aside className="summary-panel">
            <h2>YOUR ORDER</h2>
            {cartProducts.map((product) => (
              <div className="summary-item" key={product.id}>
                <span>{product.title}</span>
                <strong>₹{product.price_inr.toLocaleString("en-IN")}</strong>
              </div>
            ))}
            <div className="summary-total"><span>Total</span><strong>₹{total.toLocaleString("en-IN")}</strong></div>
            <p className="checkout-help">Digital editions · Instant access after payment</p>
            {!success && cartProducts.length > 0 && (
              <button
                className="hero-secondary"
                onClick={() => writeCart(cartIds.slice(0, -1))}
                aria-label="Remove the last item from your cart"
              >
                Remove last item
              </button>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
