"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_EMAIL,
  createAdminClient,
  createCookieClient,
  requireAdmin,
} from "../../lib/supabase-server";
import { refundRazorpayPayment } from "../../lib/razorpay";
import { parseStoragePath } from "../../lib/storage";
import type { ProductCategory } from "../../types";

export type AdminLoginState = { error?: string };
export type AdminActionState = AdminLoginState & { success?: string };

export async function signInAdmin(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (email !== ADMIN_EMAIL) {
    redirect("/");
  }
  if (!password) {
    return { error: "Enter your password to continue." };
  }
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { error: "Supabase is not configured. Add its URL and anon key to .env.local." };
  }

  const supabase = await createCookieClient(true);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || data.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    return { error: "The email or password is incorrect." };
  }

  redirect("/admin/dashboard");
}

export async function signOutAdmin() {
  const supabase = await createCookieClient(true);
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(`Could not sign out: ${error.message}`);
  }
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

  const admin = createAdminClient();
  const { error } = await admin.from("products").update({
    title,
    description,
    category: category as ProductCategory,
    price_inr: Math.round(priceInr),
    price_usd: Number(priceUsd.toFixed(2)),
    author: author || "FYNLOP Creator",
    pages,
  }).eq("id", id);

  if (error) return { error: `Could not update product: ${error.message}` };
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/shop/${id}`);
  return { success: "Product updated." };
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: product, error: loadError } = await admin
    .from("products")
    .select("id, cover_image_url, file_url, preview_images")
    .eq("id", id)
    .maybeSingle();
  if (loadError) return { error: `Could not load product: ${loadError.message}` };
  if (!product) return { error: "This product no longer exists." };

  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) return { error: `Could not delete product: ${error.message}` };

  const coverPaths = [product.cover_image_url, ...product.preview_images]
    .map((url) => {
      try {
        const path = new URL(url).pathname.split("/storage/v1/object/public/product-covers/")[1];
        return path ? decodeURIComponent(path) : null;
      } catch {
        return null;
      }
    })
    .filter((path): path is string => Boolean(path));
  const filePath = parseStoragePath(product.file_url);
  const cleanupResults = await Promise.all([
    ...(coverPaths.length
      ? [admin.storage.from("product-covers").remove(coverPaths)]
      : []),
    ...(filePath?.bucket === "digital-editions"
      ? [admin.storage.from("digital-editions").remove([filePath.path])]
      : []),
  ]);
  const cleanupError = cleanupResults.find((result) => result.error)?.error;
  if (cleanupError) {
    return { error: `Product deleted, but a storage file could not be removed: ${cleanupError.message}` };
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
  return { success: "Product and its stored files deleted." };
}

export async function setProductFeatured(id: string, featured: boolean) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("products").update({ featured }).eq("id", id);
  if (error) return { error: `Could not update featured status: ${error.message}` };
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");
  return { success: "Featured status updated." };
}

export async function setUserBlocked(userId: string, blocked: boolean) {
  const { user: adminUser } = await requireAdmin();
  if (userId === adminUser.id) {
    return { error: "You cannot block the active administrator account." };
  }
  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin.auth.admin.getUserById(userId);
  if (targetError) return { error: `Could not load user account: ${targetError.message}` };
  if (target.user.email?.toLowerCase() === ADMIN_EMAIL) {
    return { error: "The administrator account cannot be blocked." };
  }
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: blocked ? "876000h" : "none",
  });
  if (error) return { error: `Could not update account status: ${error.message}` };
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

  const admin = createAdminClient();
  const { error } = await admin.from("admin_settings").update({
    site_name: siteName,
    tagline,
    support_email: supportEmail,
    razorpay_mode: mode === "live" ? "live" : "test",
    maintenance_mode: maintenanceMode,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) return { error: `Could not save settings: ${error.message}` };
  revalidatePath("/admin/settings");
  return { success: "Settings saved." };
}

export async function refundOrder(orderId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, payment_id, amount, status, razorpay_mode")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) return { error: `Could not load order: ${orderError.message}` };
  if (!order || order.status !== "paid") {
    return { error: "Only paid orders can be refunded." };
  }

  const { data: claimedOrder, error: claimError } = await admin
    .from("orders")
    .update({ status: "refunding" })
    .eq("id", order.id)
    .eq("status", "paid")
    .select("id")
    .maybeSingle();
  if (claimError) return { error: `Could not reserve this refund: ${claimError.message}` };
  if (!claimedOrder) return { error: "This order is already being refunded or is no longer paid." };

  const { error: refundError } = await refundRazorpayPayment(
    order.payment_id,
    order.amount * 100,
    order.razorpay_mode,
  );
  if (refundError) {
    const { error: rollbackError } = await admin
      .from("orders")
      .update({ status: "paid" })
      .eq("id", order.id)
      .eq("status", "refunding");
    if (rollbackError) {
      return { error: `Razorpay refund failed: ${refundError}. Could not restore the order status: ${rollbackError.message}` };
    }
    return { error: `Razorpay refund failed: ${refundError}` };
  }

  const { error: updateError } = await admin
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", order.id)
    .eq("status", "refunding");
  if (updateError) {
    return { error: `The payment was refunded, but the order status could not be updated: ${updateError.message}` };
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
  const pdfHeader = new Uint8Array(await pdf.slice(0, 5).arrayBuffer());
  if (new TextDecoder().decode(pdfHeader) !== "%PDF-") {
    return { error: "The selected digital edition is not a valid PDF file." };
  }

  const id = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
  if (!id) return { error: "The product title must contain letters or numbers." };

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("products")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (existingError) return { error: `Could not check product ID: ${existingError.message}` };
  if (existing) return { error: "A product with this title already exists. Choose a unique title." };

  const productId = `${id}-${crypto.randomUUID().slice(0, 8)}`;
  const coverPath = `${productId}/cover.${cover.type.split("/")[1].replace("jpeg", "jpg")}`;
  const pdfPath = `${productId}/edition.pdf`;
  const previewFiles = previews.filter(
    (file): file is File => file instanceof File && file.size > 0,
  );
  const uploadedPaths: { bucket: string; path: string }[] = [];

  const coverUpload = await admin.storage.from("product-covers").upload(coverPath, cover, {
    contentType: cover.type,
    upsert: false,
  });
  if (coverUpload.error) return { error: `Cover upload failed: ${coverUpload.error.message}` };
  uploadedPaths.push({ bucket: "product-covers", path: coverPath });

  const pdfUpload = await admin.storage.from("digital-editions").upload(pdfPath, pdf, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (pdfUpload.error) {
    const cleanup = await admin.storage.from("product-covers").remove([coverPath]);
    return {
      error: cleanup.error
        ? `PDF upload failed: ${pdfUpload.error.message}. Cover cleanup failed: ${cleanup.error.message}`
        : `PDF upload failed: ${pdfUpload.error.message}`,
    };
  }
  uploadedPaths.push({ bucket: "digital-editions", path: pdfPath });

  const previewUrls: string[] = [];
  for (let index = 0; index < previewFiles.length; index += 1) {
    const file = previewFiles[index];
    const extension = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${productId}/preview-${index + 1}.${extension}`;
    const upload = await admin.storage.from("product-covers").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upload.error) {
      const cleanup = await Promise.all(
        uploadedPaths.map(({ bucket, path: uploadedPath }) =>
          admin.storage.from(bucket).remove([uploadedPath]),
        ),
      );
      const cleanupError = cleanup.find((result) => result.error)?.error;
      return {
        error: cleanupError
          ? `Preview upload failed: ${upload.error.message}. Storage cleanup failed: ${cleanupError.message}`
          : `Preview upload failed: ${upload.error.message}`,
      };
    }
    uploadedPaths.push({ bucket: "product-covers", path });
    previewUrls.push(admin.storage.from("product-covers").getPublicUrl(path).data.publicUrl);
  }

  const coverUrl = admin.storage.from("product-covers").getPublicUrl(coverPath).data.publicUrl;
  const { error: insertError } = await admin.from("products").insert({
    id: productId,
    title,
    description,
    category: category as ProductCategory,
    price_inr: Math.round(priceInr),
    price_usd: Number(priceUsd.toFixed(2)),
    author: author || "FYNLOP Creator",
    pages,
    featured,
    cover_image_url: coverUrl,
    file_url: pdfPath,
    preview_images: previewUrls,
  });

  if (insertError) {
    const cleanup = await Promise.all(
      uploadedPaths.map(({ bucket, path }) => admin.storage.from(bucket).remove([path])),
    );
    const cleanupError = cleanup.find((result) => result.error)?.error;
    return {
      error: cleanupError
        ? `Product save failed: ${insertError.message}. Storage cleanup failed: ${cleanupError.message}`
        : `Product save failed: ${insertError.message}`,
    };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");
  return { success: `Created “${title}”.`, productId };
}

export async function uploadAdminLogo(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState & { success?: string }> {
  await requireAdmin();
  const file = formData.get("logo");
  if (
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > 3 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  ) {
    return { error: "Choose a JPG, PNG, or WebP logo smaller than 3 MB." };
  }

  const admin = createAdminClient();
  const path = `brand/logo.${file.type.split("/")[1].replace("jpeg", "jpg")}`;
  const { error: uploadError } = await admin.storage
    .from("product-covers")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) return { error: `Logo upload failed: ${uploadError.message}` };
  const logoUrl = admin.storage.from("product-covers").getPublicUrl(path).data.publicUrl;
  const { error: settingsError } = await admin.from("admin_settings").update({
    logo_url: logoUrl,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (settingsError) return { error: `Logo uploaded, but settings could not be saved: ${settingsError.message}` };

  revalidatePath("/admin/settings");
  return { success: "Logo uploaded." };
}
