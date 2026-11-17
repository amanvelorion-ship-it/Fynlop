import { cookies } from "next/headers";
import {
  confirmCognitoSignUp,
  getUserFromAccessToken,
  signInWithCognito,
  signUpWithCognito,
} from "../../../lib/cognito";
import { authCookieName, getAuthenticatedUser } from "../../../lib/auth";
import { getUser, saveUser } from "../../../lib/dynamodb";

type AuthBody = {
  action?: unknown;
  email?: unknown;
  password?: unknown;
  code?: unknown;
};

function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Authentication failed.";
  return Response.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    return Response.json({ user: await getAuthenticatedUser() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body: AuthBody = await request.json();
    if (!isEmail(body.email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    if (body.action === "confirm") {
      if (typeof body.code !== "string" || !body.code.trim()) {
        return Response.json({ error: "Enter the verification code from your email." }, { status: 400 });
      }
      await confirmCognitoSignUp(email, body.code.trim());
      return Response.json({ confirmed: true });
    }

    if (typeof body.password !== "string" || body.password.length < 8) {
      return Response.json({ error: "Your password must be at least 8 characters." }, { status: 400 });
    }

    if (body.action === "sign-up") {
      const signup = await signUpWithCognito(email, body.password);
      if (!signup.confirmed) {
        return Response.json({ confirmationRequired: true });
      }
    } else if (body.action !== "sign-in") {
      return Response.json({ error: "Choose sign in or create an account." }, { status: 400 });
    }

    const session = await signInWithCognito(email, body.password);
    const user = await getUserFromAccessToken(session.accessToken);
    if (!user) {
      throw new Error("Cognito could not verify the new session.");
    }

    const existing = await getUser(user.id);
    if (!existing) {
      await saveUser({
        ...user,
        created_at: new Date().toISOString(),
        blocked: false,
      });
    }

    const cookieStore = await cookies();
    cookieStore.set(authCookieName, session.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: session.expiresIn,
    });
    return Response.json({ user });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(authCookieName);
  return Response.json({ signedOut: true });
}
