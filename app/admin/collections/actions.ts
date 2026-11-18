"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/auth";
import {
  getCollection,
  getCollectionContent,
  getCollectionContentById,
  getCollectionSubscriptionByGatewayId,
  getCollectionSubscriptionPayment,
  getCollectionSubscriptionPayments,
  getCollectionSubscriptionsByCollection,
  deleteCollectionContent as removeCollectionContent,
  deleteCollectionWithContent,
  putCollection,
  putCollectionContent,
  saveCollectionSubscription,
  transitionCollectionSubscriptionPayment,
} from "../../../lib/dynamodb";
import {
  deleteFiles,
  getPublicFileUrl,
  getUploadedFileKey,
  uploadFile,
} from "../../../lib/s3";
import { hasOngoingCollectionSubscription } from "../../../lib/collection-access";
import {
  getSubscriptionAccessAfterRefund,
} from "../../../lib/collection-subscription-state";
import { refundRazorpayPayment } from "../../../lib/razorpay";
import type {
  Collection,
  CollectionContent,
  CollectionContentKind,
} from "../../../types";

export type CollectionActionState = {
  error?: string;
  success?: string;
  collectionId?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function makeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

function parseMonthlyPrice(formData: FormData): number | null {
  const price = Number(formData.get("monthly_price_inr"));
  if (!Number.isFinite(price) || price < 1 || !Number.isSafeInteger(Math.round(price * 100))) {
    return null;
  }
  return Math.round(price * 100);
}

function parseCollectionStatus(value: FormDataEntryValue | null): Collection["status"] | null {
  return value === "draft" || value === "published" || value === "archived" ? value : null;
}

export async function createCollection(
  _previousState: CollectionActionState,
  formData: FormData,
): Promise<CollectionActionState> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const monthlyPricePaise = parseMonthlyPrice(formData);
  const status = parseCollectionStatus(formData.get("status"));
  const cover = formData.get("cover");
  if (
    !title ||
    title.length > 100 ||
    !description ||
    description.length > 5000 ||
    monthlyPricePaise === null ||
    !status ||
    !(cover instanceof File) ||
    cover.size === 0 ||
    cover.size > 3 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(cover.type)
  ) {
    return { error: "Enter a title, description, monthly price, status, and a valid cover image under 3 MB." };
  }

  const slug = makeSlug(title);
  if (!slug) return { error: "The collection title must contain letters or numbers." };
  const id = `${slug}-${randomUUID().slice(0, 8)}`;
  const extension = cover.type.split("/")[1].replace("jpeg", "jpg");
  const coverKey = `covers/collections/${id}/cover.${extension}`;
  const uploaded: string[] = [];

  try {
    await uploadFile(coverKey, cover, cover.type);
    uploaded.push(coverKey);
    const now = new Date().toISOString();
    const collection: Collection = {
      id,
      title,
      description,
      cover_image_url: getPublicFileUrl(coverKey),
      monthly_price_paise: monthlyPricePaise,
      plans: [],
      status,
      created_at: now,
      updated_at: now,
    };
    await putCollection(collection, true);
  } catch (error) {
    const message = getErrorMessage(error, "AWS request failed.");
    try {
      await deleteFiles(uploaded);
    } catch (cleanupError) {
      return {
        error: `Collection creation failed: ${message}. Cover cleanup failed: ${getErrorMessage(cleanupError, "S3 request failed.")}`,
      };
    }
    return { error: `Could not create collection: ${message}` };
  }

  revalidatePath("/admin/collections");
  revalidatePath("/shop");
  revalidatePath("/");
  return { success: `Created “${title}”.`, collectionId: id };
}

export async function updateCollection(
  _previousState: CollectionActionState,
  formData: FormData,
): Promise<CollectionActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const monthlyPricePaise = parseMonthlyPrice(formData);
  const status = parseCollectionStatus(formData.get("status"));
  const cover = formData.get("cover");
  const existing = await getCollection(id);
  if (!existing) return { error: "This collection no longer exists." };
  if (
    !title ||
    title.length > 100 ||
    !description ||
    description.length > 5000 ||
    monthlyPricePaise === null ||
    !status ||
    (cover instanceof File &&
      (cover.size === 0 ||
        cover.size > 3 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(cover.type)))
  ) {
    return { error: "Check the collection details and cover image. Covers must be images under 3 MB." };
  }
  if (status !== "published") {
    const subscriptions = await getCollectionSubscriptionsByCollection(id);
    if (subscriptions.some((subscription) => hasOngoingCollectionSubscription(subscription))) {
      return {
        error: "This collection has active, pending, or retrying subscriptions. Keep it published until they are cancelled or finished and paid access expires.",
      };
    }
  }

  let coverImageUrl = existing.cover_image_url;
  let uploadedKey: string | null = null;
  if (cover instanceof File) {
    const extension = cover.type.split("/")[1].replace("jpeg", "jpg");
    uploadedKey = `covers/collections/${id}/cover-${randomUUID()}.${extension}`;
    try {
      await uploadFile(uploadedKey, cover, cover.type);
      coverImageUrl = getPublicFileUrl(uploadedKey);
    } catch (error) {
      return { error: `Could not upload the collection cover: ${getErrorMessage(error, "S3 request failed.")}` };
    }
  }

  try {
    await putCollection({
      ...existing,
      title,
      description,
      cover_image_url: coverImageUrl,
      monthly_price_paise: monthlyPricePaise,
      status,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    if (uploadedKey) await deleteFiles([uploadedKey]);
    return { error: `Could not update collection: ${getErrorMessage(error, "DynamoDB request failed.")}` };
  }

  revalidatePath("/admin/collections");
  revalidatePath(`/admin/collections/${id}`);
  revalidatePath("/shop");
  revalidatePath(`/collections/${id}`);
  revalidatePath("/");
  return {
    success: "Collection updated. Existing subscriptions retain their authorized plan price; this price applies to new subscriptions.",
  };
}

export async function createCollectionContent(
  _previousState: CollectionActionState,
  formData: FormData,
): Promise<CollectionActionState> {
  await requireAdmin();
  const collectionId = String(formData.get("collection_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const releaseMode = String(formData.get("release_mode") ?? "");
  const releaseAtValue = String(formData.get("release_at_utc") ?? "");
  const file = formData.get("file");
  const collection = await getCollection(collectionId);
  if (!collection || collection.status === "archived") {
    return { error: "Choose an available collection before adding a release." };
  }
  if (
    !title ||
    title.length > 150 ||
    description.length > 5000 ||
    !["chapter", "episode", "issue", "volume"].includes(kind) ||
    !["now", "schedule", "draft"].includes(releaseMode) ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > 50 * 1024 * 1024 ||
    file.type !== "application/pdf"
  ) {
    return { error: "Check the release details. Upload a PDF under 50 MB and choose a valid release mode." };
  }
  if (new TextDecoder().decode(new Uint8Array(await file.slice(0, 5).arrayBuffer())) !== "%PDF-") {
    return { error: "The uploaded collection release is not a valid PDF file." };
  }

  const now = new Date();
  let releaseAt = now;
  if (releaseMode === "schedule") {
    releaseAt = new Date(releaseAtValue);
    if (!Number.isFinite(releaseAt.getTime()) || releaseAt.getTime() <= now.getTime()) {
      return { error: "Choose a future release date and time." };
    }
  }
  const id = randomUUID();
  const fileKey = `collection-content/${collectionId}/${id}/release.pdf`;
  try {
    await uploadFile(fileKey, file, "application/pdf");
    const content: CollectionContent = {
      id,
      collection_id: collectionId,
      title,
      description,
      kind: kind as CollectionContentKind,
      file_key: fileKey,
      release_at: releaseAt.toISOString(),
      published: releaseMode !== "draft",
      created_at: now.toISOString(),
    };
    await putCollectionContent(content);
  } catch (error) {
    const message = getErrorMessage(error, "AWS request failed.");
    try {
      await deleteFiles([fileKey]);
    } catch (cleanupError) {
      return {
        error: `Release creation failed: ${message}. File cleanup failed: ${getErrorMessage(cleanupError, "S3 request failed.")}`,
      };
    }
    return { error: `Could not add release: ${message}` };
  }

  revalidatePath(`/admin/collections/${collectionId}`);
  revalidatePath(`/collections/${collectionId}`);
  return { success: `Added “${title}” to ${collection.title}.` };
}

export async function setCollectionContentPublication(
  collectionId: string,
  contentId: string,
  action: "publish-now" | "schedule" | "draft",
): Promise<CollectionActionState> {
  await requireAdmin();
  const content = await getCollectionContentById(collectionId, contentId);
  if (!content) return { error: "This collection release no longer exists." };
  const releaseTime = Date.parse(content.release_at);
  const isAlreadyReleased =
    content.published && (!Number.isFinite(releaseTime) || releaseTime <= Date.now());
  if (action === "draft" && isAlreadyReleased) {
    const subscriptions = await getCollectionSubscriptionsByCollection(collectionId);
    if (subscriptions.some((subscription) => hasOngoingCollectionSubscription(subscription))) {
      return {
        error: "This release is already available to subscribers. It cannot be unpublished while subscriptions are active, pending, retrying, or have paid access.",
      };
    }
  }
  const updated: CollectionContent = {
    ...content,
    published: action !== "draft",
    release_at: action === "publish-now" ? new Date().toISOString() : content.release_at,
  };
  try {
    await putCollectionContent(updated);
  } catch (error) {
    return { error: `Could not update release: ${getErrorMessage(error, "DynamoDB request failed.")}` };
  }
  revalidatePath(`/admin/collections/${collectionId}`);
  revalidatePath(`/collections/${collectionId}`);
  return { success: action === "draft" ? "Release saved as a draft." : "Release schedule updated." };
}

export async function deleteCollectionContent(
  collectionId: string,
  contentId: string,
): Promise<CollectionActionState> {
  await requireAdmin();
  const content = await getCollectionContentById(collectionId, contentId);
  if (!content) return { error: "This collection release no longer exists." };

  const releaseTime = Date.parse(content.release_at);
  const isAlreadyReleased =
    content.published && (!Number.isFinite(releaseTime) || releaseTime <= Date.now());
  if (isAlreadyReleased) {
    const subscriptions = await getCollectionSubscriptionsByCollection(collectionId);
    if (subscriptions.some((subscription) => hasOngoingCollectionSubscription(subscription))) {
      return {
        error: "This release is available to customers with active, pending, or retrying subscriptions and cannot be deleted yet.",
      };
    }
  }

  try {
    await removeCollectionContent(collectionId, contentId);
  } catch (error) {
    return { error: `Could not remove release: ${getErrorMessage(error, "DynamoDB request failed.")}` };
  }

  revalidatePath(`/admin/collections/${collectionId}`);
  revalidatePath(`/collections/${collectionId}`);
  try {
    await deleteFiles([content.file_key]);
  } catch (error) {
    return {
      success: `Release removed, but its stored file could not be deleted: ${getErrorMessage(error, "S3 request failed.")}`,
    };
  }
  return { success: "Release and its stored file deleted." };
}

export async function deleteCollection(
  collectionId: string,
): Promise<CollectionActionState> {
  await requireAdmin();
  const collection = await getCollection(collectionId);
  if (!collection) return { error: "This collection no longer exists." };
  if (collection.status !== "draft") {
    return { error: "Only draft collections can be permanently deleted. Set the collection to Draft first." };
  }

  const subscriptions = await getCollectionSubscriptionsByCollection(collectionId);
  if (subscriptions.length) {
    return {
      error: "This collection has subscription history and cannot be permanently deleted. Archive it to preserve billing records.",
    };
  }

  const content = await getCollectionContent(collectionId);
  if (content.length > 99) {
    return {
      error: "This collection has more than 99 releases and cannot be permanently deleted in one operation. Archive it instead.",
    };
  }

  try {
    await deleteCollectionWithContent(collectionId, content.map((release) => release.id));
  } catch (error) {
    return { error: `Could not delete collection: ${getErrorMessage(error, "DynamoDB request failed.")}` };
  }

  revalidatePath("/admin/collections");
  revalidatePath("/shop");
  revalidatePath(`/collections/${collectionId}`);
  revalidatePath("/");

  const keys = [
    getUploadedFileKey(collection.cover_image_url),
    ...content.map((release) => release.file_key),
  ].filter((key): key is string => key !== null);
  try {
    await deleteFiles(keys);
  } catch (error) {
    return {
      error: `Collection was deleted, but some stored files could not be removed: ${getErrorMessage(error, "S3 request failed.")}`,
    };
  }
  return { success: "Collection, releases, and stored files deleted." };
}

export async function refundCollectionSubscriptionPayment(paymentId: string): Promise<void> {
  await requireAdmin();
  const payment = await getCollectionSubscriptionPayment(paymentId);
  if (!payment || payment.status !== "captured") {
    throw new Error("Only captured collection subscription payments can be refunded.");
  }

  const claimed = await transitionCollectionSubscriptionPayment(payment, "refunding", "captured");
  const { error: refundError } = await refundRazorpayPayment(
    claimed.id,
    claimed.amount_paise,
    claimed.razorpay_mode,
  );
  if (refundError) {
    await transitionCollectionSubscriptionPayment(claimed, "captured", "refunding");
    throw new Error(`Razorpay refund failed: ${refundError}`);
  }

  const [subscription, payments] = await Promise.all([
    getCollectionSubscriptionByGatewayId(claimed.subscription_id),
    getCollectionSubscriptionPayments(claimed.subscription_id),
  ]);
  if (!subscription) {
    throw new Error("Payment was refunded, but its collection subscription record could not be found.");
  }
  const updatedSubscription = getSubscriptionAccessAfterRefund(
    subscription,
    payments,
    claimed.id,
  );
  await saveCollectionSubscription(updatedSubscription, {
    payment: { ...claimed, status: "refunded" },
  });
  revalidatePath("/admin/collections");
  revalidatePath(`/admin/collections/${claimed.collection_id}`);
  revalidatePath("/admin/analytics");
  revalidatePath("/my-library");
}
