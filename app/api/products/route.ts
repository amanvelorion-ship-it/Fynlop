import { getProducts } from "../../../lib/products";

export async function GET() {
  try {
    return Response.json(await getProducts());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load the product catalog.";
    return Response.json({ error: message }, { status: 503 });
  }
}
