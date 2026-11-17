"use client";

import Link from "next/link";
import { ArrowUpRight, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatInrPaise } from "../lib/currency";

type SubscriptionView = {
  id: string;
  collectionId: string;
  collectionTitle: string;
  status: string;
  amountPaise: number;
  paidThrough: string | null;
  cancelAtPeriodEnd: boolean;
  hasAccess: boolean;
  contentCount: number;
  payments: Array<{
    id: string;
    amountPaise: number;
    status: "captured" | "failed" | "refunding" | "refunded";
    createdAt: string;
  }>;
};

export default function MyCollectionSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadSubscriptions(): Promise<SubscriptionView[]> {
    const response = await fetch("/api/collections/subscriptions", { cache: "no-store" });
    const payload: unknown = await response.json();
    if (!response.ok || !Array.isArray(payload)) {
      throw new Error(
        typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "Could not load collection subscriptions.",
      );
    }
    return payload as SubscriptionView[];
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await loadSubscriptions();
        if (active) setSubscriptions(result);
      } catch (reason) {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Could not load subscriptions.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function cancelSubscription(id: string) {
    setBusy(id);
    setError("");
    try {
      const response = await fetch(
        `/api/collections/subscriptions/${encodeURIComponent(id)}/cancel`,
        { method: "POST" },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not cancel this subscription.");
      setSubscriptions(await loadSubscriptions());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not cancel this subscription.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="subscription-library">
      <div className="section-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-mark" /> YOUR COLLECTIONS</p>
          <h2>Subscriptions.</h2>
        </div>
        <Link className="text-link" href="/shop">Browse collections <ArrowUpRight size={15} /></Link>
      </div>
      {error && <p className="checkout-error" role="alert">{error}</p>}
      {loading ? (
        <p className="checkout-help"><LoaderCircle className="spin" size={16} /> Loading subscriptions…</p>
      ) : subscriptions.length ? (
        <div className="subscription-library-list">
          {subscriptions.map((subscription) => (
            <article className="subscription-library-card" key={subscription.id}>
              <div>
                <h3>{subscription.collectionTitle}</h3>
                <p>
                  {formatInrPaise(subscription.amountPaise)} / month · {subscription.contentCount} available releases
                </p>
                <p className="subscription-status">
                  {subscription.cancelAtPeriodEnd
                    ? `Cancelled · access until ${subscription.paidThrough ? new Date(subscription.paidThrough).toLocaleDateString() : "the paid period ends"}`
                    : subscription.hasAccess
                      ? "Active · future releases included"
                      : subscription.status.replaceAll("_", " ")}
                </p>
                {subscription.payments.length > 0 && (
                  <details className="subscription-payment-history">
                    <summary>Payment history ({subscription.payments.length})</summary>
                    <ul>
                      {subscription.payments.map((payment) => (
                        <li key={payment.id}>
                          <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                          <span>{formatInrPaise(payment.amountPaise)}</span>
                          <span>{payment.status}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
              <div className="subscription-library-actions">
                <Link className="text-link" href={`/collections/${subscription.collectionId}`}>
                  Open collection <ArrowUpRight size={14} />
                </Link>
                {!subscription.cancelAtPeriodEnd &&
                  ["created", "authenticated", "active", "payment_failed"].includes(subscription.status) && (
                    <button
                      className="subscription-cancel"
                      onClick={() => void cancelSubscription(subscription.id)}
                      disabled={busy === subscription.id}
                    >
                      {busy === subscription.id
                        ? <LoaderCircle className="spin" size={14} />
                        : <X size={14} />}
                      Cancel renewal
                    </button>
                  )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="library-empty">
          <h3>No collection subscriptions yet.</h3>
          <p>Subscribe to a story world to receive its current and future releases.</p>
          <Link className="button button-gold" href="/shop">Explore collections <ArrowUpRight size={15} /></Link>
        </div>
      )}
    </section>
  );
}
