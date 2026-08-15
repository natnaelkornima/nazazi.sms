import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '';
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || '';
const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || '';

// Initialize S3Client configured for Cloudflare R2
const r2Client =
  accountId && accessKeyId && secretAccessKey
    ? new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    : null;

/**
 * Uploads a file buffer to Cloudflare R2 securely.
 * Supports jpg, jpeg, png, webp up to 5MB.
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  contentType: string,
  extension: string
): Promise<{ key: string; url: string }> {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  const key = `payments/${uniqueId}.${extension}`;

  if (r2Client && bucketName) {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await r2Client.send(command);

    // Compute accessible image URL
    const url = publicDomain
      ? `${publicDomain.replace(/\/$/, '')}/${key}`
      : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;

    return { key, url };
  }

  // Fallback if R2 credentials are not configured yet: generate a standard data object key and data URI
  const url = `data:${contentType};base64,${fileBuffer.toString('base64')}`;
  return { key, url };
}
