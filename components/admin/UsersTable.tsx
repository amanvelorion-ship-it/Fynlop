"use client";

import { useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";
import { setUserBlocked } from "../../app/admin/actions";
import { formatAdminMoney } from "../../lib/currency";

export type AdminUserRow = {
  id: string;
  email: string;
  joinedAt: string;
  totalPurchases: number;
  blocked: boolean;
  history: { product: string; amount: number; status: string; date: string }[];
};

export default function UsersTable({
  users,
}: {
  users: AdminUserRow[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return users.filter((user) => user.email.toLowerCase().includes(search));
  }, [users, query]);

  function toggle(user: AdminUserRow) {
    startTransition(async () => {
      const result = await setUserBlocked(user.id, !user.blocked);
      setMessage(result.error ?? result.success ?? "");
    });
  }

  return (
    <>
      <div className="admin-toolbar">
        <input className="admin-input" placeholder="Search by email..." value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search users by email" />
      </div>
      {message && <p className={message.startsWith("Could") ? "admin-error" : "admin-message"} role="status">{message}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>EMAIL</th><th>JOINED</th><th>TOTAL PURCHASES</th><th>STATUS</th><th>ACTION</th></tr></thead>
          <tbody>
            {visible.map((user) => (
              <tr key={user.id}>
                <td><button className="admin-text-link" onClick={() => setSelected(user)}>{user.email}</button></td>
                <td>{new Date(user.joinedAt).toLocaleDateString("en-IN")}</td>
                <td>{user.totalPurchases}</td>
                <td><span className={`admin-badge admin-badge-${user.blocked ? "blocked" : "active"}`}>{user.blocked ? "blocked" : "active"}</span></td>
                <td><button className="admin-button" disabled={pending} onClick={() => toggle(user)}>{user.blocked ? "Unblock" : "Block"}</button></td>
              </tr>
            ))}
            {!visible.length && <tr><td colSpan={5} className="admin-empty">No users match this search.</td></tr>}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}>
          <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="purchase-history-title">
            <div className="admin-modal-header">
              <div><p className="admin-eyebrow">CUSTOMER HISTORY</p><h2 id="purchase-history-title">{selected.email}</h2></div>
              <button className="admin-icon-button" onClick={() => setSelected(null)} aria-label="Close"><X size={17} /></button>
            </div>
            {selected.history.length ? (
              <div className="admin-list">
                {selected.history.map((item, index) => (
                  <div className="admin-list-row" key={`${item.product}-${index}`}>
                    <span>{item.product}<br /><small>{new Date(item.date).toLocaleDateString("en-IN")} · {item.status}</small></span>
                    <strong>{formatAdminMoney(item.amount)}</strong>
                  </div>
                ))}
              </div>
            ) : <p className="admin-empty">No purchases yet.</p>}
          </section>
        </div>
      )}
    </>
  );
}
