"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { createProduct, type AdminLoginState } from "../../app/admin/actions";

type SignedUpload = { key: string; url: string; contentType: string };
type SignedUploadSet = {
  productId: string;
  cover: SignedUpload;
  pdf: SignedUpload;
  previews: SignedUpload[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSignedUpload(value: unknown): value is SignedUpload {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.url === "string" &&
    typeof value.contentType === "string"
  );
}

function isSignedUploadSet(value: unknown): value is SignedUploadSet {
  return (
    isRecord(value) &&
    typeof value.productId === "string" &&
    isSignedUpload(value.cover) &&
    isSignedUpload(value.pdf) &&
    Array.isArray(value.previews) &&
    value.previews.every(isSignedUpload)
  );
}

async function responseError(response: Response, action: string): Promise<string> {
  const text = await response.text();
  try {
    const payload: unknown = JSON.parse(text);
    if (isRecord(payload) && typeof payload.error === "string") return payload.error;
  } catch {
    return `${action} failed (HTTP ${response.status}).`;
  }
  return `${action} failed (HTTP ${response.status}).`;
}

async function uploadFile(file: File, upload: SignedUpload): Promise<void> {
  let response: Response;
  try {
    response = await fetch(upload.url, {
      method: "PUT",
      headers: { "Content-Type": upload.contentType },
      body: file,
    });
  } catch {
    throw new Error(`Could not reach storage while uploading ${file.name}. Check the bucket CORS setup and retry.`);
  }
  if (!response.ok) {
    throw new Error(`Could not upload ${file.name} to storage (HTTP ${response.status}).`);
  }
}

export default function ProductForm() {
  const [state, setState] = useState<AdminLoginState & { success?: string; productId?: string }>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const cover = formData.get("cover");
    const pdf = formData.get("pdf");
    const previews = formData.getAll("previews").filter(
      (file): file is File => file instanceof File && file.size > 0,
    );
    formData.delete("cover");
    formData.delete("pdf");
    formData.delete("previews");

    if (!(cover instanceof File) || !(pdf instanceof File)) {
      setState({ error: "Select a cover image and PDF edition before uploading." });
      return;
    }

    startTransition(async () => {
      setState({});
      let productId = "";
      try {
        const prepareResponse = await fetch("/api/admin/product-uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            cover: { size: cover.size, type: cover.type },
            pdf: { size: pdf.size, type: pdf.type },
            previews: previews.map((file) => ({ size: file.size, type: file.type })),
          }),
        });
        if (!prepareResponse.ok) {
          throw new Error(await responseError(prepareResponse, "Could not prepare uploads"));
        }
        const payload: unknown = await prepareResponse.json();
        if (!isSignedUploadSet(payload)) {
          throw new Error("The upload service returned an invalid response. Please try again.");
        }
        productId = payload.productId;

        const uploadResults = await Promise.allSettled([
          uploadFile(cover, payload.cover),
          uploadFile(pdf, payload.pdf),
          ...previews.map((file, index) => {
            const upload = payload.previews[index];
            if (!upload) throw new Error("The upload service did not prepare a preview upload.");
            return uploadFile(file, upload);
          }),
        ]);
        const failedUpload = uploadResults.find(
          (result): result is PromiseRejectedResult => result.status === "rejected",
        );
        if (failedUpload) throw failedUpload.reason;

        formData.set("product_id", payload.productId);
        formData.set("cover_key", payload.cover.key);
        formData.set("pdf_key", payload.pdf.key);
        payload.previews.forEach((upload) => formData.append("preview_key", upload.key));

        const result = await createProduct({}, formData);
        if (result.error) throw new Error(result.error);
        setState(result);
        form.reset();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Product upload failed.";
        if (productId) {
          try {
            const cleanupResponse = await fetch("/api/admin/product-uploads", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId }),
            });
            if (cleanupResponse.status === 409) {
              setState({ error: `${message} The product may already be saved. Check the product list before retrying.` });
              return;
            }
            if (!cleanupResponse.ok) {
              throw new Error(await responseError(cleanupResponse, "Upload cleanup failed"));
            }
          } catch {
            setState({ error: `${message} Incomplete files may remain in storage; please contact support if the problem continues.` });
            return;
          }
        }
        setState({ error: message });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="admin-product-form" aria-busy={pending}>
      <div className="admin-setting-panel">
        <div className="admin-form-grid">
          <label className="wide">Title<input className="admin-input" name="title" required maxLength={100} /></label>
          <label className="wide">Description<textarea className="admin-textarea" name="description" required maxLength={5000} /></label>
          <label>Category
            <select className="admin-select" name="category" defaultValue="Comics">
              <option>Comics</option><option>Books</option><option>Manga</option>
            </select>
          </label>
          <label>Author<input className="admin-input" name="author" required maxLength={120} /></label>
          <label>Price (INR)<input className="admin-input" name="price_inr" type="number" min="1" step="1" required /></label>
          <label>Pages<input className="admin-input" name="pages" type="number" min="1" step="1" required /></label>
          <label className="admin-switch-row">
            <input type="checkbox" name="featured" />
            Mark as featured
          </label>
        </div>
      </div>
      <div className="admin-setting-panel">
        <h2>Cover and digital edition</h2>
        <div className="admin-form-grid">
          <label className="admin-upload">Cover image (JPG, PNG, WebP · 1600 × 2400 px recommended · max 3 MB)
            <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" required />
          </label>
          <label className="admin-upload">PDF edition (max 50 MB)
            <input name="pdf" type="file" accept="application/pdf,.pdf" required />
          </label>
          <label className="admin-upload wide">Preview pages (up to 3 · portrait 1200 × 1800 px recommended · max 2 MB each)
            <input name="previews" type="file" accept="image/jpeg,image/png,image/webp" multiple />
          </label>
        </div>
        <p className="admin-muted">Set a one-time INR price. Files upload directly to secure storage; the PDF stays private and is added to a customer&apos;s library only after payment is verified.</p>
      </div>
      {state.error && <p className="admin-error" role="alert">{state.error}</p>}
      {state.success && (
        <p className="admin-message" role="status">
          {state.success} <Link href="/admin/products">View products <ArrowRight size={14} /></Link>
        </p>
      )}
      <button className="admin-button admin-button-primary" disabled={pending}>
        {pending ? "Uploading and saving…" : "Create product"}
      </button>
    </form>
  );
}
