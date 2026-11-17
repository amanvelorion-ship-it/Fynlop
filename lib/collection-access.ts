import type { CollectionSubscription } from "../types";

export function getCurrentTimestamp(): number {
  return Date.now();
}

export function hasCollectionAccess(
  subscription: Pick<CollectionSubscription, "paid_through" | "last_paid_payment_id">,
  now = Date.now(),
): boolean {
  if (!subscription.paid_through || !subscription.last_paid_payment_id) return false;
  const paidThrough = Date.parse(subscription.paid_through);
  return Number.isFinite(paidThrough) && paidThrough > now;
}

export function getSubscriptionAccessEnd(
  currentEndSeconds: number | null | undefined,
): string | null {
  if (!currentEndSeconds || !Number.isFinite(currentEndSeconds)) return null;
  return new Date(currentEndSeconds * 1000).toISOString();
}
