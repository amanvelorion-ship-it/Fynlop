"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { formatInrPaise } from "../lib/currency";

export default function SubscribeButton({
  collectionId,
  collectionTitle,
  monthlyPricePaise,
}: {
  collectionId: string;
  collectionTitle: string;
  monthlyPricePaise: number;
}) {
  const router = useRouter();
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function subscribe() {
    if (!razorpayReady || !window.Razorpay) {
      setError("Secure payment checkout is still loading. Please try again in a moment.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/collections/${encodeURIComponent(collectionId)}/subscribe`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        subscriptionId?: string;
        keyId?: string;
      };
      if (!response.ok || !payload.subscriptionId || !payload.keyId) {
        if (response.status === 401) {
          throw new Error("Sign in to subscribe. Your collection access will be linked to your FYNLOP account.");
        }
        throw new Error(payload.error ?? "Could not start this subscription.");
      }

      const checkout = new window.Razorpay({
        key: payload.keyId,
        subscription_id: payload.subscriptionId,
        name: "FYNLOP",
        description: `${collectionTitle} · monthly collection subscription`,
        prefill: {},
        theme: { color: "#FFB800" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (payment) => {
          try {
            if (
              !payment.razorpay_subscription_id ||
              !payment.razorpay_payment_id ||
              !payment.razorpay_signature
            ) {
              throw new Error("Razorpay returned incomplete subscription verification details.");
            }
            const verifyResponse = await fetch("/api/collections/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payment),
            });
            const verifyPayload = (await verifyResponse.json()) as {
              error?: string;
              pending?: boolean;
            };
            if (!verifyResponse.ok) {
              throw new Error(verifyPayload.error ?? "The subscription could not be verified.");
            }
            setNotice(
              verifyPayload.pending
                ? "Authorization received. Your access will appear as soon as Razorpay confirms the first monthly charge."
                : "Subscription confirmed. Your collection is ready in My Library.",
            );
            if (!verifyPayload.pending) router.push("/my-library");
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : "The payment was received, but verification could not be completed. Contact support.",
            );
          } finally {
            setBusy(false);
          }
        },
      });
      checkout.open();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start this subscription.");
      setBusy(false);
    }
  }

  return (
    <div className="collection-subscribe">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayReady(true)}
        onError={() => setError("Razorpay checkout could not be loaded. Check your connection and try again.")}
      />
      <p className="collection-subscribe-price">
        <strong>{formatInrPaise(monthlyPricePaise)}</strong> / month
      </p>
      <p className="collection-subscribe-disclosure">
        Recurring monthly payments continue until you cancel. Access remains available through the paid period.
        Razorpay subscriptions run for up to 120 monthly cycles; reauthorization is required to continue beyond that term.
      </p>
      {error && <p className="checkout-error" role="alert">{error}</p>}
      {notice && <p className="checkout-success" role="status">{notice}</p>}
      <button
        className="button button-gold"
        onClick={() => void subscribe()}
        disabled={busy || !razorpayReady}
      >
        {busy ? <><LoaderCircle className="spin" size={16} /> Processing…</> : "Subscribe monthly"}
        {!busy && <ArrowRight size={16} />}
      </button>
    </div>
  );
}
