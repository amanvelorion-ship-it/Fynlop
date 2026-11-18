import Link from "next/link";
import { Plus } from "lucide-react";
import AdminPageHeader from "../../../components/admin/AdminPageHeader";
import AdminShell from "../../../components/admin/AdminShell";
import ProductsTable from "../../../components/admin/ProductsTable";
import { fetchAdminProducts } from "../../../lib/admin-data";
import { requireAdmin } from "../../../lib/auth";

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await fetchAdminProducts();
  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="ONE-TIME SALES"
        title="Standalone books"
        description={`${products.length} books available for individual purchase and permanent library access.`}
        action={
          <Link className="admin-button admin-button-primary" href="/admin/products/new">
            <Plus size={15} /> Add book
          </Link>
        }
      />
      <ProductsTable products={products} />
    </AdminShell>
  );
}
