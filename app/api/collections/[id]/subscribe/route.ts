import { getAuthenticatedUser } from "../../../../../lib/auth";
import {
  getCollection,
  getCollectionSubscriptionsByUser,
  getStoreSettings,
  putCollection,
  saveCollectionSubscription,
} from "../../../../../lib/dynamodb";
import { hasCollectionAccess } from "../../../../../lib/collection-access";
import {
  cancelRazorpayCollectionSubscription,
  createRazorpayCollectionSubscription,
  createRazorpayMonthlyPlan,
  getRazorpayKeyId,
} from "../../../../../lib/razorpay";
import type { CollectionPlan, CollectionSubscription } from "../../../../../types";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Sign in before subscribing to a collection." }, { status: 401 });
    }

    const { id } = await context.params;
    const [collection, settings, subscriptions] = await Promise.all([
      getCollection(id),
      getStoreSettings(),
      getCollectionSubscriptionsByUser(user.id),
    ]);
    if (!collection || collection.status !== "published") {
      return Response.json({ error: "This collection is unavailable." }, { status: 404 });
    }

    const existing = subscriptions.find((item) => item.collection_id === id);
    if (existing) {
      if (hasCollectionAccess(existing)) {
        return Response.json(
          { error: "You already have access to this collection until the current paid period ends." },
          { status: 409 },
        );
      }
      if (existing.status === "created" || existing.status === "authenticated") {
        return Response.json({
          subscriptionId: existing.razorpay_subscription_id,
          keyId: getRazorpayKeyId(existing.razorpay_mode),
          amount: existing.amount_paise,
          collectionTitle: existing.collection_title,
        });
      }
      if (existing.status === "payment_failed") {
        return Response.json(
          { error: "Your previous subscription payment is still being retried. Cancel it or wait for its status to update before subscribing again." },
          { status: 409 },
        );
      }
    }

    const mode = settings.razorpay_mode;
    let plan = collection.plans.find(
      (item) => item.mode === mode && item.price_paise === collection.monthly_price_paise,
    );
    if (!plan) {
      const planId = await createRazorpayMonthlyPlan(
        collection.title,
        collection.monthly_price_paise,
        mode,
      );
      plan = {
        mode,
        price_paise: collection.monthly_price_paise,
        plan_id: planId,
        created_at: new Date().toISOString(),
      } satisfies CollectionPlan;
      await putCollection({
        ...collection,
        plans: [...collection.plans, plan],
        updated_at: new Date().toISOString(),
      });
    }

    const gatewaySubscription = await createRazorpayCollectionSubscription(
      plan.plan_id,
      user.id,
      collection.id,
      mode,
    );
    const now = new Date().toISOString();
    const subscription: CollectionSubscription = {
      id: gatewaySubscription.id,
      user_id: user.id,
      email: user.email,
      collection_id: collection.id,
      collection_title: collection.title,
      razorpay_subscription_id: gatewaySubscription.id,
      razorpay_plan_id: plan.plan_id,
      razorpay_mode: mode,
      amount_paise: collection.monthly_price_paise,
      status: "created",
      current_period_start: null,
      current_period_end: null,
      paid_through: null,
      last_paid_payment_id: null,
      cancel_at_period_end: false,
      last_status_event_at: gatewaySubscription.created_at,
      created_at: now,
      updated_at: now,
    };

    try {
      await saveCollectionSubscription(subscription);
    } catch (error) {
      try {
        await cancelRazorpayCollectionSubscription(gatewaySubscription.id, mode, false);
      } catch (cancelError) {
        const cancelMessage = cancelError instanceof Error ? cancelError.message : "Gateway cancellation failed.";
        throw new Error(
          `Could not save your subscription. The gateway subscription may still exist and needs review: ${cancelMessage}`,
          { cause: error },
        );
      }
      throw error;
    }

    return Response.json({
      subscriptionId: gatewaySubscription.id,
      keyId: getRazorpayKeyId(mode),
      amount: collection.monthly_price_paise,
      collectionTitle: collection.title,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start this collection subscription.";
    return Response.json({ error: message }, { status: 500 });
  }
}
