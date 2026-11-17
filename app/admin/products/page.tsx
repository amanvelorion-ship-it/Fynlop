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
        eyebrow="ARCHIVE"
        title="Legacy editions"
        description={`${products.length} editions from the retired one-time checkout model. New releases belong to a collection.`}
      />
      <ProductsTable products={products} />
    </AdminShell>
  );
}
