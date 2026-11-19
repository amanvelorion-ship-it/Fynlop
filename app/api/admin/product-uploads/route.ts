import { getAuthenticatedUser } from "../../../../lib/auth";
import { getProduct } from "../../../../lib/dynamodb";
import { createProductId, isValidProductId } from "../../../../lib/product-id";
import { createUploadUrl, deleteFiles } from "../../../../lib/s3";

type UploadFile = { size: number; type: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUploadFile(value: unknown): value is UploadFile {
  return (
    isRecord(value) &&
    typeof value.size === "number" &&
    Number.isInteger(value.size) &&
    typeof value.type === "string"
  );
}

function imageExtension(contentType: string): string | null {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return null;
}

async function authorizeAdmin(): Promise<Response | null> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return Response.json({ error: "Sign in as an administrator to upload products." }, { status: 401 });
    if (user.email.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
      return Response.json({ error: "Only an administrator can upload products." }, { status: 403 });
    }
    return null;
  } catch (error) {
    console.error("Could not verify administrator for product upload:", error);
    return Response.json({ error: "Could not verify your administrator account. Please try again." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorizationError = await authorizeAdmin();
  if (authorizationError) return authorizationError;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "The upload request was invalid." }, { status: 400 });
  }
  if (!isRecord(payload)) {
    return Response.json({ error: "The upload request was invalid." }, { status: 400 });
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const cover = payload.cover;
  const pdf = payload.pdf;
  const previews = payload.previews;
  if (
    !title ||
    title.length > 100 ||
    !isUploadFile(cover) ||
    !isUploadFile(pdf) ||
    (previews !== undefined && !Array.isArray(previews)) ||
    (Array.isArray(previews) && (previews.length > 3 || !previews.every(isUploadFile)))
  ) {
    return Response.json({ error: "Check the title and selected uploads, then try again." }, { status: 400 });
  }

  const previewFiles = Array.isArray(previews) ? previews : [];
  const coverExtension = imageExtension(cover.type);
  const previewExtensions = previewFiles.map((file) => imageExtension(file.type));
  if (
    cover.size < 1 ||
    cover.size > 3 * 1024 * 1024 ||
    !coverExtension ||
    pdf.size < 1 ||
    pdf.size > 50 * 1024 * 1024 ||
    pdf.type !== "application/pdf" ||
    previewFiles.some((file, index) =>
      file.size < 1 ||
      file.size > 2 * 1024 * 1024 ||
      !previewExtensions[index],
    )
  ) {
    return Response.json({
      error: "Covers must be images under 3 MB, previews under 2 MB, and PDFs under 50 MB.",
    }, { status: 400 });
  }

  const productId = createProductId(title);
  if (!productId) {
    return Response.json({ error: "The product title must contain letters or numbers." }, { status: 400 });
  }

  try {
    const coverKey = `covers/${productId}/cover.${coverExtension}`;
    const pdfKey = `pdfs/${productId}/edition.pdf`;
    const previewKeys = previewExtensions.map(
      (extension, index) => `previews/${productId}/preview-${index + 1}.${extension}`,
    );
    const [coverUrl, pdfUrl, previewUrls] = await Promise.all([
      createUploadUrl(coverKey, cover.type),
      createUploadUrl(pdfKey, "application/pdf"),
      Promise.all(
        previewKeys.map((key, index) =>
          createUploadUrl(key, previewFiles[index].type),
        ),
      ),
    ]);

    return Response.json({
      productId,
      cover: { key: coverKey, url: coverUrl, contentType: cover.type },
      pdf: { key: pdfKey, url: pdfUrl, contentType: "application/pdf" },
      previews: previewKeys.map((key, index) => ({
        key,
        url: previewUrls[index],
        contentType: previewFiles[index].type,
      })),
    });
  } catch (error) {
    console.error("Could not prepare product uploads:", error);
    return Response.json({ error: "Could not prepare product uploads. Please try again." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const authorizationError = await authorizeAdmin();
  if (authorizationError) return authorizationError;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "The cleanup request was invalid." }, { status: 400 });
  }
  const productId = isRecord(payload) && typeof payload.productId === "string"
    ? payload.productId
    : "";
  if (!isValidProductId(productId)) {
    return Response.json({ error: "The product upload identifier was invalid." }, { status: 400 });
  }

  try {
    if (await getProduct(productId)) {
      return Response.json({ error: "This product has already been saved and cannot be cleaned up as an upload." }, { status: 409 });
    }
    const extensions = ["jpg", "png", "webp"];
    const keys = [
      ...extensions.map((extension) => `covers/${productId}/cover.${extension}`),
      `pdfs/${productId}/edition.pdf`,
      ...[1, 2, 3].flatMap((index) =>
        extensions.map((extension) => `previews/${productId}/preview-${index}.${extension}`),
      ),
    ];
    await deleteFiles(keys);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Could not clean up incomplete product uploads:", error);
    return Response.json({ error: "Could not clean up the incomplete upload. Please contact support." }, { status: 503 });
  }
}
