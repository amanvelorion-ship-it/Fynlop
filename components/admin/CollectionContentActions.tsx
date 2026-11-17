"use client";

import { useState } from "react";
import { setCollectionContentPublication } from "../../app/admin/collections/actions";

export default function CollectionContentActions({
  collectionId,
  contentId,
  published,
}: {
  collectionId: string;
  contentId: string;
  published: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function update(action: "publish-now" | "draft") {
    setBusy(true);
    setError("");
    try {
      const result = await setCollectionContentPublication(collectionId, contentId, action);
      if (result.error) throw new Error(result.error);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update release.");
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
      {error && <span className="admin-error" role="alert">{error}</span>}
    </div>
  );
}
