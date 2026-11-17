import AdminPageHeader from "../../../components/admin/AdminPageHeader";
import AdminShell from "../../../components/admin/AdminShell";
import AnalyticsCharts from "../../../components/admin/AnalyticsCharts";
import { fetchAdminOrders } from "../../../lib/admin-data";
import { requireAdmin } from "../../../lib/supabase-server";

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const orders = await fetchAdminOrders();
  const paid = orders.filter((order) => order.status === "paid");
  const productTotals = new Map<string, { count: number; revenue: number }>();
  const customerTotals = new Map<string, { count: number; revenue: number }>();

  for (const order of paid) {
    const product = productTotals.get(order.product_title) ?? { count: 0, revenue: 0 };
    product.count += 1;
    product.revenue += order.amount;
    productTotals.set(order.product_title, product);
    const customer = customerTotals.get(order.email) ?? { count: 0, revenue: 0 };
    customer.count += 1;
    customer.revenue += order.amount;
    customerTotals.set(order.email, customer);
  }

  const topProducts = [...productTotals]
    .map(([label, total]) => ({ label, ...total }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const topCustomers = [...customerTotals]
    .map(([label, total]) => ({ label, ...total }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <AdminShell>
      <AdminPageHeader eyebrow="PERFORMANCE" title="Analytics" description="Revenue and order trends across your store." />
      <AnalyticsCharts
        orders={paid.map(({ amount, status, created_at }) => ({ amount, status, created_at }))}
        topProducts={topProducts}
        topCustomers={topCustomers}
      />
    </AdminShell>
  );
}
