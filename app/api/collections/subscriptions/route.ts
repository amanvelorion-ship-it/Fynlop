import { getAuthenticatedUser } from "../../../../lib/auth";
import { hasCollectionAccess } from "../../../../lib/collection-access";
import {
  getCollectionContent,
  getCollectionSubscriptionPayments,
  getCollectionSubscriptionsByUser,
} from "../../../../lib/dynamodb";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Sign in to view your subscriptions." }, { status: 401 });
    }
    const subscriptions = await getCollectionSubscriptionsByUser(user.id);
    const items = await Promise.all(
      subscriptions.map(async (subscription) => {
        const [content, payments] = await Promise.all([
          getCollectionContent(subscription.collection_id),
          getCollectionSubscriptionPayments(subscription.razorpay_subscription_id),
        ]);
        const now = Date.now();
        const hasPaidHistory =
          Boolean(subscription.last_paid_payment_id) ||
          payments.some((payment) => payment.status !== "failed");
        return {
          hasPaidHistory,
          id: subscription.id,
          collectionId: subscription.collection_id,
          collectionTitle: subscription.collection_title,
          status:
            subscription.paid_through && Date.parse(subscription.paid_through) <= now
              ? "expired"
              : subscription.status,
          amountPaise: subscription.amount_paise,
          paidThrough: subscription.paid_through,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          hasAccess: hasCollectionAccess(subscription, now),
          contentCount: content.filter(
            (item) => item.published && Date.parse(item.release_at) <= now,
          ).length,
          payments: payments.map((payment) => ({
            id: payment.id,
            amountPaise: payment.amount_paise,
            status: payment.status,
            createdAt: payment.created_at,
          })),
        };
      }),
    );
    return Response.json(
      items
        .filter((item) => item.hasPaidHistory || item.status === "payment_failed")
        .map(({ hasPaidHistory: _hasPaidHistory, ...item }) => item),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load your subscriptions.";
    return Response.json({ error: message }, { status: 500 });
  }
}
