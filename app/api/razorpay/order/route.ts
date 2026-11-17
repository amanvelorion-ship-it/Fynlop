import { createRazorpayOrder, getRazorpayKeyId } from "../../../../lib/razorpay";
import { parseStoragePath } from "../../../../lib/storage";
import { createAdminClient, getAuthenticatedUser } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request.headers.get("authorization"));
    if (!user) {
      return Response.json({ error: "Sign in before starting checkout." }, { status: 401 });
    }

    const body: unknown = await request.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("productIds" in body) ||
      !Array.isArray(body.productIds) ||
      !body.productIds.every((id: unknown) => typeof id === "string") ||
      !("email" in body) ||
      typeof body.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
    ) {
      return Response.json({ error: "A valid email and product selection are required." }, { status: 400 });
    }

    const productIds = [...new Set(body.productIds as string[])];
    if (!productIds.length) {
      return Response.json({ error: "Your cart contains an unavailable product." }, { status: 400 });
    }

    const admin = createAdminClient();
    const [{ data: catalog, error: catalogError }, { data: settings, error: settingsError }] = await Promise.all([
      admin
      .from("products")
      .select("id, price_inr, file_url")
      .in("id", productIds),
      admin.from("admin_settings").select("razorpay_mode, maintenance_mode").eq("id", 1).maybeSingle(),
    ]);
    if (catalogError) {
      return Response.json({ error: `Could not verify the digital catalog: ${catalogError.message}` }, { status: 503 });
    }
    if (settingsError) {
      return Response.json({ error: `Could not load store payment settings: ${settingsError.message}` }, { status: 503 });
    }
    if (settings?.maintenance_mode) {
      return Response.json({ error: "Checkout is temporarily unavailable while the store is under maintenance." }, { status: 503 });
    }
    const mode = settings?.razorpay_mode ?? "test";
    if (!catalog || catalog.length !== productIds.length) {
      return Response.json({ error: "One or more editions are not available for purchase yet." }, { status: 409 });
    }
    const selectedProducts = catalog.map(({ id, price_inr }) => ({ id, price_inr }));

    const filesReady = await Promise.all(
      catalog.map(async (product) => {
        const storagePath = parseStoragePath(product.file_url);
        if (!storagePath) return false;

        const parts = storagePath.path.split("/");
        const fileName = parts.pop();
        if (!fileName) return false;
        const { data: files, error: fileError } = await admin.storage
          .from(storagePath.bucket)
          .list(parts.join("/"), { search: fileName, limit: 100 });
        if (fileError) {
          throw new Error(`Could not verify an edition file: ${fileError.message}`);
        }
        return files.some((file) => file.name === fileName && file.id !== null);
      }),
    );
    if (filesReady.some((ready) => !ready)) {
      return Response.json(
        { error: "One or more digital editions are not ready for purchase yet. Please try again later." },
        { status: 409 },
      );
    }

    const { order, amount } = await createRazorpayOrder(
      selectedProducts,
      user.id,
      body.email.trim(),
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
