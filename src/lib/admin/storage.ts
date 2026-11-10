/**
 * Cloudflare R2 through its S3-compatible API (#8). Server-only.
 * R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL in hPanel.
 * R2_ENDPOINT overrides the endpoint (CI points it at MinIO).
 */
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export function r2Configured(): boolean {
  const e = process.env;
  return !!(e.R2_BUCKET && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY && e.R2_PUBLIC_URL && (e.R2_ACCOUNT_ID || e.R2_ENDPOINT));
}

const g = globalThis as unknown as { __eivS3?: S3Client };

function client(): S3Client {
  const e = process.env;
  g.__eivS3 ??= new S3Client({
    region: 'auto',
    endpoint: e.R2_ENDPOINT || `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: e.R2_ACCESS_KEY_ID!, secretAccessKey: e.R2_SECRET_ACCESS_KEY! },
    // MinIO needs path-style; R2 accepts both.
    forcePathStyle: !!e.R2_ENDPOINT,
  });
  return g.__eivS3;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Keys are unique per upload (uuid), so they can be cached forever.
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const res = await client().send(
    new DeleteObjectsCommand({ Bucket: process.env.R2_BUCKET, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }),
  );
  if (res.Errors?.length) throw new Error(`R2 delete failed: ${res.Errors.map((x) => x.Key).join(', ')}`);
}
