import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import path from "path";




/**
 * Upload a buffer to Google Cloud Storage and return the public URL.
 * Generates a random filename preserving the original extension.
 */
export async function uploadBuffer(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string
): Promise<string> {
  const storage = new Storage({
    projectId: process.env.GCS_PROJECT_ID,
  });

  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME environment variable is not set");
  }

  const ext = path.extname(originalName);
  const filename = `${randomUUID()}${ext}`;
  const destination = `${folder}/${filename}`;

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destination);

  await file.save(buffer, {
    metadata: { contentType: mimeType },
    resumable: false,
  });

  return `https://storage.googleapis.com/${bucketName}/${destination}`;
}
