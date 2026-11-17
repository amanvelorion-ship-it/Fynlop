import { getAuthenticatedUser } from "../../../../lib/auth";
import { getOrdersByUser } from "../../../../lib/dynamodb";
import { getProduct } from "../../../../lib/dynamodb";
import { createDownloadUrl, fileExists } from "../../../../lib/s3";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Sign in to access your library." }, { status: 401 });
    }

    const { id } = await context.params;
    const orders = await getOrdersByUser(user.id);
    if (!orders.some((order) => order.product_id === id && order.status === "paid")) {
      return Response.json({ error: "This edition is not in your library." }, { status: 403 });
    }

    const product = await getProduct(id);
    if (!product?.file_url) {
      return Response.json({ error: "The digital edition file has not been uploaded yet." }, { status: 404 });
    }
    if (!(await fileExists(product.file_url))) {
      return Response.json({ error: "The digital edition file could not be found." }, { status: 404 });
    }

    return Response.json({
      signedUrl: await createDownloadUrl(product.file_url, 300),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare this download.";
    return Response.json({ error: message }, { status: 500 });
  }
}
