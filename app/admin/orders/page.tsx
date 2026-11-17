import AdminPageHeader from "../../../components/admin/AdminPageHeader";
import AdminShell from "../../../components/admin/AdminShell";
import OrdersTable from "../../../components/admin/OrdersTable";
import { fetchAdminOrders } from "../../../lib/admin-data";
import { requireAdmin } from "../../../lib/auth";
import { describeAdminRate } from "../../../lib/currency";
import { getLatestInrUsdRate } from "../../../lib/exchange-rate";

export default async function AdminOrdersPage() {
  await requireAdmin();
  const [orders, exchange] = await Promise.all([
    fetchAdminOrders(),
    getLatestInrUsdRate(),
  ]);
  return (
    <AdminShell>
      <AdminPageHeader eyebrow="SALES" title="Orders" description={`${orders.length} orders across all statuses`} />
      <OrdersTable
        orders={orders}
        rate={exchange.rate}
        rateNotice={exchange.warning ?? describeAdminRate(exchange.rate)}
      />
    </AdminShell>
  );
}
