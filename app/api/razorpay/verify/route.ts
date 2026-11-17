import { getAuthenticatedUser } from "../../../../lib/auth";
import {
  getOrdersByUser,
  getProduct,
  getStoreSettings,
  saveOrder,
} from "../../../../lib/dynamodb";
import { verifyRazorpayOrder } from "../../../../lib/razorpay";
import { sendOrderConfirmation } from "../../../../lib/ses";
import type { Order } from "../../../../types";

type VerifyBody = {
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
  productIds?: unknown;
};

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Sign in to verify this payment." }, { status: 401 });
    }

    const body: VerifyBody = await request.json();
    if (
      typeof body.razorpay_order_id !== "string" ||
      typeof body.razorpay_payment_id !== "string" ||
      typeof body.razorpay_signature !== "string" ||
      !Array.isArray(body.productIds) ||
      !body.productIds.every((id: unknown) => typeof id === "string")
    ) {
      return Response.json({ error: "The payment verification details are invalid." }, { status: 400 });
    }

    const productIds = [...new Set(body.productIds as string[])];
    if (!productIds.length || productIds.length > 50) {
      return Response.json({ error: "The purchased product selection is invalid." }, { status: 400 });
    }
    const [products, settings] = await Promise.all([
      Promise.all(productIds.map(getProduct)),
      getStoreSettings(),
    ]);
    if (products.some((product) => !product)) {
      return Response.json({ error: "The purchased product selection is invalid." }, { status: 400 });
    }
    const selectedProducts = products.filter((product) => product !== null);
    const verifiedMode = await verifyRazorpayOrder(
      body.razorpay_order_id,
      body.razorpay_payment_id,
      body.razorpay_signature,
      user.id,
      productIds,
      selectedProducts,
      settings.razorpay_mode,
    );
    if (!verifiedMode) {
      return Response.json({ error: "Payment verification failed." }, { status: 400 });
    }

    const createdAt = new Date().toISOString();
    const orders: Order[] = selectedProducts.map((product) => ({
      id: `${body.razorpay_payment_id}_${product.id}`,
      user_id: user.id,
      product_id: product.id,
      payment_id: body.razorpay_payment_id as string,
      amount: product.price_inr,
      razorpay_mode: verifiedMode,
      status: "paid",
      created_at: createdAt,
    }));
    let orderCreated = false;
    for (const order of orders) {
      const inserted = await saveOrder(order);
      if (inserted) {
        orderCreated = true;
        continue;
      }

      const existing = (await getOrdersByUser(user.id)).find(
        (savedOrder) => savedOrder.id === order.id,
      );
      if (
        !existing ||
        existing.payment_id !== order.payment_id ||
        existing.product_id !== order.product_id ||
        existing.status !== "paid"
      ) {
        return Response.json(
          { error: "This payment has already been processed or reversed." },
          { status: 409 },
        );
      }
    }

    let emailWarning: string | undefined;
    if (orderCreated) {
      try {
        await sendOrderConfirmation(
          user.email,
          selectedProducts.map((product) => product.title),
        );
      } catch (error) {
        console.error("SES order confirmation failed:", error);
        emailWarning = "Payment confirmed, but the confirmation email could not be sent. Your purchase is available in My Library.";
      }
    }

    return Response.json({ success: true, ...(emailWarning ? { emailWarning } : {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify this payment.";
    return Response.json({ error: message }, { status: 500 });
  }
}
