import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME,
  );
}

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID!;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadObject(input: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ key: string; url: string }> {
  if (r2Configured()) {
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME!;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
    const url = publicBase
      ? `${publicBase}/${input.key}`
      : await getSignedUrl(
          client,
          new GetObjectCommand({ Bucket: bucket, Key: input.key }),
          { expiresIn: 60 * 60 * 24 * 7 },
        );
    return { key: input.key, url };
  }

  // Local fallback for development without R2 credentials
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const filename = input.key.replace(/\//g, "_");
  await writeFile(path.join(uploadsDir, filename), input.body);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return { key: input.key, url: `${appUrl}/uploads/${filename}` };
}

export function buildObjectKey(
  folder: "templates" | "certificates",
  clubId: string,
  ext: string,
): string {
  return `${folder}/${clubId}/${randomUUID()}.${ext.replace(/^\./, "")}`;
}

export async function createPresignedUploadUrl(input: {
  key: string;
  contentType: string;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string } | null> {
  if (!r2Configured()) return null;
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME!;
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      ContentType: input.contentType,
    }),
    { expiresIn: 60 * 10 },
  );
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  const publicUrl = publicBase
    ? `${publicBase}/${input.key}`
    : uploadUrl.split("?")[0];
  return { uploadUrl, publicUrl, key: input.key };
}
