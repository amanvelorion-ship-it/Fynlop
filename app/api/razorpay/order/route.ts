import { getAuthenticatedUser } from "../../../../lib/auth";
import { getOrdersByUser, getProduct, getStoreSettings } from "../../../../lib/dynamodb";
import { createRazorpayOrder, getRazorpayKeyId } from "../../../../lib/razorpay";

type OrderBody = { productIds?: unknown };

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Sign in before purchasing a book." }, { status: 401 });
    }

    const body: OrderBody = await request.json();
    if (
      !Array.isArray(body.productIds) ||
      !body.productIds.every((id: unknown) => typeof id === "string")
    ) {
      return Response.json({ error: "Choose valid books to purchase." }, { status: 400 });
    }
    const productIds = [...new Set(body.productIds as string[])];
    if (!productIds.length || productIds.length > 50) {
      return Response.json({ error: "Choose between 1 and 50 books." }, { status: 400 });
    }

    const [products, settings, existingOrders] = await Promise.all([
      Promise.all(productIds.map(getProduct)),
      getStoreSettings(),
      getOrdersByUser(user.id),
    ]);
    if (products.some((product) => !product || !product.file_url)) {
      return Response.json({ error: "One or more selected books are unavailable." }, { status: 404 });
    }
    const alreadyPurchased = new Set(
      existingOrders.filter((order) => order.status === "paid").map((order) => order.product_id),
    );
    if (productIds.some((id) => alreadyPurchased.has(id))) {
      return Response.json(
        { error: "Your library already contains one or more selected books. Remove them before checkout." },
        { status: 409 },
      );
    }

    const selectedProducts = products.filter((product) => product !== null);
    const { order, amount } = await createRazorpayOrder(
      selectedProducts,
      user.id,
      user.email,
      settings.razorpay_mode,
    );
    return Response.json({
      orderId: order.id,
      keyId: getRazorpayKeyId(settings.razorpay_mode),
      amount: order.amount,
      currency: order.currency,
      totalInr: amount,
      email: user.email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start book checkout.";
    return Response.json({ error: message }, { status: 500 });
  }
}
