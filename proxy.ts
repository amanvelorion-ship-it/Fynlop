import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

const adminEmail = "aman.velorion@gmail.com";
const loginPaths = new Set(["/admin", "/admin/login"]);

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = loginPaths.has(pathname);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (isLoginPage) return NextResponse.next();
    return NextResponse.redirect(new URL("/admin/login?error=configuration", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;

  if (user && user.email?.toLowerCase() !== adminEmail) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (isLoginPage) {
    if (user) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return response;
  }
  if (!user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
