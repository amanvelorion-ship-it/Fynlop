import "server-only";

import {
  getCollection,
  getCollectionContent,
  getCollections,
} from "./dynamodb";
import type {
  Collection,
  PublicCollection,
  PublicCollectionContent,
} from "../types";

function toPublicCollection(collection: Collection): PublicCollection {
  return {
    id: collection.id,
    title: collection.title,
    description: collection.description,
    cover_image_url: collection.cover_image_url,
    monthly_price_paise: collection.monthly_price_paise,
    created_at: collection.created_at,
    updated_at: collection.updated_at,
  };
}

export async function getPublishedCollections(): Promise<PublicCollection[]> {
  const collections = await getCollections();
  return collections
    .filter((collection) => collection.status === "published")
    .map(toPublicCollection);
}

export async function getPublishedCollection(
  id: string,
): Promise<PublicCollection | null> {
  const collection = await getCollection(id);
  return collection?.status === "published" ? toPublicCollection(collection) : null;
}

export async function getPublishedCollectionContent(
  collectionId: string,
): Promise<PublicCollectionContent[]> {
  const now = Date.now();
  const content = await getCollectionContent(collectionId);
  return content
    .filter((item) => item.published && Date.parse(item.release_at) <= now)
    .map((item) => ({
      id: item.id,
      collection_id: item.collection_id,
      title: item.title,
      description: item.description,
      kind: item.kind,
      release_at: item.release_at,
      created_at: item.created_at,
    }));
}
