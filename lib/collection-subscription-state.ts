import type {
  CollectionSubscription,
  CollectionSubscriptionPayment,
} from "../types";
import { getSubscriptionAccessEnd } from "./collection-access";

export type GatewaySubscriptionSnapshot = {
  id: string;
  plan_id: string;
  status: string;
  current_start?: number | null;
  current_end?: number | null;
  notes?: {
    user_id?: string | number;
    collection_id?: string | number;
  };
};

export type GatewayPaymentSnapshot = {
  id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  status: string;
  created_at: number;
  error_description?: string | null;
};

function statusFromEvent(event: string): CollectionSubscription["status"] | null {
  switch (event) {
    case "subscription.authenticated":
      return "authenticated";
    case "subscription.activated":
    case "subscription.charged":
      return "active";
    case "subscription.pending":
    case "subscription.halted":
      return "payment_failed";
    case "subscription.cancelled":
      return "cancelled";
    case "subscription.completed":
      return "completed";
    case "subscription.expired":
      return "expired";
    default:
      return null;
  }
}

export function updateCollectionSubscriptionFromEvent(
  current: CollectionSubscription,
  event: string,
  gateway: GatewaySubscriptionSnapshot,
  payment: GatewayPaymentSnapshot | undefined,
  eventCreatedAt: number,
  now = Date.now(),
): {
  subscription: CollectionSubscription;
  payment?: CollectionSubscriptionPayment;
} {
  if (
    gateway.id !== current.razorpay_subscription_id ||
    gateway.plan_id !== current.razorpay_plan_id ||
    gateway.notes?.user_id !== current.user_id ||
    gateway.notes?.collection_id !== current.collection_id
  ) {
    throw new Error("Razorpay subscription metadata does not match the stored subscription.");
  }

  const eventStatus = statusFromEvent(event);
  if (!eventStatus) {
    throw new Error(`Unsupported Razorpay subscription event: ${event}`);
  }

  const isNewerStatus = eventCreatedAt >= current.last_status_event_at;
  const currentEnd = getSubscriptionAccessEnd(gateway.current_end);
  let paidThrough = current.paid_through;
  let lastPaidPaymentId = current.last_paid_payment_id;
  let nextPayment: CollectionSubscriptionPayment | undefined;

  if (event === "subscription.charged") {
    if (
      !payment ||
      payment.subscription_id !== current.razorpay_subscription_id ||
      payment.status !== "captured" ||
      payment.currency !== "INR" ||
      payment.amount !== current.amount_paise ||
      !currentEnd ||
      Date.parse(currentEnd) <= now
    ) {
      throw new Error("Razorpay did not confirm the expected collection subscription charge.");
    }

    if (!paidThrough || Date.parse(currentEnd) > Date.parse(paidThrough)) {
      paidThrough = currentEnd;
      lastPaidPaymentId = payment.id;
    }
    nextPayment = {
      id: payment.id,
      subscription_id: current.id,
      user_id: current.user_id,
      collection_id: current.collection_id,
      razorpay_mode: current.razorpay_mode,
      amount_paise: payment.amount,
      currency: "INR",
      status: "captured",
      created_at: new Date(payment.created_at * 1000).toISOString(),
      access_until: currentEnd,
    };
  } else if (payment?.status === "failed") {
    nextPayment = {
      id: payment.id,
      subscription_id: current.id,
      user_id: current.user_id,
      collection_id: current.collection_id,
      razorpay_mode: current.razorpay_mode,
      amount_paise: payment.amount,
      currency: "INR",
      status: "failed",
      created_at: new Date(payment.created_at * 1000).toISOString(),
      access_until: null,
      error_description: payment.error_description ?? null,
    };
  }

  const subscription: CollectionSubscription = {
    ...current,
    status: isNewerStatus ? eventStatus : current.status,
    current_period_start:
      gateway.current_start == null
        ? current.current_period_start
        : getSubscriptionAccessEnd(gateway.current_start),
    current_period_end: currentEnd ?? current.current_period_end,
    paid_through: paidThrough,
    last_paid_payment_id: lastPaidPaymentId,
    cancel_at_period_end:
      event === "subscription.cancelled"
        ? Boolean(currentEnd && Date.parse(currentEnd) > now)
        : current.cancel_at_period_end,
    last_status_event_at: Math.max(current.last_status_event_at, eventCreatedAt),
    updated_at: new Date(now).toISOString(),
  };

  if (nextPayment?.status === "captured") {
    nextPayment.access_until = paidThrough;
  }
  return { subscription, ...(nextPayment ? { payment: nextPayment } : {}) };
}

export function getSubscriptionAccessAfterRefund(
  current: CollectionSubscription,
  payments: CollectionSubscriptionPayment[],
  refundedPaymentId: string,
  now = Date.now(),
): CollectionSubscription {
  const paidPayments = payments
    .filter((payment) => payment.id !== refundedPaymentId && payment.status === "captured")
    .filter((payment) => payment.access_until && Date.parse(payment.access_until) > now)
    .sort((a, b) => Date.parse(b.access_until!) - Date.parse(a.access_until!));
  const latest = paidPayments[0];
  return {
    ...current,
    paid_through: latest?.access_until ?? null,
    last_paid_payment_id: latest?.id ?? null,
    updated_at: new Date(now).toISOString(),
  };
}
