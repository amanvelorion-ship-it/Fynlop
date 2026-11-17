"use client";

import { useState } from "react";
import { refundCollectionSubscriptionPayment } from "../../app/admin/collections/actions";

export default function RefundSubscriptionPaymentButton({ paymentId }: { paymentId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refund() {
    if (!window.confirm("Issue a full refund for this recurring payment?")) return;
    setBusy(true);
    setError("");
    try {
      await refundCollectionSubscriptionPayment(paymentId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not refund this payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span>
      <button className="admin-button" onClick={() => void refund()} disabled={busy}>
        {busy ? "Refunding…" : "Refund"}
      </button>
      {error && <span className="admin-error" role="alert">{error}</span>}
    </span>
  );
}
