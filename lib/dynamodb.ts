import "server-only";

import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamo, tableNames } from "./aws-config";
import type { AdminSettings, Order, Product, User } from "../types";

const productKey = (id: string) => ({ PK: "PRODUCT", SK: id });
const userKey = (id: string) => ({ PK: `USER#${id}`, SK: "PROFILE" });
const orderKey = (userId: string, id: string) => ({
  PK: `USER#${userId}`,
  SK: `ORDER#${id}`,
});
const settingsKey = { PK: "SETTINGS", SK: "STORE" };

function withoutKeys<T>(item: Record<string, unknown>): T {
  const value = { ...item };
  delete value.PK;
  delete value.SK;
  return value as T;
}

async function scanAll<T>(tableName: string, consistentRead = false): Promise<T[]> {
  const items: T[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await dynamo.send(
      new ScanCommand({ TableName: tableName, ExclusiveStartKey, ConsistentRead: consistentRead }),
    );
    items.push(...(result.Items || []).map((item) => withoutKeys<T>(item)));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
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
  const orders = await scanAll<Order>(tableNames.orders);
  return orders.sort((a, b) => b.created_at.localeCompare(a.created_at));
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
  const orders = await scanAll<Order>(tableNames.orders, true);
  return orders.find((order) => order.id === id) ?? null;
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

