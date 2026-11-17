import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CircleDollarSign,
  PackagePlus,
  ShoppingCart,
  Users,
} from "lucide-react";
import AdminPageHeader from "../../../components/admin/AdminPageHeader";
import AdminShell from "../../../components/admin/AdminShell";
import StatsCard from "../../../components/admin/StatsCard";
import { fetchAdminOrders, fetchAdminProducts, fetchAdminUsers } from "../../../lib/admin-data";
import { requireAdmin } from "../../../lib/auth";
import { describeAdminRate, formatAdminMoney } from "../../../lib/currency";
import { getLatestInrUsdRate } from "../../../lib/exchange-rate";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [orders, products, users, exchange] = await Promise.all([
    fetchAdminOrders(),
    fetchAdminProducts(),
    fetchAdminUsers(),
    getLatestInrUsdRate(),
  ]);
  const paidOrders = orders.filter((order) => order.status === "paid");
  const revenue = paidOrders.reduce((sum, order) => sum + order.amount, 0);
  const comicSales = new Map<string, number>();
  for (const order of paidOrders) {
    const product = products.find((item) => item.id === order.product_id);
    if (product?.category === "Comics") {
      comicSales.set(product.title, (comicSales.get(product.title) ?? 0) + 1);
    }
  }
  const bestComic = [...comicSales.entries()].sort((a, b) => b[1] - a[1])[0];
  const recentOrders = orders.slice(0, 10);

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="OVERVIEW"
        title="Dashboard"
        description="A snapshot of what is happening across your FYNLOP store."
      />
      <p className="admin-muted" role={exchange.warning ? "alert" : "note"}>
        {exchange.warning ?? describeAdminRate(exchange.rate)}
      </p>
      <section className="admin-stats-grid" aria-label="Store statistics">
        <StatsCard title="TOTAL REVENUE" value={formatAdminMoney(revenue, exchange.rate)} icon={CircleDollarSign} detail="USD equivalent from paid orders" />
        <StatsCard title="TOTAL ORDERS" value={orders.length.toLocaleString("en-IN")} icon={ShoppingCart} detail={`${paidOrders.length} paid`}/>
        <StatsCard title="TOTAL USERS" value={users.length.toLocaleString("en-IN")} icon={Users} detail="Registered accounts" />
        <StatsCard title="BEST SELLING COMIC" value={bestComic?.[0] ?? "No sales yet"} icon={BookOpen} detail={bestComic ? `${bestComic[1]} purchases` : "Comic sales will appear here"} />
      </section>
      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Recent orders</h2>
            <Link href="/admin/orders">All orders <ArrowRight size={14} /></Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>ORDER</th><th>CUSTOMER</th><th>PRODUCT</th><th>AMOUNT</th><th>STATUS</th></tr></thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.id.slice(0, 8)}</strong></td>
                    <td>{order.email}</td>
                    <td>{order.product_title}</td>
                    <td>{formatAdminMoney(order.amount, exchange.rate)}</td>
                    <td><span className={`admin-badge admin-badge-${order.status}`}>{order.status === "created" ? "pending" : order.status}</span></td>
                  </tr>
                ))}
                {!recentOrders.length && <tr><td colSpan={5} className="admin-empty">Your first order will appear here.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading"><h2>Quick actions</h2></div>
          <div className="admin-quick-links">
            <Link href="/admin/products/new">Add a product <PackagePlus size={16} /></Link>
            <Link href="/admin/orders">View all orders <ArrowRight size={16} /></Link>
            <Link href="/admin/users">Manage users <Users size={16} /></Link>
          </div>
          <p className="admin-muted">Keep your catalog fresh and your customers close.</p>
        </section>
      </div>
    </AdminShell>
  );
}
