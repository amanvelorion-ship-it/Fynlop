import { createAdminClient, getAuthenticatedUser } from "../../../../lib/supabase-server";
import { parseStoragePath } from "../../../../lib/storage";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(request.headers.get("authorization"));
    if (!user) {
      return Response.json({ error: "Sign in to access your library." }, { status: 401 });
    }

    const { id } = await context.params;
    const admin = createAdminClient();
    const { data: purchase, error: purchaseError } = await admin
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", id)
      .eq("status", "paid")
      .limit(1)
      .maybeSingle();

    if (purchaseError) {
      return Response.json({ error: `Could not verify your purchase: ${purchaseError.message}` }, { status: 500 });
    }
    if (!purchase) {
      return Response.json({ error: "This edition is not in your library." }, { status: 403 });
    }

    const { data: product, error: productError } = await admin
      .from("products")
      .select("file_url")
      .eq("id", id)
      .maybeSingle();

    if (productError) {
      return Response.json({ error: `Could not find the digital edition: ${productError.message}` }, { status: 500 });
    }
    const storagePath = parseStoragePath(product?.file_url);
    if (!storagePath) {
      return Response.json({ error: "The digital edition file has not been uploaded yet." }, { status: 404 });
    }

    const { data: signedFile, error: signingError } = await admin.storage
      .from(storagePath.bucket)
      .createSignedUrl(storagePath.path, 300);
    if (signingError || !signedFile?.signedUrl) {
      return Response.json(
        { error: `Could not prepare a secure download: ${signingError?.message ?? "No download link was returned."}` },
        { status: 500 },
      );
    }

    return Response.json({ signedUrl: signedFile.signedUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare this download.";
    return Response.json({ error: message }, { status: 500 });
  }
}
