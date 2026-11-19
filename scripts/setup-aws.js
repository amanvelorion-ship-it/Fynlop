/* eslint-disable @typescript-eslint/no-require-imports */

require("@next/env").loadEnvConfig(process.cwd());

const {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  waitUntilTableExists,
} = require("@aws-sdk/client-dynamodb");
const {
  CognitoIdentityProviderClient,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  ListUserPoolClientsCommand,
  ListUserPoolsCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const {
  GetBucketPolicyCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
  S3Client,
  CreateBucketCommand,
} = require("@aws-sdk/client-s3");
const { SESClient, VerifyEmailIdentityCommand } = require("@aws-sdk/client-ses");

const region = "us-east-1";
const bucketName = "fynlop-store-files";
const poolName = "fynlop-users-pool";
const clientName = "fynlop-web-client";
const sesEmail = process.env.AWS_SES_FROM_EMAIL || "aman.velorion@gmail.com";

const dynamo = new DynamoDBClient({ region });
const s3 = new S3Client({ region });
const cognito = new CognitoIdentityProviderClient({ region });
const ses = new SESClient({ region });

async function ensureTable(tableName) {
  let created = false;
  try {
    await dynamo.send(new DescribeTableCommand({ TableName: tableName }));
  } catch (error) {
    if (error.name !== "ResourceNotFoundException") throw error;
    await dynamo.send(
      new CreateTableCommand({
        TableName: tableName,
        AttributeDefinitions: [
          { AttributeName: "PK", AttributeType: "S" },
          { AttributeName: "SK", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "PK", KeyType: "HASH" },
          { AttributeName: "SK", KeyType: "RANGE" },
        ],
        BillingMode: "PAY_PER_REQUEST",
      }),
    );
    created = true;
  }
  await waitUntilTableExists(
    { client: dynamo, maxWaitTime: 120 },
    { TableName: tableName },
  );
  console.log(`✅ Table ${created ? "ready" : "already exists"}: ${tableName}`);
}

async function ensureBucket() {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
    console.log(`✅ S3 bucket created: ${bucketName}`);
  } catch (error) {
    if (error.name !== "BucketAlreadyOwnedByYou") throw error;
    console.log(`✅ S3 bucket already exists: ${bucketName}`);
  }

  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    }),
  );

  await s3.send(
    new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["content-type"],
            AllowedMethods: ["PUT"],
            AllowedOrigins: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
  console.log("✅ S3 CORS configured for signed browser uploads");

  let policy = { Version: "2012-10-17", Statement: [] };
  try {
    const existing = await s3.send(new GetBucketPolicyCommand({ Bucket: bucketName }));
    policy = JSON.parse(existing.Policy);
  } catch (error) {
    if (error.name !== "NoSuchBucketPolicy") throw error;
  }

  policy.Statement = (policy.Statement || []).filter(
    (statement) => statement.Sid !== "FynlopPublicAssets",
  );
  policy.Statement.push({
    Sid: "FynlopPublicAssets",
    Effect: "Allow",
    Principal: "*",
    Action: "s3:GetObject",
    Resource: [
      `arn:aws:s3:::${bucketName}/covers/*`,
      `arn:aws:s3:::${bucketName}/previews/*`,
      `arn:aws:s3:::${bucketName}/logos/*`,
    ],
  });
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(policy),
    }),
  );
  console.log("✅ S3 policy configured for public covers, previews, and logos");
}

async function ensureCognito() {
  const pools = [];
  let nextToken;
  do {
    const result = await cognito.send(
      new ListUserPoolsCommand({ MaxResults: 60, NextToken: nextToken }),
    );
    pools.push(...(result.UserPools || []));
    nextToken = result.NextToken;
  } while (nextToken);

  let pool = pools.find((item) => item.Name === poolName);
  if (!pool) {
    const result = await cognito.send(
      new CreateUserPoolCommand({
        PoolName: poolName,
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireUppercase: false,
            RequireLowercase: false,
            RequireNumbers: false,
            RequireSymbols: false,
          },
        },
        AutoVerifiedAttributes: ["email"],
        UsernameAttributes: ["email"],
      }),
    );
    pool = result.UserPool;
  }
  if (!pool?.Id) throw new Error("Could not resolve the Cognito user pool ID.");

  const clients = await cognito.send(
    new ListUserPoolClientsCommand({
      UserPoolId: pool.Id,
      MaxResults: 60,
    }),
  );
  let client = clients.UserPoolClients?.find((item) => item.ClientName === clientName);
  if (!client) {
    const result = await cognito.send(
      new CreateUserPoolClientCommand({
        UserPoolId: pool.Id,
        ClientName: clientName,
        GenerateSecret: false,
        ExplicitAuthFlows: [
          "ALLOW_USER_PASSWORD_AUTH",
          "ALLOW_REFRESH_TOKEN_AUTH",
          "ALLOW_USER_SRP_AUTH",
        ],
      }),
    );
    client = result.UserPoolClient;
  }
  if (!client?.ClientId) throw new Error("Could not resolve the Cognito app client ID.");

  console.log(`✅ Cognito Pool: ${pool.Id}`);
  console.log(`✅ Cognito Client: ${client.ClientId}`);
  return { poolId: pool.Id, clientId: client.ClientId };
}

async function setup() {
  console.log("🚀 Setting up FYNLOP AWS...");

  for (const tableName of [
    "fynlop-products",
    "fynlop-orders",
    "fynlop-users",
    "fynlop-settings",
  ]) {
    await ensureTable(tableName);
  }

  await ensureBucket();
  const { poolId, clientId } = await ensureCognito();
  await ses.send(new VerifyEmailIdentityCommand({ EmailAddress: sesEmail }));
  console.log(`✅ SES verification requested for ${sesEmail}`);

  console.log("\nAdd or update these values in .env.local:");
  console.log(`AWS_REGION=${region}`);
  console.log(`AWS_COGNITO_USER_POOL_ID=${poolId}`);
  console.log(`AWS_COGNITO_CLIENT_ID=${clientId}`);
  console.log(`AWS_S3_BUCKET=${bucketName}`);
  console.log("DYNAMODB_PRODUCTS_TABLE=fynlop-products");
  console.log("DYNAMODB_ORDERS_TABLE=fynlop-orders");
  console.log("DYNAMODB_USERS_TABLE=fynlop-users");
  console.log("DYNAMODB_SETTINGS_TABLE=fynlop-settings");
}

setup().catch((error) => {
  console.error("AWS setup failed:", error);
  process.exitCode = 1;
});
