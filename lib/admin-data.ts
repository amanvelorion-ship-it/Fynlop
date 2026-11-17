import "server-only";

import { listCognitoUsers } from "./cognito";
import { getOrders, getProducts } from "./dynamodb";
import type { Order } from "../types";

export type AdminOrder = Order & {
  email: string;
  product_title: string;
};

export async function fetchAdminProducts() {
  return getProducts();
}

export async function fetchAdminUsers() {
  return listCognitoUsers();
}

export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  const [orders, users, products] = await Promise.all([
    getOrders(),
    listCognitoUsers(),
    getProducts(),
  ]);
  const emailById = new Map(users.map((user) => [user.id, user.email]));
  const titleById = new Map(products.map((product) => [product.id, product.title]));
  return orders.map((order) => ({
    ...order,
    email: emailById.get(order.user_id) ?? "Deleted account",
    product_title: titleById.get(order.product_id) ?? "Deleted product",
  }));
}
