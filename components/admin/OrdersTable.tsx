"use client";

import { useMemo, useState, useTransition } from "react";
import { refundOrder } from "../../app/admin/actions";
import type { AdminOrder } from "../../lib/admin-data";
import { formatAdminMoney } from "../../lib/currency";

export default function OrdersTable({
  orders,
}: {
  orders: AdminOrder[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return orders.filter((order) =>
      (status === "All" || order.status === status) &&
      (!search || order.email.toLowerCase().includes(search)),
    );
  }, [orders, query, status]);

  function refund(order: AdminOrder) {
    if (!window.confirm(`Issue a Razorpay refund for order ${order.id}?`)) return;
    startTransition(async () => {
      const result = await refundOrder(order.id);
      setMessage(result.error ?? result.success ?? "");
    });
  }

  return (
    <>
      <div className="admin-toolbar">
        <input className="admin-input" placeholder="Search customer email..." value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search order email" />
        <select className="admin-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by order status">
          <option>All</option><option>paid</option><option value="created">pending</option><option>refunding</option><option>failed</option><option>refunded</option>
        </select>
      </div>
      {message && <p className={message.startsWith("Razorpay") || message.startsWith("Could") ? "admin-error" : "admin-message"} role="status">{message}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>ORDER ID</th><th>CUSTOMER</th><th>PRODUCT</th><th>AMOUNT</th><th>STATUS</th><th>DATE</th><th>ACTION</th></tr></thead>
          <tbody>
            {visible.map((order) => (
              <tr key={order.id}>
                <td><strong>{order.id.slice(0, 8)}</strong></td>
                <td>{order.email}</td>
                <td>{order.product_title}</td>
                <td>{formatAdminMoney(order.amount)}</td>
                <td><span className={`admin-badge admin-badge-${order.status}`}>{order.status === "created" ? "pending" : order.status}</span></td>
                <td>{new Date(order.created_at).toLocaleDateString("en-IN")}</td>
                <td>{order.status === "paid" ? <button className="admin-button admin-button-danger" disabled={pending} onClick={() => refund(order)}>Refund</button> : "—"}</td>
              </tr>
            ))}
            {!visible.length && <tr><td colSpan={7} className="admin-empty">No orders match this filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
