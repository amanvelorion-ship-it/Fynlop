import { getAuthenticatedUser } from "../../../../lib/auth";
import { getProduct, getStoreSettings } from "../../../../lib/dynamodb";
import { createRazorpayOrder, getRazorpayKeyId } from "../../../../lib/razorpay";
import { fileExists } from "../../../../lib/s3";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Sign in before starting checkout." }, { status: 401 });
    }

    const body: unknown = await request.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("productIds" in body) ||
      !Array.isArray(body.productIds) ||
      !body.productIds.every((id: unknown) => typeof id === "string")
    ) {
      return Response.json({ error: "A valid product selection is required." }, { status: 400 });
    }

    const productIds = [...new Set(body.productIds as string[])];
    if (!productIds.length || productIds.length > 50) {
      return Response.json({ error: "Your cart contains an unavailable product." }, { status: 400 });
    }

    const [products, settings] = await Promise.all([
      Promise.all(productIds.map(getProduct)),
      getStoreSettings(),
    ]);
    if (settings.maintenance_mode) {
      return Response.json({ error: "Checkout is temporarily unavailable while the store is under maintenance." }, { status: 503 });
    }
    if (products.some((product) => !product)) {
      return Response.json({ error: "One or more editions are not available for purchase." }, { status: 409 });
    }

    const selectedProducts = products.filter((product) => product !== null);
    const filesReady = await Promise.all(
      selectedProducts.map((product) =>
        product.file_url ? fileExists(product.file_url) : Promise.resolve(false),
      ),
    );
    if (filesReady.some((ready) => !ready)) {
      return Response.json(
        { error: "One or more digital editions are not ready for purchase yet. Please try again later." },
        { status: 409 },
      );
    }

    const mode = settings.razorpay_mode;
    const { order, amount } = await createRazorpayOrder(
      selectedProducts.map(({ id, price_inr }) => ({ id, price_inr })),
      user.id,
      user.email,
      mode,
    );

    return Response.json({
      orderId: order.id,
      amount: order.amount,
      total: amount,
      keyId: getRazorpayKeyId(mode),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create a payment order.";
    return Response.json({ error: message }, { status: 500 });
  }
}
