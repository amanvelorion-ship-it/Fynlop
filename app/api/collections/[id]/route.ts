import {
  getPublishedCollection,
  getPublishedCollectionContent,
} from "../../../../lib/collection-catalog";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const collection = await getPublishedCollection(id);
    if (!collection) {
      return Response.json({ error: "This collection is unavailable." }, { status: 404 });
    }
    return Response.json(
      { collection, content: await getPublishedCollectionContent(id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load this collection.";
    return Response.json({ error: message }, { status: 500 });
  }
}
