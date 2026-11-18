import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import AdminPageHeader from "../../../../components/admin/AdminPageHeader";
import AdminShell from "../../../../components/admin/AdminShell";
import ProductForm from "../../../../components/admin/ProductForm";
import { requireAdmin } from "../../../../lib/auth";

export default async function NewStandaloneProductPage() {
  await requireAdmin();
  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="ONE-TIME SALES"
        title="Add a standalone book"
        description="Upload a complete book for one-time purchase. Collection releases are managed separately."
        action={<Link className="admin-button" href="/admin/products"><ArrowLeft size={15} /> Books</Link>}
      />
      <ProductForm />
    </AdminShell>
  );
}
