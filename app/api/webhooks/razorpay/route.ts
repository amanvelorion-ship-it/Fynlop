import { createHash } from "node:crypto";
import { updateCollectionSubscriptionFromEvent } from "../../../../lib/collection-subscription-state";
import { getCollectionSubscriptionByGatewayId, saveCollectionSubscription } from "../../../../lib/dynamodb";
import { verifyRazorpayWebhookSignature } from "../../../../lib/razorpay";
import { sendCollectionSubscriptionEnded } from "../../../../lib/ses";
import type { RazorpayMode } from "../../../../lib/razorpay";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readEntity(value: unknown): JsonRecord | null {
  if (!isRecord(value) || !isRecord(value.entity)) return null;
  return value.entity;
}

function readNotes(value: unknown): Record<string, string | number> | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value).filter(
    (entry): entry is [string, string | number] =>
      typeof entry[1] === "string" || typeof entry[1] === "number",
  );
  return Object.fromEntries(entries);
}

function readSubscription(value: unknown) {
  const entity = readEntity(value);
  if (
    !entity ||
    typeof entity.id !== "string" ||
    typeof entity.plan_id !== "string" ||
    typeof entity.status !== "string"
  ) {
    return null;
  }
  return {
    id: entity.id,
    plan_id: entity.plan_id,
    status: entity.status,
    current_start: typeof entity.current_start === "number" ? entity.current_start : null,
    current_end: typeof entity.current_end === "number" ? entity.current_end : null,
    notes: readNotes(entity.notes),
  };
}

function readPayment(value: unknown) {
  const entity = readEntity(value);
  if (
    !entity ||
    typeof entity.id !== "string" ||
    typeof entity.amount !== "number" ||
    typeof entity.currency !== "string" ||
    typeof entity.status !== "string" ||
    typeof entity.created_at !== "number"
  ) {
    return null;
  }
  return {
    id: entity.id,
    amount: entity.amount,
    subscription_id:
      typeof entity.subscription_id === "string" ? entity.subscription_id : undefined,
    currency: entity.currency,
    status: entity.status,
    created_at: entity.created_at,
    error_description:
      typeof entity.error_description === "string" ? entity.error_description : null,
  };
}

const handledEvents = new Set([
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.pending",
  "subscription.halted",
  "subscription.cancelled",
  "subscription.completed",
  "subscription.expired",
]);

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    if (!signature) {
      return Response.json({ error: "Razorpay webhook signature is missing." }, { status: 400 });
    }

    const modes: RazorpayMode[] = ["test", "live"];
    let configuredSecret = false;
    let verifiedMode: RazorpayMode | null = null;
    for (const mode of modes) {
      const secretName =
        mode === "live" ? "RAZORPAY_LIVE_WEBHOOK_SECRET" : "RAZORPAY_TEST_WEBHOOK_SECRET";
      if (!process.env[secretName]) continue;
      configuredSecret = true;
      if (verifyRazorpayWebhookSignature(rawBody, signature, mode)) {
        verifiedMode = mode;
        break;
      }
    }
    if (!configuredSecret) {
      throw new Error("Configure RAZORPAY_TEST_WEBHOOK_SECRET and/or RAZORPAY_LIVE_WEBHOOK_SECRET.");
    }
    if (!verifiedMode) {
      return Response.json({ error: "Razorpay webhook signature is invalid." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: "Razorpay webhook payload is not valid JSON." }, { status: 400 });
    }
    if (!isRecord(body) || typeof body.event !== "string" || !isRecord(body.payload)) {
      return Response.json({ error: "Razorpay webhook payload is invalid." }, { status: 400 });
    }
    if (!handledEvents.has(body.event)) {
      return Response.json({ received: true, ignored: true });
    }

    const gatewaySubscription = readSubscription(body.payload.subscription);
    if (!gatewaySubscription) {
      return Response.json({ error: "Razorpay subscription details are missing." }, { status: 400 });
    }
    const payment = readPayment(body.payload.payment);
    if (body.event === "subscription.charged" && !payment) {
      return Response.json({ error: "Razorpay charge details are missing." }, { status: 400 });
    }

    const subscription = await getCollectionSubscriptionByGatewayId(gatewaySubscription.id);
    if (!subscription) {
      return Response.json({ error: "The collection subscription record was not found." }, { status: 404 });
    }
    if (subscription.razorpay_mode !== verifiedMode) {
      return Response.json({ error: "Webhook mode does not match the stored subscription." }, { status: 400 });
    }

    const eventCreatedAt =
      typeof body.created_at === "number" && Number.isFinite(body.created_at)
        ? body.created_at
        : Math.floor(Date.now() / 1000);
    const updated = updateCollectionSubscriptionFromEvent(
      subscription,
      body.event,
      gatewaySubscription,
      payment ?? undefined,
      eventCreatedAt,
    );
    if (body.event === "subscription.completed" && subscription.status !== "completed") {
      await sendCollectionSubscriptionEnded(subscription.email, subscription.collection_title);
    }

    const eventId = createHash("sha256").update(rawBody).digest("hex");
    const processed = await saveCollectionSubscription(updated.subscription, {
      payment: updated.payment,
      eventId,
    });
    return Response.json({ received: true, duplicate: !processed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process Razorpay webhook.";
    console.error("Razorpay collection subscription webhook failed:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
