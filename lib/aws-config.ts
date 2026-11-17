import "server-only";

import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { SESClient } from "@aws-sdk/client-ses";

const region = process.env.AWS_REGION || "us-east-1";

export const dynamoClient = new DynamoDBClient({ region });
export const dynamo = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});
export const s3 = new S3Client({ region });
export const cognito = new CognitoIdentityProviderClient({ region });
export const ses = new SESClient({ region });

export const tableNames = {
  products: requiredEnvironmentVariable("DYNAMODB_PRODUCTS_TABLE"),
  orders: requiredEnvironmentVariable("DYNAMODB_ORDERS_TABLE"),
  users: requiredEnvironmentVariable("DYNAMODB_USERS_TABLE"),
  settings: requiredEnvironmentVariable("DYNAMODB_SETTINGS_TABLE"),
} as const;

export const s3Bucket = requiredEnvironmentVariable("AWS_S3_BUCKET");

export function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
