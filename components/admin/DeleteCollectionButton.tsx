"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCollection } from "../../app/admin/collections/actions";

export default function DeleteCollectionButton({
  collectionId,
  title,
}: {
  collectionId: string;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function remove() {
    if (!window.confirm(`Permanently delete “${title}”, all its releases, and its cancelled subscription records? This cannot be undone. Active subscriptions, paid access, or billing payments prevent deletion.`)) {
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        const result = await deleteCollection(collectionId);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.replace("/admin/collections");
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not delete collection.");
      }
    });
  }

  return (
    <div>
      <button
        className="admin-button admin-button-danger"
        type="button"
        onClick={remove}
        disabled={pending}
      >
        <Trash2 size={15} /> {pending ? "Deleting…" : "Delete collection"}
      </button>
      {error && <p className="admin-error" role="alert">{error}</p>}
    </div>
  );
}
