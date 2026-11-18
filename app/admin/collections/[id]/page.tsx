import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import CollectionContentActions from "../../../../components/admin/CollectionContentActions";
import CollectionContentForm from "../../../../components/admin/CollectionContentForm";
import CollectionForm from "../../../../components/admin/CollectionForm";
import AdminPageHeader from "../../../../components/admin/AdminPageHeader";
import AdminShell from "../../../../components/admin/AdminShell";
import DeleteCollectionButton from "../../../../components/admin/DeleteCollectionButton";
import RefundSubscriptionPaymentButton from "../../../../components/admin/RefundSubscriptionPaymentButton";
import { requireAdmin } from "../../../../lib/auth";
import {
  getCurrentTimestamp,
  hasCollectionAccess,
  hasOngoingCollectionSubscription,
} from "../../../../lib/collection-access";
import { formatInrPaise } from "../../../../lib/currency";
import {
  getCollection,
  getCollectionContent,
  getCollectionSubscriptionPayments,
  getCollectionSubscriptionsByCollection,
} from "../../../../lib/dynamodb";

function displayStatus(
  status: string,
  paidThrough: string | null,
  now: number,
): string {
  if (paidThrough && Date.parse(paidThrough) <= now) return "expired";
  return status.replaceAll("_", " ");
}

export default async function CollectionAdminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const collection = await getCollection(id);
  if (!collection) notFound();

  const [content, subscriptions] = await Promise.all([
    getCollectionContent(id),
    getCollectionSubscriptionsByCollection(id),
  ]);
  const subscriptionPayments = await Promise.all(
    subscriptions.map(async (subscription) => ({
      subscription,
      payments: await getCollectionSubscriptionPayments(subscription.razorpay_subscription_id),
    })),
  );
  const payments = subscriptionPayments.flatMap((item) => item.payments);
  const revenue = payments
    .filter((payment) => payment.status === "captured")
    .reduce((total, payment) => total + payment.amount_paise, 0);
  const now = getCurrentTimestamp();
  const active = subscriptions.filter((item) => hasCollectionAccess(item, now)).length;
  const failed = subscriptions.filter((item) => item.status === "payment_failed").length;
  const cancelled = subscriptions.filter((item) => item.status === "cancelled").length;
  const expired = subscriptions.filter(
    (item) => item.paid_through && Date.parse(item.paid_through) <= now,
  ).length;
  const canPermanentlyDelete =
    collection.status === "draft" &&
    !subscriptions.some((subscription) =>
      hasOngoingCollectionSubscription(subscription, now),
    ) &&
    payments.length === 0;

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="COLLECTION MANAGEMENT"
        title={collection.title}
        description="Update pricing, publish releases, and review subscription activity."
        action={
          <div className="admin-table-actions">
            <Link className="admin-button" href="/admin/collections"><ArrowLeft size={15} /> Collections</Link>
            {canPermanentlyDelete && (
              <DeleteCollectionButton collectionId={id} title={collection.title} />
            )}
          </div>
        }
      />
      {collection.status !== "draft" && (
        <p className="admin-muted">
          To permanently delete this collection, first set it to Draft. Active subscriptions, paid access, or billing payments must be resolved first.
        </p>
      )}
      {subscriptions.length > 0 && !canPermanentlyDelete && (
        <p className="admin-muted">
          Active, pending, retrying subscriptions and paid access block deletion. Billing payment history is retained; cancelled subscriptions without payment history can be permanently removed.
        </p>
      )}
      <section className="collection-admin-summary">
        <article><span>Paid access</span><strong>{active}</strong></article>
        <article><span>Payment failed</span><strong>{failed}</strong></article>
        <article><span>Cancelled / expired</span><strong>{cancelled} / {expired}</strong></article>
        <article><span>Captured revenue</span><strong>{formatInrPaise(revenue)}</strong></article>
      </section>

      <CollectionForm collection={collection} />

      <section className="admin-setting-panel collection-admin-section">
        <h2>Releases · {content.length}</h2>
        <p className="admin-muted">Scheduled releases become available automatically when their release date arrives.</p>
        {content.length ? (
          <div className="collection-admin-release-list">
            {content.map((release) => (
              <article className="collection-admin-release" key={release.id}>
                <div>
                  <strong>{release.kind}: {release.title}</strong>
                  <small>
                    {release.published ? "Published / scheduled" : "Draft"} · {new Date(release.release_at).toLocaleString()}
                  </small>
                  {release.description && <p>{release.description}</p>}
                </div>
                <CollectionContentActions
                  collectionId={id}
                  contentId={release.id}
                  title={release.title}
                  published={release.published}
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-muted">No releases yet.</p>
        )}
      </section>
      {collection.status !== "archived" && <CollectionContentForm collectionId={id} />}

      <section className="admin-setting-panel collection-admin-section">
        <h2>Subscribers · {subscriptions.length}</h2>
        {subscriptionPayments.length ? (
          <div className="collection-admin-subscriber-list">
            {subscriptionPayments.map(({ subscription, payments: subscriberPayments }) => {
              const hasAccess = hasCollectionAccess(subscription, now);
              return (
                <article className="collection-admin-subscriber" key={subscription.id}>
                  <header>
                    <div>
                      <strong>{subscription.email}</strong>
                      <small>
                        {displayStatus(subscription.status, subscription.paid_through, now)}
                        {subscription.cancel_at_period_end && subscription.paid_through
                          ? ` · access until ${new Date(subscription.paid_through).toLocaleDateString()}`
                          : ""}
                        {hasAccess ? " · access enabled" : " · no current access"}
                      </small>
                    </div>
                    <span>{formatInrPaise(subscription.amount_paise)} / month</span>
                  </header>
                  <details>
                    <summary>Billing history ({subscriberPayments.length})</summary>
                    <ul>
                      {subscriberPayments.map((payment) => (
                        <li key={payment.id}>
                          <span>{new Date(payment.created_at).toLocaleDateString()}</span>
                          <span>{formatInrPaise(payment.amount_paise)}</span>
                          <span>{payment.status}</span>
                          {payment.status === "captured" && (
                            <RefundSubscriptionPaymentButton paymentId={payment.id} />
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="admin-muted">No subscribers yet.</p>
        )}
      </section>
    </AdminShell>
  );
}
