"use client";

import { ArrowDownToLine, LoaderCircle } from "lucide-react";
import { useState } from "react";

export default function CollectionContentDownloadButton({
  collectionId,
  contentId,
}: {
  collectionId: string;
  contentId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/collections/${encodeURIComponent(collectionId)}/content/${encodeURIComponent(contentId)}/download`,
        { method: "POST" },
      );
      const payload = (await response.json()) as { signedUrl?: string; error?: string };
      if (!response.ok || !payload.signedUrl) {
        throw new Error(payload.error ?? "Could not prepare this release.");
      }
      window.location.assign(payload.signedUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not prepare this release.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="button button-gold" onClick={() => void download()} disabled={busy}>
        {busy ? "Preparing…" : "Read release"}
        {busy ? <LoaderCircle className="spin" size={16} /> : <ArrowDownToLine size={16} />}
      </button>
      {error && <p className="collection-download-error" role="alert">{error}</p>}
    </div>
  );
}
