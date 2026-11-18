"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteCollectionContent,
  setCollectionContentPublication,
} from "../../app/admin/collections/actions";

export default function CollectionContentActions({
  collectionId,
  contentId,
  title,
  published,
}: {
  collectionId: string;
  contentId: string;
  title: string;
  published: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  async function update(action: "publish-now" | "draft") {
    setBusy(true);
    setMessage("");
    try {
      const result = await setCollectionContentPublication(collectionId, contentId, action);
      setHasError(Boolean(result.error));
      setMessage(result.error ?? result.success ?? "");
    } catch (reason) {
      setHasError(true);
      setMessage(reason instanceof Error ? reason.message : "Could not update release.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMessage("");
    try {
      const result = await deleteCollectionContent(collectionId, contentId);
      setHasError(Boolean(result.error));
      setMessage(result.error ?? result.success ?? "");
    } catch (reason) {
      setHasError(true);
      setMessage(reason instanceof Error ? reason.message : "Could not remove release.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="collection-content-actions">
      <button
        className="admin-button"
        onClick={() => void update(published ? "draft" : "publish-now")}
        disabled={busy}
      >
        {busy ? "Saving…" : published ? "Save as draft" : "Publish now"}
      </button>
      <button
        className="admin-button admin-button-danger"
        onClick={() => {
          if (window.confirm(`Permanently remove “${title}” and its uploaded file? Published content remains protected while subscribers have paid access.`)) {
            void remove();
          }
        }}
        disabled={busy}
      >
        <Trash2 size={13} /> Delete
      </button>
      {message && (
        <span className={hasError ? "admin-error" : "admin-message"} role={hasError ? "alert" : "status"}>
          {message}
        </span>
      )}
    </div>
  );
}
