import { cookies } from "next/headers";
import {
  confirmCognitoSignUp,
  getUserFromAccessToken,
  resendCognitoConfirmationCode,
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

function isCognitoError(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name;
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

    if (body.action === "resend") {
      await resendCognitoConfirmationCode(email);
      return Response.json({ confirmationRequired: true });
    }

    if (typeof body.password !== "string" || body.password.length < 8) {
      return Response.json({ error: "Your password must be at least 8 characters." }, { status: 400 });
    }

    if (body.action === "sign-up") {
      let signup;
      try {
        signup = await signUpWithCognito(email, body.password);
      } catch (error) {
        if (!isCognitoError(error, "UsernameExistsException")) throw error;
        try {
          await resendCognitoConfirmationCode(email);
        } catch (resendError) {
          if (isCognitoError(resendError, "NotAuthorizedException")) {
            return Response.json(
              { error: "This account is already verified. Sign in instead." },
              { status: 409 },
            );
          }
          throw resendError;
        }
        return Response.json({ confirmationRequired: true });
      }
      if (!signup.confirmed) {
        return Response.json({ confirmationRequired: true });
      }
    } else if (body.action !== "sign-in") {
      return Response.json({ error: "Choose sign in or create an account." }, { status: 400 });
    }

    let session;
    try {
      session = await signInWithCognito(email, body.password);
    } catch (error) {
      if (body.action === "sign-in" && isCognitoError(error, "UserNotConfirmedException")) {
        return Response.json({ confirmationRequired: true });
      }
      throw error;
    }
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
