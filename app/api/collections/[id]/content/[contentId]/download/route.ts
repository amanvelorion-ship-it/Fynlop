import { getAuthenticatedUser } from "../../../../../../../lib/auth";
import { hasCollectionAccess } from "../../../../../../../lib/collection-access";
import {
  getCollectionContentById,
  getCollectionSubscriptionsByUser,
} from "../../../../../../../lib/dynamodb";
import { createDownloadUrl, fileExists } from "../../../../../../../lib/s3";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; contentId: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Sign in to access collection content." }, { status: 401 });
    }
    const { id, contentId } = await context.params;
    const subscriptions = await getCollectionSubscriptionsByUser(user.id);
    if (
      !subscriptions.some(
        (subscription) =>
          subscription.collection_id === id && hasCollectionAccess(subscription),
      )
    ) {
      return Response.json({ error: "An active subscription is required to access this collection." }, { status: 403 });
    }

    const content = await getCollectionContentById(id, contentId);
    if (!content || !content.published || Date.parse(content.release_at) > Date.now()) {
      return Response.json({ error: "This release is not available yet." }, { status: 404 });
    }
    if (!(await fileExists(content.file_key))) {
      return Response.json({ error: "The collection release file could not be found." }, { status: 404 });
    }
    return Response.json({
      signedUrl: await createDownloadUrl(content.file_key, 300),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare this collection release.";
    return Response.json({ error: message }, { status: 500 });
  }
}
