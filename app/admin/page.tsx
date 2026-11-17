import Image from "next/image";
import Link from "next/link";
import AdminLoginForm from "../../components/admin/AdminLoginForm";

export default function AdminLoginPage() {
  const awsConfigured = Boolean(
    process.env.AWS_COGNITO_USER_POOL_ID &&
    process.env.AWS_COGNITO_CLIENT_ID &&
    process.env.ADMIN_EMAIL,
  );
  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <Link className="admin-brand" href="/" aria-label="FYNLOP home">
          <Image src="/FYNLOP_ LOGO.png" alt="FYNLOP" width={220} height={90} priority />
        </Link>
        <p className="admin-eyebrow">STORIES BEYOND REALITY</p>
        <h1>Admin sign in</h1>
        <p className="admin-muted">Authorized FYNLOP administrators only.</p>
        {!awsConfigured && (
          <p className="admin-error" role="status">
            Configure the AWS Cognito user pool, client, and admin email before signing in.
          </p>
        )}
        <AdminLoginForm email={process.env.ADMIN_EMAIL ?? ""} />
      </section>
    </main>
  );
}
