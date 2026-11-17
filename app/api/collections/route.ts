import { getPublishedCollections } from "../../../lib/collection-catalog";

export async function GET() {
  try {
    return Response.json(await getPublishedCollections(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load collections.";
    return Response.json({ error: message }, { status: 500 });
  }
}
