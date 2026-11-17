import Link from "next/link";
import AdminPageHeader from "../../../../components/admin/AdminPageHeader";
import AdminShell from "../../../../components/admin/AdminShell";
import ProductForm from "../../../../components/admin/ProductForm";
import { requireAdmin } from "../../../../lib/supabase-server";

export default async function NewProductPage() {
  await requireAdmin();
  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="CATALOG"
        title="Add a product"
        description="Publish a new comic, book, or manga edition."
        action={<Link className="admin-button" href="/admin/products">Back to products</Link>}
      />
      <ProductForm />
    </AdminShell>
  );
}
