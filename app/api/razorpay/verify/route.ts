import { verifyRazorpayOrder } from "../../../../lib/razorpay";
import { createAdminClient, getAuthenticatedUser } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request.headers.get("authorization"));
    if (!user) {
      return Response.json({ error: "Sign in to verify this payment." }, { status: 401 });
    }

    const body: unknown = await request.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("razorpay_order_id" in body) ||
      typeof body.razorpay_order_id !== "string" ||
      !("razorpay_payment_id" in body) ||
      typeof body.razorpay_payment_id !== "string" ||
      !("razorpay_signature" in body) ||
      typeof body.razorpay_signature !== "string" ||
      !("productIds" in body) ||
      !Array.isArray(body.productIds) ||
      !body.productIds.every((id: unknown) => typeof id === "string")
    ) {
      return Response.json({ error: "The payment verification details are invalid." }, { status: 400 });
    }

    const productIds = [...new Set(body.productIds as string[])];
    const paymentId = body.razorpay_payment_id;
    if (!productIds.length) {
      return Response.json({ error: "The purchased product selection is invalid." }, { status: 400 });
    }
    const admin = createAdminClient();
    const [{ data: selectedProducts, error: catalogError }, { data: settings, error: settingsError }] = await Promise.all([
      admin.from("products").select("id, price_inr").in("id", productIds),
      admin.from("admin_settings").select("razorpay_mode").eq("id", 1).maybeSingle(),
    ]);
    if (catalogError) {
      return Response.json({ error: `Could not verify the product catalog: ${catalogError.message}` }, { status: 503 });
    }
    if (settingsError) {
      return Response.json({ error: `Could not load store payment settings: ${settingsError.message}` }, { status: 503 });
    }
    if (!selectedProducts || selectedProducts.length !== productIds.length) {
      return Response.json({ error: "The purchased product selection is invalid." }, { status: 400 });
    }
    const mode = settings?.razorpay_mode ?? "test";

    const verifiedMode = await verifyRazorpayOrder(
      body.razorpay_order_id,
      paymentId,
      body.razorpay_signature,
      user.id,
      productIds,
      selectedProducts,
      mode,
    );
    if (!verifiedMode) {
      return Response.json({ error: "Payment verification failed." }, { status: 400 });
    }

    const rows = selectedProducts.map((product) => ({
      user_id: user.id,
      product_id: product.id,
      payment_id: paymentId,
      amount: product.price_inr,
      razorpay_mode: verifiedMode,
      status: "paid" as const,
    }));
    const { error: saveError } = await admin
      .from("orders")
      .upsert(rows, { onConflict: "payment_id,product_id" });
    if (saveError) {
      return Response.json(
        { error: `Payment was verified, but your library could not be updated: ${saveError.message}` },
        { status: 500 },
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify this payment.";
    return Response.json({ error: message }, { status: 500 });
  }
}
