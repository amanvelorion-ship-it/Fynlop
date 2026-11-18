"use client";

import Script from "next/script";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { formatInrPaise } from "../lib/currency";

type SubscriptionView = {
  collectionId: string;
  status: string;
  hasAccess: boolean;
  cancelAtPeriodEnd: boolean;
  paidThrough: string | null;
};

export default function SubscribeButton({
  collectionId,
  collectionTitle,
  monthlyPricePaise,
}: {
  collectionId: string;
  collectionTitle: string;
  monthlyPricePaise: number;
}) {
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionView | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadSubscription() {
      try {
        const response = await fetch("/api/collections/subscriptions", { cache: "no-store" });
        if (response.status === 401) return;
        const payload: unknown = await response.json();
        if (!response.ok || !Array.isArray(payload)) {
          throw new Error(
            typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "Could not check your collection subscription.",
          );
        }
        if (active) {
          setSubscription(
            (payload as SubscriptionView[]).find((item) => item.collectionId === collectionId) ?? null,
          );
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not check your subscription.");
      } finally {
        if (active) setCheckingSubscription(false);
      }
    }
    void loadSubscription();
    return () => { active = false; };
  }, [collectionId]);

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
            const subscriptionsResponse = await fetch("/api/collections/subscriptions", { cache: "no-store" });
            if (subscriptionsResponse.ok) {
              const subscriptionsPayload: unknown = await subscriptionsResponse.json();
              if (Array.isArray(subscriptionsPayload)) {
                setSubscription(
                  (subscriptionsPayload as SubscriptionView[]).find((item) => item.collectionId === collectionId) ?? null,
                );
              }
            }
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
      checkout.on("payment.failed", (payment) => {
        setError(
          payment.error?.description ??
            payment.error?.reason ??
            "Razorpay could not complete the payment. Please try again.",
        );
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
      {checkingSubscription ? (
        <p className="checkout-help"><LoaderCircle className="spin" size={14} /> Checking your subscription…</p>
      ) : subscription?.hasAccess ? (
        <div className="collection-owned-state">
          <p>
            {subscription.cancelAtPeriodEnd
              ? `Renewal cancelled · access until ${subscription.paidThrough ? new Date(subscription.paidThrough).toLocaleDateString() : "the paid period ends"}.`
              : "Your subscription is active. New releases are included."}
          </p>
          <Link className="text-link" href="/my-library">Manage in My Library <ArrowRight size={14} /></Link>
        </div>
      ) : subscription?.status === "payment_failed" ? (
        <div className="collection-owned-state">
          <p>Your subscription has a payment issue. Manage it before starting another.</p>
          <Link className="text-link" href="/my-library">Manage in My Library <ArrowRight size={14} /></Link>
        </div>
      ) : (
        <>
          <button
            className="button button-gold"
            onClick={() => void subscribe()}
            disabled={busy || !razorpayReady}
          >
            {busy ? <><LoaderCircle className="spin" size={16} /> Opening secure checkout…</> : "Subscribe monthly"}
            {!busy && <ArrowRight size={16} />}
          </button>
          {error.includes("Sign in") && (
            <Link className="text-link collection-signin-link" href="/my-library">Sign in to continue <ArrowRight size={14} /></Link>
          )}
        </>
      )}
    </div>
  );
}
