import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configure Cloudinary server-side
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
const apiKey = process.env.CLOUDINARY_API_KEY || '';
const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

// Check if valid non-placeholder credentials exist
export const isCloudinaryConfigured = Boolean(
  cloudName &&
  apiKey &&
  apiSecret &&
  !cloudName.includes('your-') &&
  !apiKey.includes('your-')
);

if (isCloudinaryConfigured) {
  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  } catch (err) {
    console.warn('Cloudinary config initialization warning:', err);
  }
}

/**
 * Uploads a payment image buffer to Cloudinary in a secure, server-side environment.
 * If Cloudinary is not configured or fails, gracefully falls back to secure base64 data URI
 * so user submission is never blocked.
 */
export async function uploadPaymentImageToCloudinary(
  buffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<{ public_id: string; secure_url: string; uploadedToCloudinary: boolean }> {
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const publicId = `payment_${uniqueId}`;
  const folder = 'payments';

  if (isCloudinaryConfigured) {
    try {
      const uploadResult = await new Promise<{ public_id: string; secure_url: string }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: 'image',
            transformation: [
              { quality: 'auto:good' },
              { fetch_format: 'auto' },
            ],
          },
          (error, result: UploadApiResponse | undefined) => {
            if (error || !result) {
              return reject(error || new Error('Failed to upload image to Cloudinary'));
            }
            resolve({
              public_id: result.public_id,
              secure_url: result.secure_url,
            });
          }
        );

        uploadStream.end(buffer);
      });

      return {
        ...uploadResult,
        uploadedToCloudinary: true,
      };
    } catch (uploadErr) {
      console.warn('Cloudinary upload notice (falling back to data URI):', uploadErr);
    }
  }

  // Graceful fallback for local development or unconfigured environment
  const safeMime = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
  const base64Image = `data:${safeMime};base64,${buffer.toString('base64')}`;
  return {
    public_id: `${folder}/${publicId}`,
    secure_url: base64Image,
    uploadedToCloudinary: false,
  };
}
