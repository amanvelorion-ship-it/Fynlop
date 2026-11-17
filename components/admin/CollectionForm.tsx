"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useActionState } from "react";
import {
  createCollection,
  updateCollection,
  type CollectionActionState,
} from "../../app/admin/collections/actions";
import type { Collection } from "../../types";

export default function CollectionForm({ collection }: { collection?: Collection }) {
  const actionFunction = collection ? updateCollection : createCollection;
  const [state, action, pending] = useActionState<CollectionActionState, FormData>(
    actionFunction,
    {},
  );

  return (
    <form action={action} className="admin-collection-form">
      {collection && <input type="hidden" name="id" value={collection.id} />}
      <div className="admin-setting-panel">
        <h2>Collection details</h2>
        <div className="admin-form-grid">
          <label className="wide">
            Collection name
            <input
              className="admin-input"
              name="title"
              defaultValue={collection?.title}
              required
              maxLength={100}
            />
          </label>
          <label className="wide">
            Description
            <textarea
              className="admin-textarea"
              name="description"
              defaultValue={collection?.description}
              required
              maxLength={5000}
            />
          </label>
          <label>
            Monthly price (INR)
            <input
              className="admin-input"
              name="monthly_price_inr"
              type="number"
              min="1"
              step="0.01"
              defaultValue={collection ? (collection.monthly_price_paise / 100).toFixed(2) : ""}
              required
            />
          </label>
          <label>
            Availability
            <select className="admin-select" name="status" defaultValue={collection?.status ?? "draft"}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="admin-upload wide">
            Cover image (JPG, PNG, WebP · max 3 MB)
            <input
              name="cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required={!collection}
            />
          </label>
        </div>
        <p className="admin-muted">
          Each collection has one monthly Razorpay plan. Price changes apply to new subscriptions; existing subscribers keep their authorized price.
        </p>
      </div>
      {state.error && <p className="admin-error" role="alert">{state.error}</p>}
      {state.success && (
        <p className="admin-message" role="status">
          {state.success}{" "}
          {state.collectionId && (
            <Link href={`/admin/collections/${state.collectionId}`}>
              Manage content <ArrowRight size={14} />
            </Link>
          )}
        </p>
      )}
      <button className="admin-button admin-button-primary" disabled={pending}>
        {pending ? "Saving collection…" : collection ? "Save collection" : "Create collection"}
      </button>
    </form>
  );
}
