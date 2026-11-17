import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient as createSsrClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Database } from "../types";

export const ADMIN_EMAIL = "aman.velorion@gmail.com";

export async function createCookieClient(writeCookies = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase authentication is not configured.");
  }

  const cookieStore = await cookies();
  return createSsrClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        if (!writeCookies) return;
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export async function requireAdmin() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    redirect("/admin/login?error=configuration");
  }

  const supabase = await createCookieClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/admin/login");
  }
  if (data.user.email?.toLowerCase() !== ADMIN_EMAIL) {
    redirect("/");
  }

  return { supabase, user: data.user };
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server credentials are missing. Configure the service role key.",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getAuthenticatedUser(authorization: string | null) {
  const token = authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase authentication is not configured.");
  }

  const client = createSupabaseClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser(token);

  if (error) {
    return null;
  }

  return data.user;
}
