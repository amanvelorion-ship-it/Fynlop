import Link from "next/link";
import AdminLoginForm from "../../components/admin/AdminLoginForm";

export default function AdminLoginPage() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <Link className="admin-brand" href="/">ϟ FYNLOP<span>.</span></Link>
        <p className="admin-eyebrow">STORIES BEYOND REALITY</p>
        <h1>Admin sign in</h1>
        <p className="admin-muted">Authorized FYNLOP administrators only.</p>
        {!supabaseConfigured && (
          <p className="admin-error" role="status">
            Configure the Supabase URL, anon key, and server-only service role key before signing in.
          </p>
        )}
        <AdminLoginForm />
      </section>
    </main>
  );
}
