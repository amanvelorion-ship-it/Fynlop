import "server-only";

import {
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  ConfirmSignUpCommand,
  GetUserCommand,
  InitiateAuthCommand,
  ListUsersCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { cognito, requiredEnvironmentVariable } from "./aws-config";
import type { User } from "../types";

const userPoolId = () => requiredEnvironmentVariable("AWS_COGNITO_USER_POOL_ID");
const clientId = () => requiredEnvironmentVariable("AWS_COGNITO_CLIENT_ID");

export type AuthenticatedUser = Pick<User, "id" | "email"> & {
  auth_username?: string;
};

export async function signInWithCognito(email: string, password: string) {
  const result = await cognito.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId(),
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  );
  if (result.ChallengeName || !result.AuthenticationResult?.AccessToken) {
    throw new Error(
      result.ChallengeName
        ? `Additional sign-in verification is required (${result.ChallengeName}).`
        : "Cognito did not return an access token.",
    );
  }
  return {
    accessToken: result.AuthenticationResult.AccessToken,
    expiresIn: result.AuthenticationResult.ExpiresIn ?? 3600,
  };
}

export async function signUpWithCognito(email: string, password: string) {
  const result = await cognito.send(
    new SignUpCommand({
      ClientId: clientId(),
      Username: email,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }],
    }),
  );
  return { userId: result.UserSub ?? "", confirmed: result.UserConfirmed ?? false };
}

export async function confirmCognitoSignUp(email: string, code: string): Promise<void> {
  await cognito.send(
    new ConfirmSignUpCommand({
      ClientId: clientId(),
      Username: email,
      ConfirmationCode: code,
    }),
  );
}

export async function getUserFromAccessToken(
  accessToken: string | undefined,
): Promise<AuthenticatedUser | null> {
  if (!accessToken) return null;
  try {
    const result = await cognito.send(new GetUserCommand({ AccessToken: accessToken }));
    const id = result.UserAttributes?.find((attribute) => attribute.Name === "sub")?.Value;
    const email = result.UserAttributes?.find((attribute) => attribute.Name === "email")?.Value;
    return id && email
      ? { id, email, auth_username: result.Username }
      : null;
  } catch (error) {
    if (error instanceof Error && error.name === "NotAuthorizedException") return null;
    throw error;
  }
}

export async function listCognitoUsers(): Promise<
  (User & { enabled: boolean })[]
> {
  const users: (User & { enabled: boolean })[] = [];
  let PaginationToken: string | undefined;
  do {
    const result = await cognito.send(
      new ListUsersCommand({ UserPoolId: userPoolId(), PaginationToken, Limit: 60 }),
    );
    for (const user of result.Users || []) {
      const id = user.Attributes?.find((attribute) => attribute.Name === "sub")?.Value;
      const email = user.Attributes?.find((attribute) => attribute.Name === "email")?.Value;
      if (!id || !email) continue;
      users.push({
        id,
        email,
        created_at: user.UserCreateDate?.toISOString() ?? "",
        enabled: user.Enabled ?? true,
        blocked: !(user.Enabled ?? true),
        auth_username: user.Username,
      });
    }
    PaginationToken = result.PaginationToken;
  } while (PaginationToken);
  return users;
}

export async function setCognitoUserBlocked(userId: string, blocked: boolean): Promise<void> {
  const user = (await listCognitoUsers()).find((entry) => entry.id === userId);
  const username = user?.auth_username;
  if (!username) throw new Error("The requested Cognito user does not exist.");

  if (blocked) {
    await cognito.send(
      new AdminDisableUserCommand({ UserPoolId: userPoolId(), Username: username }),
    );
  } else {
    await cognito.send(
      new AdminEnableUserCommand({ UserPoolId: userPoolId(), Username: username }),
    );
  }
}
