import AdminPageHeader from "../../../components/admin/AdminPageHeader";
import AdminShell from "../../../components/admin/AdminShell";
import OrdersTable from "../../../components/admin/OrdersTable";
import { fetchAdminOrders } from "../../../lib/admin-data";
import { requireAdmin } from "../../../lib/supabase-server";

export default async function AdminOrdersPage() {
  await requireAdmin();
  const orders = await fetchAdminOrders();
  return (
    <AdminShell>
      <AdminPageHeader eyebrow="SALES" title="Orders" description={`${orders.length} orders across all statuses`} />
      <OrdersTable orders={orders} />
    </AdminShell>
  );
}
