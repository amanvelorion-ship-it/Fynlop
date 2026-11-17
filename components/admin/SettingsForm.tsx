"use client";

import { useActionState, useState } from "react";
import {
  saveAdminSettings,
  uploadAdminLogo,
  type AdminActionState,
} from "../../app/admin/actions";

type Settings = {
  site_name: string;
  tagline: string;
  logo_url: string | null;
  support_email: string;
  razorpay_mode: "test" | "live";
  maintenance_mode: boolean;
};

export default function SettingsForm({
  settings,
  keyId,
  secretConfigured,
  testKeyId,
  testSecretConfigured,
  liveKeyId,
  liveSecretConfigured,
}: {
  settings: Settings;
  keyId: string | null;
  secretConfigured: boolean;
  testKeyId: string | null;
  testSecretConfigured: boolean;
  liveKeyId: string | null;
  liveSecretConfigured: boolean;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(saveAdminSettings, {});
  const [logoState, logoAction, logoPending] = useActionState(uploadAdminLogo, {});
  const [mode, setMode] = useState(settings.razorpay_mode);
  const activeKeyId = mode === "live" ? liveKeyId : testKeyId ?? keyId;
  const activeSecretConfigured = mode === "live" ? liveSecretConfigured : testSecretConfigured || secretConfigured;
  const maskedKey = activeKeyId
    ? `${"•".repeat(Math.max(0, activeKeyId.length - 4))}${activeKeyId.slice(-4)}`
    : "Not configured";

  return (
    <div className="admin-settings-form">
      <form action={action} className="admin-setting-panel">
        <h2>Store identity</h2>
        <div className="admin-settings-grid">
          <label>Site name<input className="admin-input" name="site_name" defaultValue={settings.site_name} required maxLength={80} /></label>
          <label>Tagline<input className="admin-input" name="tagline" defaultValue={settings.tagline} required maxLength={160} /></label>
          <label className="wide">Support email<input className="admin-input" name="support_email" type="email" defaultValue={settings.support_email} required /></label>
        </div>
        <input type="hidden" name="razorpay_mode" value={settings.razorpay_mode} />
        <input type="hidden" name="maintenance_mode" value={settings.maintenance_mode ? "on" : ""} />
        {state.error && <p className="admin-error" role="alert">{state.error}</p>}
        {state.success && <p className="admin-message" role="status">{state.success}</p>}
        <div className="admin-modal-footer">
          <button className="admin-button admin-button-primary" disabled={pending}>{pending ? "Saving…" : "Save identity"}</button>
        </div>
      </form>

      <section className="admin-setting-panel">
        <h2>Brand logo</h2>
        {settings.logo_url && (
          <div className="admin-logo-preview" role="img" aria-label="Current site logo" style={{ backgroundImage: `url("${settings.logo_url}")` }} />
        )}
        <form action={logoAction} className="admin-logo-form">
          <label className="admin-upload">Upload a JPG, PNG, or WebP logo (max 3 MB)
            <input name="logo" type="file" accept="image/jpeg,image/png,image/webp" required />
          </label>
          {logoState.error && <p className="admin-error" role="alert">{logoState.error}</p>}
          {logoState.success && <p className="admin-message" role="status">{logoState.success}</p>}
          <button className="admin-button" disabled={logoPending}>{logoPending ? "Uploading…" : "Upload logo"}</button>
        </form>
      </section>

      <form action={action} className="admin-setting-panel">
        <h2>Payments and availability</h2>
        <div className="admin-settings-grid">
          <label>Razorpay Key ID
            <input className="admin-input" value={maskedKey} readOnly aria-describedby="razorpay-env-note" />
          </label>
          <label>Razorpay Secret
            <input className="admin-input" value={activeSecretConfigured ? "••••••••••••••••••••" : "Not configured"} readOnly aria-describedby="razorpay-env-note" />
          </label>
          <label>Payment mode
            <select className="admin-select" name="razorpay_mode" value={mode} onChange={(event) => setMode(event.target.value as "test" | "live")}>
              <option value="test">Test mode</option><option value="live">Live mode</option>
            </select>
          </label>
          <label className="admin-switch-row">
            <input type="checkbox" name="maintenance_mode" defaultChecked={settings.maintenance_mode} />
            Maintenance mode
          </label>
        </div>
        <p className="admin-muted" id="razorpay-env-note">
          {activeSecretConfigured ? "Credentials are configured for this mode." : "Credentials for this mode are not configured."}
          {" "}Payment secrets stay in server environment variables and are never saved in the database.
        </p>
        <input type="hidden" name="site_name" value={settings.site_name} />
        <input type="hidden" name="tagline" value={settings.tagline} />
        <input type="hidden" name="support_email" value={settings.support_email} />
        {state.error && <p className="admin-error" role="alert">{state.error}</p>}
        {state.success && <p className="admin-message" role="status">{state.success}</p>}
        <div className="admin-modal-footer">
          <button className="admin-button admin-button-primary" disabled={pending}>{pending ? "Saving…" : "Save payment settings"}</button>
        </div>
      </form>
    </div>
  );
}
