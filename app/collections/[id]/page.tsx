import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { connection } from "next/server";
import CollectionContentDownloadButton from "../../../components/CollectionContentDownloadButton";
import SubscribeButton from "../../../components/SubscribeButton";
import {
  getPublishedCollection,
  getPublishedCollectionContent,
} from "../../../lib/collection-catalog";

async function CollectionContent({ id }: { id: string }) {
  await connection();
  const collection = await getPublishedCollection(id);
  if (!collection) notFound();
  const releases = await getPublishedCollectionContent(id);

  return (
    <main className="page-shell page-width collection-page">
      <Link className="text-link collection-back" href="/shop"><ArrowLeft size={15} /> All collections</Link>
      <section className="collection-detail-layout">
        <div
          className="collection-detail-cover"
          role="img"
          aria-label={`${collection.title} cover`}
          style={{ backgroundImage: `url("${collection.cover_image_url}")` }}
        />
        <div className="collection-detail-copy">
          <p className="eyebrow"><span className="eyebrow-mark" /> ONGOING COLLECTION · MONTHLY</p>
          <h1>{collection.title}</h1>
          <p>{collection.description}</p>
          <SubscribeButton
            collectionId={collection.id}
            collectionTitle={collection.title}
            monthlyPricePaise={collection.monthly_price_paise}
          />
        </div>
      </section>

      <section className="collection-releases">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-mark" /> INCLUDED WITH YOUR SUBSCRIPTION</p>
            <h2>Every chapter.<br /><em>And the next one.</em></h2>
          </div>
        </div>
        {releases.length ? (
          <div className="collection-release-list">
            {releases.map((release) => (
              <article className="collection-release" key={release.id}>
                <BookOpen size={19} aria-hidden="true" />
                <div>
                  <p className="collection-release-kind">{release.kind.toUpperCase()}</p>
                  <h3>{release.title}</h3>
                  {release.description && <p>{release.description}</p>}
                </div>
                <CollectionContentDownloadButton collectionId={id} contentId={release.id} />
              </article>
            ))}
          </div>
        ) : (
          <p className="checkout-help">New releases will appear here as soon as they are published.</p>
        )}
      </section>
    </main>
  );
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<main className="page-shell page-width"><p className="eyebrow">OPENING THE COLLECTION…</p></main>}>
      <CollectionRoute params={params} />
    </Suspense>
  );
}

async function CollectionRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CollectionContent id={id} />;
}
