import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import type { Product } from "../types";

export type RazorpayMode = "test" | "live";

function getCredentials(mode: RazorpayMode) {
  const keyId =
    mode === "live"
      ? process.env.RAZORPAY_LIVE_KEY_ID
      : process.env.RAZORPAY_TEST_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret =
    mode === "live"
      ? process.env.RAZORPAY_LIVE_KEY_SECRET
      : process.env.RAZORPAY_TEST_KEY_SECRET ?? process.env.RAZORPAY_KEY_SECRET;
  return { keyId, keySecret };
}

function getRazorpayClient(mode: RazorpayMode) {
  const { keyId, keySecret } = getCredentials(mode);
  if (!keyId || !keySecret) {
    throw new Error(`Razorpay ${mode} credentials are not configured on the server.`);
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function hasRazorpayCredentials(mode: RazorpayMode) {
  const { keyId, keySecret } = getCredentials(mode);
  return Boolean(keyId && keySecret);
}

export function getRazorpayKeyId(mode: RazorpayMode) {
  const { keyId } = getCredentials(mode);
  if (!keyId || !hasRazorpayCredentials(mode)) {
    throw new Error(`Razorpay ${mode} credentials are not configured on the server.`);
  }
  return keyId;
}

export async function createRazorpayMonthlyPlan(
  title: string,
  amountPaise: number,
  mode: RazorpayMode,
): Promise<string> {
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
    throw new Error("A monthly collection price must be at least ₹1.00.");
  }
  const plan = await getRazorpayClient(mode).plans.create({
    period: "monthly",
    interval: 1,
    item: {
      name: `${title.slice(0, 70)} monthly`,
      amount: amountPaise,
      currency: "INR",
      description: `Monthly access to ${title}`.slice(0, 200),
    },
  });
  return plan.id;
}

export async function createRazorpayCollectionSubscription(
  planId: string,
  userId: string,
  collectionId: string,
  mode: RazorpayMode,
) {
  return getRazorpayClient(mode).subscriptions.create({
    plan_id: planId,
    total_count: 120,
    quantity: 1,
    customer_notify: false,
    notes: {
      user_id: userId,
      collection_id: collectionId,
    },
  });
}

export async function fetchRazorpaySubscription(subscriptionId: string, mode: RazorpayMode) {
  return getRazorpayClient(mode).subscriptions.fetch(subscriptionId);
}

export async function fetchRazorpayPayment(paymentId: string, mode: RazorpayMode) {
  return getRazorpayClient(mode).payments.fetch(paymentId);
}

export async function cancelRazorpayCollectionSubscription(
  subscriptionId: string,
  mode: RazorpayMode,
  atCycleEnd = true,
) {
  return getRazorpayClient(mode).subscriptions.cancel(subscriptionId, atCycleEnd);
}

export function verifyRazorpaySubscriptionSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string,
  mode: RazorpayMode,
): boolean {
  const { keySecret } = getCredentials(mode);
  if (!keySecret) throw new Error(`Razorpay ${mode} credentials are not configured on the server.`);
  const actual = Buffer.from(signature, "hex");
  const expected = createHmac("sha256", keySecret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest();
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  mode: RazorpayMode,
): boolean {
  const secretName =
    mode === "live" ? "RAZORPAY_LIVE_WEBHOOK_SECRET" : "RAZORPAY_TEST_WEBHOOK_SECRET";
  const secret = process.env[secretName];
  if (!secret) throw new Error(`Missing required environment variable: ${secretName}`);
  const actual = Buffer.from(signature, "hex");
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function createRazorpayOrder(
  selectedProducts: Pick<Product, "id" | "price_inr">[],
  userId: string,
  email: string,
  mode: RazorpayMode,
) {
  const amount = selectedProducts.reduce(
    (total, product) => total + product.price_inr,
    0,
  );
  const order = await getRazorpayClient(mode).orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: `fynlop-${randomUUID().replace(/-/g, "")}`,
    notes: {
      user_id: userId,
      email,
      product_ids: selectedProducts.map((product) => product.id).join(","),
    },
  });

  return { order, amount };
}

export async function verifyRazorpayOrder(
  orderId: string,
  paymentId: string,
  signature: string,
  userId: string,
  productIds: string[],
  selectedProducts: Pick<Product, "id" | "price_inr">[],
  preferredMode: RazorpayMode,
): Promise<RazorpayMode | false> {
  const actual = Buffer.from(signature, "hex");
  const modes: RazorpayMode[] = [
    preferredMode,
    preferredMode === "test" ? "live" : "test",
  ];

  for (const mode of modes) {
    const { keySecret } = getCredentials(mode);
    if (!keySecret) continue;
    const expected = createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest();
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      continue;
    }

    const client = getRazorpayClient(mode);
    const [order, payment] = await Promise.all([
      client.orders.fetch(orderId),
      client.payments.fetch(paymentId),
    ]);
    const productIdsNote = order.notes?.product_ids;
    const orderedProducts = (typeof productIdsNote === "string" ? productIdsNote : "")
      .split(",")
      .filter(Boolean)
      .sort();
    const expectedAmount =
      selectedProducts
        .filter((product) => productIds.includes(product.id))
        .reduce((total, product) => total + product.price_inr, 0) * 100;

    if (
      order.notes?.user_id === userId &&
      JSON.stringify(orderedProducts) === JSON.stringify([...productIds].sort()) &&
      order.currency === "INR" &&
      order.amount === expectedAmount &&
      order.status === "paid" &&
      payment.order_id === orderId &&
      payment.status === "captured" &&
      payment.currency === "INR" &&
      payment.amount === expectedAmount
    ) {
      return mode;
    }
    return false;
  }

  if (!modes.some((mode) => hasRazorpayCredentials(mode))) {
    throw new Error("No Razorpay credentials are configured on the server.");
  }
  return false;
}

export async function refundRazorpayPayment(
  paymentId: string,
  amountPaise: number,
  mode: RazorpayMode,
) {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    return { error: "Refund amount is invalid." };
  }
  try {
    await getRazorpayClient(mode).payments.refund(paymentId, {
      amount: amountPaise,
      speed: "normal",
    });
    return { error: null };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}
