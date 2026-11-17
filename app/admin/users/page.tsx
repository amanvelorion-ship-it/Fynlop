import AdminPageHeader from "../../../components/admin/AdminPageHeader";
import AdminShell from "../../../components/admin/AdminShell";
import UsersTable, { type AdminUserRow } from "../../../components/admin/UsersTable";
import { fetchAdminOrders, fetchAdminUsers } from "../../../lib/admin-data";
import { requireAdmin } from "../../../lib/auth";
import { describeAdminRate } from "../../../lib/currency";
import { getLatestInrUsdRate } from "../../../lib/exchange-rate";

export default async function AdminUsersPage() {
  await requireAdmin();
  const [authUsers, orders, exchange] = await Promise.all([
    fetchAdminUsers(),
    fetchAdminOrders(),
    getLatestInrUsdRate(),
  ]);
  const users: AdminUserRow[] = authUsers.map((user) => {
    const purchases = orders.filter((order) => order.user_id === user.id);
    return {
      id: user.id,
      email: user.email ?? "No email",
      joinedAt: user.created_at,
      totalPurchases: purchases.filter((order) => order.status === "paid").length,
      blocked: Boolean(user.blocked),
      history: purchases.map((order) => ({
        product: order.product_title,
        amount: order.amount,
        status: order.status,
        date: order.created_at,
      })),
    };
  }).sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));

  return (
    <AdminShell>
      <AdminPageHeader eyebrow="CUSTOMERS" title="Users" description={`${users.length} registered accounts`} />
      <UsersTable
        users={users}
        rate={exchange.rate}
        rateNotice={exchange.warning ?? describeAdminRate(exchange.rate)}
      />
    </AdminShell>
  );
}
