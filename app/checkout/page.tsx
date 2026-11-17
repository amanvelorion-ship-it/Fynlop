"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import { products } from "../../data/products";
import { readCart, subscribeToCart, writeCart } from "../../lib/cart";
import { createClient } from "../../lib/supabase";
import type { Product } from "../../types";

type SessionState = "loading" | "signed-in" | "signed-out" | "unconfigured";
const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function CheckoutPage() {
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Product[]>(products);
  const [catalogReady, setCatalogReady] = useState(false);
  const [email, setEmail] = useState("");
  const [sessionState, setSessionState] = useState<SessionState>(
    supabaseConfigured ? "loading" : "unconfigured",
  );
  const [accessToken, setAccessToken] = useState("");
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    supabaseConfigured
      ? ""
      : "Supabase is not configured. Add its URL and anon key to .env.local.",
  );
  const [success, setSuccess] = useState(false);

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
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Could not load the product catalog.");
      });

    if (supabaseConfigured) {
      void Promise.resolve()
        .then(() => createClient().auth.getSession())
        .then(({ data, error: sessionError }) => {
          if (!active) return;
          if (sessionError) {
            setError(sessionError.message);
            setSessionState("signed-out");
            return;
          }
          const session = data.session;
          if (!session) {
            setSessionState("signed-out");
            return;
          }
          setEmail(session.user.email ?? "");
          setAccessToken(session.access_token);
          setSessionState("signed-in");
        })
        .catch((reason: unknown) => {
          if (!active) return;
          setSessionState("unconfigured");
          setError(reason instanceof Error ? reason.message : "Supabase is not configured.");
        });
    }

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
    if (!window.Razorpay || !razorpayReady || !accessToken) {
      setError("Sign in and wait for secure checkout to load before continuing.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ productIds: cartProducts.map((product) => product.id), email }),
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
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                ...payment,
                productIds: cartProducts.map((product) => product.id),
              }),
            });
            const verifyPayload = (await verifyResponse.json()) as { error?: string };
            if (!verifyResponse.ok) {
              throw new Error(verifyPayload.error ?? "Payment could not be verified.");
            }
            writeCart([]);
            setCartIds([]);
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
          <Link className="button button-gold" href="/shop">Explore the shop <span aria-hidden="true">↗</span></Link>
        </div>
      ) : (
        <div className="checkout-layout">
          <section className="checkout-panel">
            {success ? (
              <div className="checkout-success" role="status">
                <h2>Payment confirmed. Your stories are in your library.</h2>
                <p>Open your library to access the editions on your account.</p>
                <Link href="/my-library">Go to my library →</Link>
              </div>
            ) : (
              <>
                <h2>YOUR DETAILS</h2>
                <label className="checkout-label" htmlFor="checkout-email">Email address</label>
                <input
                  className="form-control"
                  id="checkout-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
                {sessionState === "signed-out" && (
                  <p className="checkout-help">Sign in to keep your purchase in your library. <Link href="/my-library">Sign in or create an account →</Link></p>
                )}
                {sessionState === "unconfigured" && (
                  <p className="checkout-help">Add your Supabase settings to enable secure accounts and checkout.</p>
                )}
                <p className="checkout-help">Secure payment powered by Razorpay. Prices are charged in Indian rupees.</p>
                {error && <p className="checkout-error" role="alert">{error}</p>}
                <button
                  className="button button-gold payment-button"
                  onClick={startPayment}
                  disabled={busy || !catalogReady || sessionState !== "signed-in" || !razorpayReady || !email || cartProducts.length === 0}
                >
                  {busy ? "Verifying securely…" : `Pay ₹${total.toLocaleString("en-IN")} with Razorpay`}
                  {!busy && <span aria-hidden="true">↗</span>}
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
