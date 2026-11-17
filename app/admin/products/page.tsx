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
        eyebrow="CATALOG"
        title="Products"
        description={`${products.length} stories in your catalog`}
        action={<Link className="admin-button admin-button-primary" href="/admin/products/new"><Plus size={15} /> Add product</Link>}
      />
      <ProductsTable products={products} />
    </AdminShell>
  );
}
