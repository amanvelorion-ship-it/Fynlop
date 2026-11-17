import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type SupabaseClient = ReturnType<typeof createSupabaseClient<Database>>;
let supabaseClient: SupabaseClient | undefined;

// Supabase schema:
// products: id, title, description, cover_image_url, price_inr, price_usd,
//           file_url, category, popularity, created_at
// orders: id, user_id, product_id, payment_id, amount, status, created_at
export function createClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Add its URL and anon key to .env.local.",
    );
  }

  const client = createSupabaseClient<Database>(url, anonKey);
  supabaseClient = client;
  return client;
}
