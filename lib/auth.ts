import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserFromAccessToken, type AuthenticatedUser } from "./cognito";

export const authCookieName = "fynlop_access_token";

export async function getAuthenticatedUser(
  authorization?: string | null,
): Promise<AuthenticatedUser | null> {
  const token =
    authorization?.match(/^Bearer (.+)$/i)?.[1] ??
    (await cookies()).get(authCookieName)?.value;
  return getUserFromAccessToken(token);
}

export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login");
  if (user.email.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    redirect("/");
  }
  return user;
}
