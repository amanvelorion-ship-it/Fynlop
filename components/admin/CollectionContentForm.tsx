"use client";

import { useActionState, useState } from "react";
import { createCollectionContent, type CollectionActionState } from "../../app/admin/collections/actions";

export default function CollectionContentForm({ collectionId }: { collectionId: string }) {
  const [state, action, pending] = useActionState<CollectionActionState, FormData>(
    createCollectionContent,
    {},
  );
  const [releaseMode, setReleaseMode] = useState<"now" | "schedule" | "draft">("now");
  const [releaseLocal, setReleaseLocal] = useState("");
  const releaseAtUtc = releaseLocal ? new Date(releaseLocal).toISOString() : "";

  return (
    <form action={action} className="admin-collection-form">
      <input type="hidden" name="collection_id" value={collectionId} />
      <input type="hidden" name="release_at_utc" value={releaseAtUtc} />
      <div className="admin-setting-panel">
        <h2>Add a chapter, episode, issue, or volume</h2>
        <div className="admin-form-grid">
          <label>
            Release type
            <select className="admin-select" name="kind" defaultValue="chapter">
              <option value="chapter">Chapter</option>
              <option value="episode">Episode</option>
              <option value="issue">Issue</option>
              <option value="volume">Volume</option>
            </select>
          </label>
          <label>
            Publish
            <select
              className="admin-select"
              name="release_mode"
              value={releaseMode}
              onChange={(event) => setReleaseMode(event.target.value as "now" | "schedule" | "draft")}
            >
              <option value="now">Immediately</option>
              <option value="schedule">Schedule</option>
              <option value="draft">Save as draft</option>
            </select>
          </label>
          <label className="wide">
            Release title
            <input className="admin-input" name="title" required maxLength={150} />
          </label>
          <label className="wide">
            Description
            <textarea className="admin-textarea" name="description" maxLength={5000} />
          </label>
          {releaseMode === "schedule" && (
            <label className="wide">
              Release date and time (your local time)
              <input
                className="admin-input"
                type="datetime-local"
                required
                value={releaseLocal}
                onChange={(event) => setReleaseLocal(event.target.value)}
              />
            </label>
          )}
          <label className="admin-upload wide">
            Private PDF release (max 50 MB)
            <input name="file" type="file" accept="application/pdf,.pdf" required />
          </label>
        </div>
        <p className="admin-muted">Subscribers can access published releases from the release date onward.</p>
      </div>
      {state.error && <p className="admin-error" role="alert">{state.error}</p>}
      {state.success && <p className="admin-message" role="status">{state.success}</p>}
      <button className="admin-button admin-button-primary" disabled={pending}>
        {pending ? "Uploading release…" : "Add release"}
      </button>
    </form>
  );
}
