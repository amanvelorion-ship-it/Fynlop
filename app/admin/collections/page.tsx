import Link from "next/link";
import { Plus } from "lucide-react";
import AdminPageHeader from "../../../components/admin/AdminPageHeader";
import AdminShell from "../../../components/admin/AdminShell";
import { requireAdmin } from "../../../lib/auth";
import { getCurrentTimestamp, hasCollectionAccess } from "../../../lib/collection-access";
import { formatInrPaise } from "../../../lib/currency";
import {
  getAllCollectionSubscriptionPayments,
  getAllCollectionSubscriptions,
  getCollections,
} from "../../../lib/dynamodb";

export default async function AdminCollectionsPage() {
  await requireAdmin();
  const [collections, subscriptions, payments] = await Promise.all([
    getCollections(),
    getAllCollectionSubscriptions(),
    getAllCollectionSubscriptionPayments(),
  ]);
  const now = getCurrentTimestamp();
  const activeCount = subscriptions.filter((item) => hasCollectionAccess(item, now)).length;
  const revenue = payments
    .filter((payment) => payment.status === "captured")
    .reduce((total, payment) => total + payment.amount_paise, 0);

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="ONGOING STORIES"
        title="Collections"
        description="Manage monthly series subscriptions and their releases."
        action={
          <Link className="admin-button admin-button-primary" href="/admin/collections/new">
            <Plus size={15} /> New collection
          </Link>
        }
      />
      <section className="collection-admin-summary" aria-label="Collection subscription summary">
        <article><span>Collections</span><strong>{collections.length}</strong></article>
        <article><span>With paid access</span><strong>{activeCount}</strong></article>
        <article><span>Captured subscription revenue</span><strong>{formatInrPaise(revenue)}</strong></article>
      </section>
      {collections.length ? (
        <div className="collection-admin-list">
          {collections.map((collection) => {
            const subscribers = subscriptions.filter((item) => item.collection_id === collection.id);
            const active = subscribers.filter((item) => hasCollectionAccess(item, now)).length;
            return (
              <Link
                className="collection-admin-card"
                href={`/admin/collections/${collection.id}`}
                key={collection.id}
              >
                <span>
                  <strong>{collection.title}</strong>
                  <small>{collection.status} · {active} with paid access · {subscribers.length} subscription records</small>
                </span>
                <span>{formatInrPaise(collection.monthly_price_paise)} / month</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="admin-empty-state">
          <h2>No collections created yet.</h2>
          <p>Create a collection, set its monthly price, and add its first release.</p>
        </div>
      )}
    </AdminShell>
  );
}
