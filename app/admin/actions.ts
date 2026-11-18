"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authCookieName, requireAdmin } from "../../lib/auth";
import {
  getOrderById,
  hasProductOrderHistory,
  getProduct,
  getStoreSettings,
  deleteProduct as removeProduct,
  putProduct,
  saveStoreSettings,
  updateOrderStatus,
} from "../../lib/dynamodb";
import { setCognitoUserBlocked, signInWithCognito, getUserFromAccessToken } from "../../lib/cognito";
import { deleteFiles, getPublicFileUrl, getUploadedFileKey, uploadFile } from "../../lib/s3";
import { refundRazorpayPayment } from "../../lib/razorpay";
import type { Product, ProductCategory } from "../../types";

export type AdminLoginState = { error?: string };
export type AdminActionState = AdminLoginState & { success?: string };

function awsErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function signInAdmin(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail || email !== adminEmail) {
    return { error: "This account is not authorized to access the admin workspace." };
  }
  if (!password) return { error: "Enter your password to continue." };

  try {
    const session = await signInWithCognito(email, password);
    const user = await getUserFromAccessToken(session.accessToken);
    if (!user || user.email.toLowerCase() !== adminEmail) {
      return { error: "The email or password is incorrect." };
    }

    (await cookies()).set(authCookieName, session.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: session.expiresIn,
    });
  } catch (error) {
    return { error: `Could not sign in: ${awsErrorMessage(error, "AWS Cognito is unavailable.")}` };
  }

  redirect("/admin/dashboard");
}

export async function signOutAdmin() {
  (await cookies()).delete(authCookieName);
  redirect("/admin/login");
}

export async function updateProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const priceInr = Number(formData.get("price_inr"));
  const priceUsd = Number(formData.get("price_usd"));
  const author = String(formData.get("author") ?? "").trim();
  const pages = Number(formData.get("pages"));

  if (
    !id ||
    !title ||
    !description ||
    !["Comics", "Books", "Manga"].includes(category) ||
    !Number.isFinite(priceInr) ||
    priceInr <= 0 ||
    !Number.isFinite(priceUsd) ||
    priceUsd <= 0 ||
    !Number.isInteger(pages) ||
    pages < 0
  ) {
    return { error: "Check the product details and try again." };
  }

  try {
    const product = await getProduct(id);
    if (!product) return { error: "This product no longer exists." };
    await putProduct({
      ...product,
      title,
      description,
      category: category as ProductCategory,
      price_inr: Math.round(priceInr),
      price_usd: Number(priceUsd.toFixed(2)),
      author,
      pages,
    });
  } catch (error) {
    return { error: `Could not update product: ${awsErrorMessage(error, "DynamoDB request failed.")}` };
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/shop/${id}`);
  return { success: "Product updated." };
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  let product: Product;
  try {
    const existing = await getProduct(id);
    if (!existing) return { error: "This product no longer exists." };
    product = existing;
    if (await hasProductOrderHistory(id)) {
      return {
        error: "This book has order history and cannot be permanently deleted. Archive it to remove it from sale while preserving customers’ library access.",
      };
    }
    await removeProduct(id);
  } catch (error) {
    return { error: `Could not delete product: ${awsErrorMessage(error, "DynamoDB request failed.")}` };
  }

  const keys = [
    getUploadedFileKey(product.cover_image_url),
    getUploadedFileKey(product.file_url),
    ...(product.preview_images || []).map(getUploadedFileKey),
  ].filter((key): key is string => key !== null);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
  try {
    await deleteFiles(keys);
  } catch (error) {
    return {
      error: `Product deleted, but a stored file could not be removed: ${awsErrorMessage(error, "S3 request failed.")}`,
    };
  }

  return { success: "Product and its stored files deleted." };
}

export async function setProductArchived(id: string, archived: boolean) {
  await requireAdmin();
  try {
    const product = await getProduct(id);
    if (!product) return { error: "This product no longer exists." };
    await putProduct({ ...product, archived });
  } catch (error) {
    return { error: `Could not update sale status: ${awsErrorMessage(error, "DynamoDB request failed.")}` };
  }
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/shop/${id}`);
  revalidatePath("/api/products");
  revalidatePath("/");
  return { success: archived ? "Book archived from sale. Existing library access is unchanged." : "Book restored to sale." };
}

export async function setProductFeatured(id: string, featured: boolean) {
  await requireAdmin();
  try {
    const product = await getProduct(id);
    if (!product) return { error: "This product no longer exists." };
    await putProduct({ ...product, featured });
  } catch (error) {
    return { error: `Could not update featured status: ${awsErrorMessage(error, "DynamoDB request failed.")}` };
  }
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");
  return { success: "Featured status updated." };
}

export async function setUserBlocked(userId: string, blocked: boolean) {
  const admin = await requireAdmin();
  if (userId === admin.id) {
    return { error: "You cannot block the active administrator account." };
  }

  try {
    await setCognitoUserBlocked(userId, blocked);
  } catch (error) {
    return { error: `Could not update account status: ${awsErrorMessage(error, "Cognito request failed.")}` };
  }
  revalidatePath("/admin/users");
  return { success: blocked ? "User blocked." : "User unblocked." };
}

export async function saveAdminSettings(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const siteName = String(formData.get("site_name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const supportEmail = String(formData.get("support_email") ?? "").trim();
  const mode = String(formData.get("razorpay_mode") ?? "");
  const maintenanceMode = formData.get("maintenance_mode") === "on";

  if (
    !siteName ||
    !tagline ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail) ||
    !["test", "live"].includes(mode)
  ) {
    return { error: "Enter a site name, tagline, valid support email, and payment mode." };
  }

  try {
    const current = await getStoreSettings();
    await saveStoreSettings({
      ...current,
      site_name: siteName,
      tagline,
      support_email: supportEmail,
      razorpay_mode: mode === "live" ? "live" : "test",
      maintenance_mode: maintenanceMode,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    return { error: `Could not save settings: ${awsErrorMessage(error, "DynamoDB request failed.")}` };
  }
  revalidatePath("/admin/settings");
  return { success: "Settings saved." };
}

export async function refundOrder(orderId: string) {
  await requireAdmin();
  const order = await getOrderById(orderId);
  if (!order || order.status !== "paid") {
    return { error: "Only paid orders can be refunded." };
  }

  let claimedOrder;
  try {
    claimedOrder = await updateOrderStatus(order, "refunding", "paid");
  } catch (error) {
    return { error: `Could not reserve this refund: ${awsErrorMessage(error, "DynamoDB request failed.")}` };
  }

  const { error: refundError } = await refundRazorpayPayment(
    order.payment_id,
    order.amount * 100,
    order.razorpay_mode,
  );
  if (refundError) {
    try {
      await updateOrderStatus(claimedOrder, "paid", "refunding");
    } catch (rollbackError) {
      return {
        error: `Razorpay refund failed: ${refundError}. Could not restore the order status: ${awsErrorMessage(rollbackError, "DynamoDB request failed.")}`,
      };
    }
    return { error: `Razorpay refund failed: ${refundError}` };
  }

  try {
    await updateOrderStatus(claimedOrder, "refunded", "refunding");
  } catch (error) {
    return {
      error: `The payment was refunded, but the order status could not be updated: ${awsErrorMessage(error, "DynamoDB request failed.")}`,
    };
  }
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  return { success: "Refund issued." };
}

export async function createProduct(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState & { success?: string; productId?: string }> {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const priceInr = Number(formData.get("price_inr"));
  const priceUsd = Number(formData.get("price_usd"));
  const author = String(formData.get("author") ?? "").trim();
  const pages = Number(formData.get("pages"));
  const featured = formData.get("featured") === "on";
  const cover = formData.get("cover");
  const pdf = formData.get("pdf");
  const previews = formData.getAll("previews");

  if (
    !title ||
    title.length > 100 ||
    !description ||
    description.length > 5000 ||
    !author ||
    !["Comics", "Books", "Manga"].includes(category) ||
    !Number.isFinite(priceInr) ||
    priceInr <= 0 ||
    !Number.isFinite(priceUsd) ||
    priceUsd <= 0 ||
    !Number.isInteger(pages) ||
    pages < 1 ||
    !(cover instanceof File) ||
    cover.size === 0 ||
    cover.size > 3 * 1024 * 1024 ||
    !(pdf instanceof File) ||
    pdf.size === 0 ||
    pdf.size > 50 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(cover.type) ||
    pdf.type !== "application/pdf" ||
    previews.length > 3 ||
    previews.some(
      (file) =>
        !(file instanceof File) ||
        (file.size > 0 &&
          (file.size > 2 * 1024 * 1024 ||
            !["image/jpeg", "image/png", "image/webp"].includes(file.type))),
    )
  ) {
    return { error: "Check required fields and uploads. Covers must be images under 3 MB, previews under 2 MB, and PDFs under 50 MB." };
  }
  if (new TextDecoder().decode(new Uint8Array(await pdf.slice(0, 5).arrayBuffer())) !== "%PDF-") {
    return { error: "The selected digital edition is not a valid PDF file." };
  }

  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
  if (!slug) return { error: "The product title must contain letters or numbers." };

  const id = `${slug}-${randomUUID().slice(0, 8)}`;
  const extension = (type: string) => type.split("/")[1].replace("jpeg", "jpg");
  const coverKey = `covers/${id}/cover.${extension(cover.type)}`;
  const pdfKey = `pdfs/${id}/edition.pdf`;
  const previewFiles = previews.filter(
    (file): file is File => file instanceof File && file.size > 0,
  );
  const previewKeys = previewFiles.map(
    (file, index) => `previews/${id}/preview-${index + 1}.${extension(file.type)}`,
  );
  const uploadedKeys: string[] = [];

  try {
    await uploadFile(coverKey, cover, cover.type);
    uploadedKeys.push(coverKey);
    await uploadFile(pdfKey, pdf, "application/pdf");
    uploadedKeys.push(pdfKey);
    for (let index = 0; index < previewFiles.length; index += 1) {
      await uploadFile(previewKeys[index], previewFiles[index], previewFiles[index].type);
      uploadedKeys.push(previewKeys[index]);
    }

    const product: Product = {
      id,
      title,
      description,
      category: category as ProductCategory,
      price_inr: Math.round(priceInr),
      price_usd: Number(priceUsd.toFixed(2)),
      author,
      pages,
      featured,
      popularity: 0,
      created_at: new Date().toISOString(),
      cover_image_url: getPublicFileUrl(coverKey),
      file_url: pdfKey,
      preview_images: previewKeys.map(getPublicFileUrl),
    };
    await putProduct(product, true);
  } catch (error) {
    const message = awsErrorMessage(error, "The AWS request failed.");
    try {
      await deleteFiles(uploadedKeys);
    } catch (cleanupError) {
      return {
        error: `Product creation failed: ${message}. S3 cleanup failed: ${awsErrorMessage(cleanupError, "S3 request failed.")}`,
      };
    }
    return { error: `Product creation failed: ${message}` };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");
  return { success: `Created “${title}”.`, productId: id };
}
