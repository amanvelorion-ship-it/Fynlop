import { getAuthenticatedUser } from "../../../lib/auth";
import { getOrdersByUser } from "../../../lib/dynamodb";
import { getProducts } from "../../../lib/products";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Sign in to open your library." }, { status: 401 });
    }

    const orders = await getOrdersByUser(user.id);
    const purchasedIds = new Set(
      orders.filter((order) => order.status === "paid").map((order) => order.product_id),
    );
    const products = await getProducts();
    return Response.json(products.filter((product) => purchasedIds.has(product.id)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load your library.";
    return Response.json({ error: message }, { status: 500 });
  }
}
