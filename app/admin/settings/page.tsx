import AdminPageHeader from "../../../components/admin/AdminPageHeader";
import AdminShell from "../../../components/admin/AdminShell";
import SettingsForm from "../../../components/admin/SettingsForm";
import { createAdminClient, requireAdmin } from "../../../lib/supabase-server";

const defaultSettings = {
  site_name: "FYNLOP",
  tagline: "Stories Beyond Reality",
  logo_url: null,
  support_email: "hello@fynlop.com",
  razorpay_mode: "test" as const,
  maintenance_mode: false,
};

export default async function AdminSettingsPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from("admin_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(`Could not load settings: ${error.message}`);

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? null;
  const secretConfigured = Boolean(process.env.RAZORPAY_KEY_SECRET);
  const testKeyId = process.env.RAZORPAY_TEST_KEY_ID ?? null;
  const testSecretConfigured = Boolean(process.env.RAZORPAY_TEST_KEY_SECRET);
  const liveKeyId = process.env.RAZORPAY_LIVE_KEY_ID ?? null;
  const liveSecretConfigured = Boolean(process.env.RAZORPAY_LIVE_KEY_SECRET);
  return (
    <AdminShell>
      <AdminPageHeader eyebrow="CONFIGURATION" title="Settings" description="Manage your storefront identity and payment behavior." />
      <SettingsForm
        settings={data ?? defaultSettings}
        keyId={keyId}
        secretConfigured={secretConfigured}
        testKeyId={testKeyId}
        testSecretConfigured={testSecretConfigured}
        liveKeyId={liveKeyId}
        liveSecretConfigured={liveSecretConfigured}
      />
    </AdminShell>
  );
}
