import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, s3Bucket } from "./aws-config";

export async function createUploadUrl(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 600 },
  );
}

export async function getFileMetadata(key: string): Promise<{
  contentLength?: number;
  contentType?: string;
}> {
  const result = await s3.send(new HeadObjectCommand({ Bucket: s3Bucket, Key: key }));
  return { contentLength: result.ContentLength, contentType: result.ContentType };
}

export async function hasPdfHeader(key: string): Promise<boolean> {
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Range: "bytes=0-4",
    }),
  );
  if (!result.Body) return false;
  const bytes = await result.Body.transformToByteArray();
  return new TextDecoder().decode(bytes) === "%PDF-";
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: key }));
}

export async function deleteFiles(keys: string[]): Promise<void> {
  await Promise.all(keys.map(deleteFile));
}

export async function fileExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: s3Bucket, Key: key }));
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "$metadata" in error &&
      typeof error.$metadata === "object" &&
      error.$metadata !== null &&
      "httpStatusCode" in error.$metadata &&
      error.$metadata.httpStatusCode === 404
    ) {
      return false;
    }
    throw error;
  }
}

export async function createDownloadUrl(key: string, expiresIn = 300): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: s3Bucket, Key: key }),
    { expiresIn },
  );
}

export function getPublicFileUrl(key: string): string {
  const region = process.env.AWS_REGION || "us-east-1";
  return `https://${s3Bucket}.s3.${region}.amazonaws.com/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function getUploadedFileKey(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  if (!path.startsWith("http://") && !path.startsWith("https://")) {
    return path.split("/").every((part) => part && part !== "." && part !== "..")
      ? path
      : null;
  }

  try {
    const url = new URL(path);
    const region = process.env.AWS_REGION || "us-east-1";
    const bucketPrefix = `/${s3Bucket}/`;
    const objectPath =
      url.hostname === `${s3Bucket}.s3.${region}.amazonaws.com`
        ? url.pathname.slice(1)
        : url.hostname === `s3.${region}.amazonaws.com` && url.pathname.startsWith(bucketPrefix)
          ? url.pathname.slice(bucketPrefix.length)
          : null;
    if (!objectPath) return null;
    const key = decodeURIComponent(objectPath);
    return key.split("/").every((part) => part && part !== "." && part !== "..")
      ? key
      : null;
  } catch {
    return null;
  }
}
