import "server-only";

import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  type TransactWriteCommandInput,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamo, tableNames } from "./aws-config";
import type {
  AdminSettings,
  Collection,
  CollectionContent,
  CollectionSubscription,
  CollectionSubscriptionPayment,
  Order,
  Product,
  User,
} from "../types";

const productKey = (id: string) => ({ PK: "PRODUCT", SK: id });
const collectionKey = (id: string) => ({ PK: "COLLECTION", SK: id });
const collectionContentKey = (collectionId: string, id: string) => ({
  PK: `COLLECTION#${collectionId}`,
  SK: `CONTENT#${id}`,
});
const userKey = (id: string) => ({ PK: `USER#${id}`, SK: "PROFILE" });
const orderKey = (userId: string, id: string) => ({
  PK: `USER#${userId}`,
  SK: `ORDER#${id}`,
});
const settingsKey = { PK: "SETTINGS", SK: "STORE" };
const subscriptionUserKey = (subscription: CollectionSubscription) => ({
  PK: `USER#${subscription.user_id}`,
  SK: `COLLECTION_SUB#${subscription.razorpay_subscription_id}`,
});
const subscriptionCollectionKey = (subscription: CollectionSubscription) => ({
  PK: `COLLECTION#${subscription.collection_id}`,
  SK: `SUBSCRIBER#${subscription.razorpay_subscription_id}`,
});
const subscriptionGatewayKey = (subscriptionId: string) => ({
  PK: `RAZORPAY_SUB#${subscriptionId}`,
  SK: "INDEX",
});
const subscriptionPaymentKey = (subscriptionId: string, paymentId: string) => ({
  PK: `COLLECTION_SUB#${subscriptionId}`,
  SK: `PAYMENT#${paymentId}`,
});
const paymentIndexKey = (paymentId: string) => ({
  PK: `COLLECTION_PAYMENT#${paymentId}`,
  SK: "INDEX",
});
const webhookEventKey = (eventId: string) => ({
  PK: "RAZORPAY_EVENT",
  SK: eventId,
});

function withoutKeys<T>(item: Record<string, unknown>): T {
  const value = { ...item };
  delete value.PK;
  delete value.SK;
  return value as T;
}

async function scanAll<T>(
  tableName: string,
  consistentRead = false,
  filterExpression?: string,
  expressionAttributeValues?: Record<string, unknown>,
): Promise<T[]> {
  const items: T[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey,
        ConsistentRead: consistentRead,
        ...(filterExpression
          ? { FilterExpression: filterExpression, ExpressionAttributeValues: expressionAttributeValues }
          : {}),
      }),
    );
    items.push(...(result.Items || []).map((item) => withoutKeys<T>(item)));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

export async function getCollections(): Promise<Collection[]> {
  const collections: Collection[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableNames.products,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": "COLLECTION" },
        ExclusiveStartKey,
      }),
    );
    collections.push(...(result.Items || []).map((item) => withoutKeys<Collection>(item)));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return collections.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getCollection(id: string): Promise<Collection | null> {
  const result = await dynamo.send(
    new GetCommand({ TableName: tableNames.products, Key: collectionKey(id) }),
  );
  return result.Item ? withoutKeys<Collection>(result.Item) : null;
}

export async function putCollection(collection: Collection, createOnly = false): Promise<void> {
  await dynamo.send(
    new PutCommand({
      TableName: tableNames.products,
      Item: { ...collection, ...collectionKey(collection.id) },
      ...(createOnly ? { ConditionExpression: "attribute_not_exists(PK)" } : {}),
    }),
  );
}

export async function getCollectionContent(collectionId: string): Promise<CollectionContent[]> {
  const content: CollectionContent[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableNames.products,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `COLLECTION#${collectionId}`,
          ":sk": "CONTENT#",
        },
        ExclusiveStartKey,
      }),
    );
    content.push(...(result.Items || []).map((item) => withoutKeys<CollectionContent>(item)));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return content.sort((a, b) => a.release_at.localeCompare(b.release_at));
}

export async function getCollectionContentById(
  collectionId: string,
  id: string,
): Promise<CollectionContent | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: tableNames.products,
      Key: collectionContentKey(collectionId, id),
    }),
  );
  return result.Item ? withoutKeys<CollectionContent>(result.Item) : null;
}

export async function putCollectionContent(content: CollectionContent): Promise<void> {
  await dynamo.send(
    new PutCommand({
      TableName: tableNames.products,
      Item: { ...content, ...collectionContentKey(content.collection_id, content.id) },
    }),
  );
}

export async function deleteCollectionContent(
  collectionId: string,
  id: string,
): Promise<void> {
  await dynamo.send(
    new DeleteCommand({
      TableName: tableNames.products,
      Key: collectionContentKey(collectionId, id),
      ConditionExpression: "attribute_exists(PK)",
    }),
  );
}

export async function deleteCollectionWithContent(
  id: string,
  contentIds: string[],
  subscriptions: CollectionSubscription[],
): Promise<void> {
  const operationCount = 1 + contentIds.length + subscriptions.length * 3;
  if (operationCount > 100) {
    throw new Error("This collection has too many records to permanently delete in one operation.");
  }
  const now = new Date().toISOString();
  const terminalStatuses = [":cancelled", ":completed", ":expired"];
  await dynamo.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: tableNames.products,
            Key: collectionKey(id),
            ConditionExpression: "#status = :draft",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: { ":draft": "draft" },
          },
        },
        ...contentIds.map((contentId) => ({
          Delete: {
            TableName: tableNames.products,
            Key: collectionContentKey(id, contentId),
            ConditionExpression: "attribute_exists(PK)",
          },
        })),
        ...subscriptions.flatMap((subscription) =>
          [
            subscriptionUserKey(subscription),
            subscriptionCollectionKey(subscription),
            subscriptionGatewayKey(subscription.razorpay_subscription_id),
          ].map((Key) => ({
            Delete: {
              TableName: tableNames.orders,
              Key,
              ConditionExpression:
                `#status IN (${terminalStatuses.join(", ")}) AND ` +
                "(attribute_not_exists(paid_through) OR paid_through = :null OR paid_through <= :now)",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: {
                ":cancelled": "cancelled",
                ":completed": "completed",
                ":expired": "expired",
                ":null": null,
                ":now": now,
              },
            },
          })),
        ),
      ],
    }),
  );
}

export async function getProducts(): Promise<Product[]> {
  const products: Product[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableNames.products,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": "PRODUCT" },
        ExclusiveStartKey,
      }),
    );
    products.push(...(result.Items || []).map((item) => withoutKeys<Product>(item)));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return products.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getProduct(id: string): Promise<Product | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: tableNames.products,
      Key: productKey(id),
    }),
  );
  return result.Item ? withoutKeys<Product>(result.Item) : null;
}

export async function putProduct(product: Product, createOnly = false): Promise<void> {
  await dynamo.send(
    new PutCommand({
      TableName: tableNames.products,
      Item: { ...product, ...productKey(product.id) },
      ...(createOnly ? { ConditionExpression: "attribute_not_exists(PK)" } : {}),
    }),
  );
}

export async function deleteProduct(id: string): Promise<void> {
  await dynamo.send(
    new DeleteCommand({
      TableName: tableNames.products,
      Key: productKey(id),
      ConditionExpression: "attribute_exists(PK)",
    }),
  );
}

export async function getOrders(): Promise<Order[]> {
  const orders = await scanAll<Order>(
    tableNames.orders,
    false,
    "begins_with(SK, :sk)",
    { ":sk": "ORDER#" },
  );
  return orders.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function hasProductOrderHistory(productId: string): Promise<boolean> {
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: tableNames.orders,
        FilterExpression: "begins_with(SK, :sk) AND product_id = :productId",
        ExpressionAttributeValues: {
          ":sk": "ORDER#",
          ":productId": productId,
        },
        ProjectionExpression: "PK",
        Limit: 100,
        ExclusiveStartKey,
      }),
    );
    if (result.Items?.length) return true;
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return false;
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  const orders: Order[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableNames.orders,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":sk": "ORDER#",
        },
        ConsistentRead: true,
        ExclusiveStartKey,
      }),
    );
    orders.push(...(result.Items || []).map((item) => withoutKeys<Order>(item)));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return orders.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getOrderById(id: string): Promise<Order | null> {
  const orders = await scanAll<Order>(
    tableNames.orders,
    true,
    "begins_with(SK, :sk)",
    { ":sk": "ORDER#" },
  );
  return orders.find((order) => order.id === id) ?? null;
}

export async function getCollectionSubscriptionsByUser(
  userId: string,
): Promise<CollectionSubscription[]> {
  const subscriptions: CollectionSubscription[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableNames.orders,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":sk": "COLLECTION_SUB#",
        },
        ConsistentRead: true,
        ExclusiveStartKey,
      }),
    );
    subscriptions.push(
      ...(result.Items || []).map((item) => withoutKeys<CollectionSubscription>(item)),
    );
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return subscriptions.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getCollectionSubscriptionsByCollection(
  collectionId: string,
): Promise<CollectionSubscription[]> {
  const subscriptions: CollectionSubscription[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableNames.orders,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `COLLECTION#${collectionId}`,
          ":sk": "SUBSCRIBER#",
        },
        ConsistentRead: true,
        ExclusiveStartKey,
      }),
    );
    subscriptions.push(
      ...(result.Items || []).map((item) => withoutKeys<CollectionSubscription>(item)),
    );
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return subscriptions.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getAllCollectionSubscriptions(): Promise<CollectionSubscription[]> {
  return scanAll<CollectionSubscription>(
    tableNames.orders,
    false,
    "begins_with(SK, :sk)",
    { ":sk": "COLLECTION_SUB#" },
  );
}

export async function getCollectionSubscriptionByGatewayId(
  subscriptionId: string,
): Promise<CollectionSubscription | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: tableNames.orders,
      Key: subscriptionGatewayKey(subscriptionId),
      ConsistentRead: true,
    }),
  );
  return result.Item ? withoutKeys<CollectionSubscription>(result.Item) : null;
}

export async function getCollectionSubscriptionPayments(
  subscriptionId: string,
): Promise<CollectionSubscriptionPayment[]> {
  const payments: CollectionSubscriptionPayment[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableNames.orders,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `COLLECTION_SUB#${subscriptionId}`,
          ":sk": "PAYMENT#",
        },
        ConsistentRead: true,
        ExclusiveStartKey,
      }),
    );
    payments.push(
      ...(result.Items || []).map((item) => withoutKeys<CollectionSubscriptionPayment>(item)),
    );
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return payments.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function getCollectionSubscriptionPayment(
  paymentId: string,
): Promise<CollectionSubscriptionPayment | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: tableNames.orders,
      Key: paymentIndexKey(paymentId),
      ConsistentRead: true,
    }),
  );
  return result.Item ? withoutKeys<CollectionSubscriptionPayment>(result.Item) : null;
}

export async function transitionCollectionSubscriptionPayment(
  payment: CollectionSubscriptionPayment,
  nextStatus: CollectionSubscriptionPayment["status"],
  expectedStatus: CollectionSubscriptionPayment["status"],
): Promise<CollectionSubscriptionPayment> {
  const keys = [
    subscriptionPaymentKey(payment.subscription_id, payment.id),
    paymentIndexKey(payment.id),
  ];
  await dynamo.send(
    new TransactWriteCommand({
      TransactItems: keys.map((Key) => ({
        Update: {
          TableName: tableNames.orders,
          Key,
          UpdateExpression: "SET #status = :nextStatus",
          ConditionExpression: "#status = :expectedStatus",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":nextStatus": nextStatus,
            ":expectedStatus": expectedStatus,
          },
        },
      })),
    }),
  );
  return { ...payment, status: nextStatus };
}

export async function getAllCollectionSubscriptionPayments(): Promise<
  CollectionSubscriptionPayment[]
> {
  return scanAll<CollectionSubscriptionPayment>(
    tableNames.orders,
    false,
    "begins_with(PK, :pk) AND begins_with(SK, :sk)",
    { ":pk": "COLLECTION_SUB#", ":sk": "PAYMENT#" },
  );
}

export async function saveCollectionSubscription(
  subscription: CollectionSubscription,
  options: {
    payment?: CollectionSubscriptionPayment;
    eventId?: string;
  } = {},
): Promise<boolean> {
  const subscriptionItems = [
    { ...subscription, ...subscriptionUserKey(subscription) },
    { ...subscription, ...subscriptionCollectionKey(subscription) },
    { ...subscription, ...subscriptionGatewayKey(subscription.razorpay_subscription_id) },
  ];
  const transactItems: NonNullable<TransactWriteCommandInput["TransactItems"]> = subscriptionItems.map((Item) => ({
    Put: { TableName: tableNames.orders, Item },
  }));
  if (options.payment) {
    const payment = options.payment;
    transactItems.push(
      {
        Put: {
          TableName: tableNames.orders,
          Item: { ...payment, ...subscriptionPaymentKey(payment.subscription_id, payment.id) },
        },
      },
      {
        Put: {
          TableName: tableNames.orders,
          Item: { ...payment, ...paymentIndexKey(payment.id) },
        },
      },
    );
  }
  if (options.eventId) {
    transactItems.push({
      Put: {
        TableName: tableNames.orders,
        Item: {
          ...webhookEventKey(options.eventId),
          processed_at: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(PK)",
      },
    });
  }

  try {
    await dynamo.send(new TransactWriteCommand({ TransactItems: transactItems }));
    return true;
  } catch (error) {
    if (options.eventId && error instanceof Error && error.name === "TransactionCanceledException") {
      const event = await dynamo.send(
        new GetCommand({
          TableName: tableNames.orders,
          Key: webhookEventKey(options.eventId),
          ConsistentRead: true,
        }),
      );
      if (event.Item) return false;
    }
    throw error;
  }
}

export async function saveOrder(order: Order): Promise<boolean> {
  try {
    await dynamo.send(
      new PutCommand({
        TableName: tableNames.orders,
        Item: { ...order, ...orderKey(order.user_id, order.id) },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
      return false;
    }
    throw error;
  }
}

export async function updateOrderStatus(
  order: Order,
  nextStatus: Order["status"],
  expectedStatus: Order["status"],
): Promise<Order> {
  const result = await dynamo.send(
    new UpdateCommand({
      TableName: tableNames.orders,
      Key: orderKey(order.user_id, order.id),
      UpdateExpression: "SET #status = :nextStatus",
      ConditionExpression: "#status = :expectedStatus",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":nextStatus": nextStatus,
        ":expectedStatus": expectedStatus,
      },
      ReturnValues: "ALL_NEW",
    }),
  );
  return result.Attributes ? withoutKeys<Order>(result.Attributes) : order;
}

export async function getStoreSettings(): Promise<AdminSettings> {
  const result = await dynamo.send(
    new GetCommand({ TableName: tableNames.settings, Key: settingsKey }),
  );
  return (
    (result.Item ? withoutKeys<AdminSettings>(result.Item) : null) ?? {
      ...settingsKey,
      site_name: "FYNLOP",
      tagline: "Stories Beyond Reality",
      logo_url: null,
      support_email: process.env.AWS_SES_FROM_EMAIL || "",
      razorpay_mode: process.env.NEXT_PUBLIC_RAZORPAY_MODE === "live" ? "live" : "test",
      maintenance_mode: false,
      updated_at: new Date(0).toISOString(),
    }
  );
}

export async function saveStoreSettings(
  settings: Omit<AdminSettings, "PK" | "SK">,
): Promise<void> {
  await dynamo.send(
    new PutCommand({
      TableName: tableNames.settings,
      Item: { ...settings, ...settingsKey },
    }),
  );
}

export async function getUser(id: string): Promise<User | null> {
  const result = await dynamo.send(
    new GetCommand({ TableName: tableNames.users, Key: userKey(id) }),
  );
  return result.Item ? withoutKeys<User>(result.Item) : null;
}

export async function saveUser(user: User, createOnly = false): Promise<void> {
  await dynamo.send(
    new PutCommand({
      TableName: tableNames.users,
      Item: { ...user, ...userKey(user.id) },
      ...(createOnly ? { ConditionExpression: "attribute_not_exists(PK)" } : {}),
    }),
  );
}

