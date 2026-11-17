import { getAuthenticatedUser } from "../../../../lib/auth";
import { updateCollectionSubscriptionFromEvent } from "../../../../lib/collection-subscription-state";
import { getCollectionSubscriptionByGatewayId, saveCollectionSubscription } from "../../../../lib/dynamodb";
import {
  fetchRazorpayPayment,
  fetchRazorpaySubscription,
  verifyRazorpaySubscriptionSignature,
} from "../../../../lib/razorpay";

type VerificationBody = {
  razorpay_subscription_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
};

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Sign in to verify your subscription." }, { status: 401 });
    }

    const body: VerificationBody = await request.json();
    if (
      typeof body.razorpay_subscription_id !== "string" ||
      typeof body.razorpay_payment_id !== "string" ||
      typeof body.razorpay_signature !== "string"
    ) {
      return Response.json({ error: "The subscription verification details are invalid." }, { status: 400 });
    }

    const subscription = await getCollectionSubscriptionByGatewayId(body.razorpay_subscription_id);
    if (!subscription || subscription.user_id !== user.id) {
      return Response.json({ error: "This subscription does not belong to your account." }, { status: 404 });
    }
    if (
      !verifyRazorpaySubscriptionSignature(
        body.razorpay_payment_id,
        body.razorpay_subscription_id,
        body.razorpay_signature,
        subscription.razorpay_mode,
      )
    ) {
      return Response.json({ error: "Subscription payment verification failed." }, { status: 400 });
    }

    const [gatewaySubscription, payment] = await Promise.all([
      fetchRazorpaySubscription(subscription.razorpay_subscription_id, subscription.razorpay_mode),
      fetchRazorpayPayment(body.razorpay_payment_id, subscription.razorpay_mode),
    ]);
    if (
      gatewaySubscription.plan_id !== subscription.razorpay_plan_id ||
      gatewaySubscription.notes?.user_id !== user.id ||
      gatewaySubscription.notes?.collection_id !== subscription.collection_id
    ) {
      return Response.json({ error: "Razorpay subscription details do not match this account." }, { status: 400 });
    }
    if (payment.subscription_id !== subscription.razorpay_subscription_id) {
      return Response.json({ error: "Razorpay payment is not linked to this collection subscription." }, { status: 400 });
    }
    const paymentAmount = Number(payment.amount);
    if (!Number.isSafeInteger(paymentAmount)) {
      return Response.json({ error: "Razorpay returned an invalid payment amount." }, { status: 400 });
    }
    const paymentSnapshot = {
      id: payment.id,
      subscription_id: payment.subscription_id,
      amount: paymentAmount,
      currency: payment.currency,
      status: payment.status,
      created_at: payment.created_at,
      error_description: payment.error_description ?? null,
    };
    const gatewaySnapshot = {
      id: gatewaySubscription.id,
      plan_id: gatewaySubscription.plan_id,
      status: gatewaySubscription.status,
      current_start: gatewaySubscription.current_start ?? null,
      current_end: gatewaySubscription.current_end ?? null,
      notes: {
        user_id:
          typeof gatewaySubscription.notes?.user_id === "string"
            ? gatewaySubscription.notes.user_id
            : undefined,
        collection_id:
          typeof gatewaySubscription.notes?.collection_id === "string"
            ? gatewaySubscription.notes.collection_id
            : undefined,
      },
    };

    if (
      payment.status === "captured" &&
      payment.currency === "INR" &&
      paymentAmount === subscription.amount_paise &&
      gatewaySubscription.current_end
    ) {
      const eventCreatedAt = Math.floor(Date.now() / 1000);
      const updated = updateCollectionSubscriptionFromEvent(
        subscription,
        "subscription.charged",
        gatewaySnapshot,
        paymentSnapshot,
        eventCreatedAt,
      );
      await saveCollectionSubscription(updated.subscription, { payment: updated.payment });
      return Response.json({ success: true, hasAccess: true });
    }

    return Response.json({
      success: true,
      pending: true,
      message: "Payment authorization is complete. Collection access will appear after Razorpay confirms the first monthly charge.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify this subscription.";
    return Response.json({ error: message }, { status: 500 });
  }
}
