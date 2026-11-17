"use client";

import { useActionState, useState } from "react";
import { saveAdminSettings, type AdminActionState } from "../../app/admin/actions";
import type { AdminSettings } from "../../types";

export default function SettingsForm({
  settings,
  keyId,
  secretConfigured,
  testKeyId,
  testSecretConfigured,
  liveKeyId,
  liveSecretConfigured,
  testWebhookConfigured,
  liveWebhookConfigured,
}: {
  settings: AdminSettings;
  keyId: string | null;
  secretConfigured: boolean;
  testKeyId: string | null;
  testSecretConfigured: boolean;
  liveKeyId: string | null;
  liveSecretConfigured: boolean;
  testWebhookConfigured: boolean;
  liveWebhookConfigured: boolean;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(saveAdminSettings, {});
  const [mode, setMode] = useState(settings.razorpay_mode);
  const activeKeyId = mode === "live" ? liveKeyId : testKeyId ?? keyId;
  const activeSecretConfigured = mode === "live" ? liveSecretConfigured : testSecretConfigured || secretConfigured;
  const maskedKey = activeKeyId
    ? `${"•".repeat(Math.max(0, activeKeyId.length - 4))}${activeKeyId.slice(-4)}`
    : "Not configured";

  return (
    <form action={action} className="admin-setting-panel">
      <h2>Store identity</h2>
      <div className="admin-settings-grid">
        <label>Site name<input className="admin-input" name="site_name" defaultValue={settings.site_name} required maxLength={80} /></label>
        <label>Tagline<input className="admin-input" name="tagline" defaultValue={settings.tagline} required maxLength={160} /></label>
        <label className="wide">Support email<input className="admin-input" name="support_email" type="email" defaultValue={settings.support_email} required /></label>
        <label>Razorpay Key ID<input className="admin-input" value={maskedKey} readOnly aria-describedby="razorpay-env-note" /></label>
        <label>Razorpay Secret<input className="admin-input" value={activeSecretConfigured ? "••••••••••••••••••••" : "Not configured"} readOnly aria-describedby="razorpay-env-note" /></label>
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
      <p className="admin-muted">
        Subscription webhooks: test {testWebhookConfigured ? "configured" : "not configured"} · live {liveWebhookConfigured ? "configured" : "not configured"}.
        Set <code>RAZORPAY_TEST_WEBHOOK_SECRET</code> and <code>RAZORPAY_LIVE_WEBHOOK_SECRET</code> in server environment variables, then configure Razorpay to send subscription events to <code>https://www.fynlop.com/api/webhooks/razorpay</code>.
      </p>
      {state.error && <p className="admin-error" role="alert">{state.error}</p>}
      {state.success && <p className="admin-message" role="status">{state.success}</p>}
      <div className="admin-modal-footer">
        <button className="admin-button admin-button-primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
      </div>
    </form>
  );
}
