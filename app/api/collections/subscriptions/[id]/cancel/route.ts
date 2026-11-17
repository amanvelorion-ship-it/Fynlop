import { getAuthenticatedUser } from "../../../../../../lib/auth";
import { hasCollectionAccess, getSubscriptionAccessEnd } from "../../../../../../lib/collection-access";
import {
  getCollectionSubscriptionByGatewayId,
  saveCollectionSubscription,
} from "../../../../../../lib/dynamodb";
import { cancelRazorpayCollectionSubscription } from "../../../../../../lib/razorpay";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Sign in before managing subscriptions." }, { status: 401 });
    }
    const { id } = await context.params;
    const subscription = await getCollectionSubscriptionByGatewayId(id);
    if (!subscription || subscription.user_id !== user.id) {
      return Response.json({ error: "This subscription was not found for your account." }, { status: 404 });
    }
    if (subscription.cancel_at_period_end) {
      return Response.json({
        success: true,
        accessUntil: subscription.paid_through,
      });
    }

    const retainAccess = hasCollectionAccess(subscription);
    const gatewaySubscription = await cancelRazorpayCollectionSubscription(
      subscription.razorpay_subscription_id,
      subscription.razorpay_mode,
      retainAccess,
    );
    const now = new Date().toISOString();
    const updated = {
      ...subscription,
      status: "cancelled" as const,
      cancel_at_period_end: retainAccess,
      current_period_end:
        getSubscriptionAccessEnd(gatewaySubscription.current_end) ??
        subscription.current_period_end,
      updated_at: now,
    };
    await saveCollectionSubscription(updated);

    return Response.json({
      success: true,
      accessUntil: updated.paid_through,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to cancel this subscription.";
    return Response.json({ error: message }, { status: 500 });
  }
}
