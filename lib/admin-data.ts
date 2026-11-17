import "server-only";

import { createAdminClient } from "./supabase-server";
import type { Order, Product } from "../types";

export type AdminOrder = Order & {
  email: string;
  product_title: string;
};

export async function fetchAdminProducts(): Promise<Product[]> {
  const admin = createAdminClient();
  const products: Product[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await admin
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .range(start, start + 999);
    if (error) throw new Error(`Could not load products: ${error.message}`);
    products.push(...data);
    if (data.length < 1000) break;
  }
  return products;
}

export async function fetchAdminUsers() {
  const admin = createAdminClient();
  const users: {
    id: string;
    email?: string;
    created_at: string;
    banned_until?: string | null;
  }[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Could not load users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  const admin = createAdminClient();
  const orders: Order[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await admin
      .from("orders")
      .select("id, user_id, product_id, payment_id, amount, status, razorpay_mode, created_at")
      .order("created_at", { ascending: false })
      .range(start, start + 999);
    if (error) throw new Error(`Could not load orders: ${error.message}`);
    orders.push(...data);
    if (data.length < 1000) break;
  }

  const [users, products] = await Promise.all([
    fetchAdminUsers(),
    fetchAdminProducts(),
  ]);
  const emailById = new Map(users.map((user) => [user.id, user.email ?? "Unknown email"]));
  const titleById = new Map(products.map((product) => [product.id, product.title]));
  return orders.map((order) => ({
    ...order,
    email: emailById.get(order.user_id) ?? "Deleted account",
    product_title: titleById.get(order.product_id) ?? "Deleted product",
  }));
}
