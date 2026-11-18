"use client";

import Link from "next/link";
import Script from "next/script";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";

type OrderResponse = {
  orderId?: string;
  keyId?: string;
  email?: string;
  error?: string;
};

function readError(payload: unknown, fallback: string): string {
  return typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback;
}

export default function BookPurchaseButton({
  productId,
  title,
}: {
  productId: string;
  title: string;
}) {
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function purchase() {
    if (!razorpayReady || !window.Razorpay) {
      setError("Secure checkout is loading. Please try again in a moment.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess(false);
    try {
      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [productId] }),
      });
      const order = (await orderResponse.json()) as OrderResponse;
      if (!orderResponse.ok || !order.orderId || !order.keyId) {
        throw new Error(readError(order, "Could not start your payment."));
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        name: "FYNLOP",
        description: title,
        prefill: { email: order.email },
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
            if (!payment.razorpay_order_id || !payment.razorpay_payment_id || !payment.razorpay_signature) {
              throw new Error("Razorpay returned incomplete payment verification details.");
            }
            const response = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_signature: payment.razorpay_signature,
                productIds: [productId],
              }),
            });
            const payload: unknown = await response.json();
            if (!response.ok) throw new Error(readError(payload, "Payment verification failed."));
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
      checkout.on("payment.failed", (payment) => {
        setError(
          payment.error?.description ??
            payment.error?.reason ??
            "Razorpay could not complete the payment. Please try again.",
        );
      });
      checkout.open();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start secure checkout.");
      setBusy(false);
    }
  }

  return (
    <div className="book-purchase-action">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayReady(true)}
        onError={() => setError("Razorpay checkout could not be loaded. Check your connection and try again.")}
      />
      {success ? (
        <p className="checkout-success" role="status">
          Purchase confirmed. <Link href="/my-library">Open My Library <ArrowRight size={14} /></Link>
        </p>
      ) : (
        <button
          className="button button-gold"
          type="button"
          onClick={() => void purchase()}
          disabled={busy || !razorpayReady}
        >
          {busy ? <><LoaderCircle className="spin" size={16} /> Opening secure checkout…</> : "Buy now"}
          {!busy && <ArrowRight size={16} />}
        </button>
      )}
      {error && (
        <p className="checkout-error" role="alert">
          {error}{" "}
          {error.includes("Sign in") && <Link href="/my-library">Sign in to continue</Link>}
        </p>
      )}
    </div>
  );
}
