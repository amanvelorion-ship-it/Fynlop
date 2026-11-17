import AdminPageHeader from "../../../components/admin/AdminPageHeader";
import AdminShell from "../../../components/admin/AdminShell";
import SettingsForm from "../../../components/admin/SettingsForm";
import { requireAdmin } from "../../../lib/auth";
import { getStoreSettings } from "../../../lib/dynamodb";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getStoreSettings();

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? null;
  const secretConfigured = Boolean(process.env.RAZORPAY_KEY_SECRET);
  const testKeyId = process.env.RAZORPAY_TEST_KEY_ID ?? null;
  const testSecretConfigured = Boolean(process.env.RAZORPAY_TEST_KEY_SECRET);
  const liveKeyId = process.env.RAZORPAY_LIVE_KEY_ID ?? null;
  const liveSecretConfigured = Boolean(process.env.RAZORPAY_LIVE_KEY_SECRET);
  const testWebhookConfigured = Boolean(process.env.RAZORPAY_TEST_WEBHOOK_SECRET);
  const liveWebhookConfigured = Boolean(process.env.RAZORPAY_LIVE_WEBHOOK_SECRET);
  return (
    <AdminShell>
      <AdminPageHeader eyebrow="CONFIGURATION" title="Settings" description="Manage your storefront identity and payment behavior." />
      <SettingsForm
        settings={settings}
        keyId={keyId}
        secretConfigured={secretConfigured}
        testKeyId={testKeyId}
        testSecretConfigured={testSecretConfigured}
        liveKeyId={liveKeyId}
        liveSecretConfigured={liveSecretConfigured}
        testWebhookConfigured={testWebhookConfigured}
        liveWebhookConfigured={liveWebhookConfigured}
      />
    </AdminShell>
  );
}
