import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Logos, templates, signatures — long CDN cache. */
export const CACHE_CONTROL_PUBLIC_ASSET =
  "public, max-age=31536000, immutable";

/** Certificate PDFs — short private cache; keys are unguessable. */
export const CACHE_CONTROL_PDF = "private, max-age=3600";

function isCertificateKey(key: string): boolean {
  return key.startsWith("certificates/");
}

function localObjectFilename(key: string): string {
  return key.replace(/\//g, "_");
}

function privateCertificateDir(): string {
  return path.join(process.cwd(), ".data", "certificates");
}

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

/** Certificate PDFs stay private; logos/templates may use R2_PUBLIC_URL. */
export function publicUrlForObjectKey(
  key: string,
  publicBase: string | undefined,
): string | null {
  if (key.startsWith("certificates/")) return null;
  if (!publicBase) return null;
  return `${publicBase.replace(/\/$/, "")}/${key}`;
}

export async function uploadObject(input: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
}): Promise<{ key: string; url: string }> {
  const cacheControl =
    input.cacheControl ??
    (input.key.startsWith("certificates/")
      ? CACHE_CONTROL_PDF
      : CACHE_CONTROL_PUBLIC_ASSET);

  if (r2Configured()) {
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME!;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: cacheControl,
      }),
    );
    const publicUrl = publicUrlForObjectKey(
      input.key,
      process.env.R2_PUBLIC_URL,
    );
    const url =
      publicUrl ??
      (await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: input.key }),
        { expiresIn: 60 * 60 * 24 * 7 },
      ));
    return { key: input.key, url };
  }

  const filename = localObjectFilename(input.key);
  if (isCertificateKey(input.key)) {
    const dir = privateCertificateDir();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), input.body);
    return { key: input.key, url: "" };
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), input.body);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return { key: input.key, url: `${appUrl}/uploads/${filename}` };
}

export async function getShortLivedObjectUrl(
  key: string,
  expiresInSeconds = 120,
): Promise<string | null> {
  if (r2Configured()) {
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME!;
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }
  if (isCertificateKey(key)) return null;

  const filename = localObjectFilename(key);
  const filePath = path.join(process.cwd(), "public", "uploads", filename);
  try {
    const { access } = await import("node:fs/promises");
    await access(filePath);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
      /\/$/,
      "",
    );
    return `${appUrl}/uploads/${filename}`;
  } catch {
    return null;
  }
}

/** Local disk only. Private .data/ — not leftover public/uploads copies. */
export async function readLocalCertificatePdf(
  key: string,
): Promise<Buffer | null> {
  if (!isCertificateKey(key)) return null;
  const filename = localObjectFilename(key);
  const { readFile } = await import("node:fs/promises");
  try {
    return await readFile(path.join(privateCertificateDir(), filename));
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  if (r2Configured()) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME!;
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
    return;
  }
  const filename = localObjectFilename(key);
  const { unlink } = await import("node:fs/promises");
  for (const filePath of [
    path.join(privateCertificateDir(), filename),
    path.join(process.cwd(), "public", "uploads", filename),
  ]) {
    try {
      await unlink(filePath);
    } catch {
      /* already gone */
    }
  }
}

export function buildObjectKey(
  folder: "templates" | "certificates" | "logos" | "signatures",
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
      CacheControl: CACHE_CONTROL_PUBLIC_ASSET,
    }),
    { expiresIn: 60 * 10 },
  );
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  const publicUrl = publicBase
    ? `${publicBase}/${input.key}`
    : uploadUrl.split("?")[0];
  return { uploadUrl, publicUrl, key: input.key };
}

export async function pingR2(): Promise<boolean | "skipped"> {
  if (!r2Configured()) return "skipped";
  try {
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME!;
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: "__health__" }));
    return true;
  } catch (error) {
    // Missing probe key is fine — 404 means the bucket is reachable.
    const name =
      typeof error === "object" && error && "name" in error
        ? String((error as { name: string }).name)
        : "";
    const code =
      typeof error === "object" && error && "$metadata" in error
        ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode
        : undefined;
    if (name === "NotFound" || code === 404) return true;
    if (code === 403 || code === 401) return false;
    return code === 404 || name.includes("NoSuchKey") ? true : false;
  }
}
