import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

function parseCloudinaryUrl(urlStr: string) {
  if (!urlStr) return null;
  const cleaned = urlStr.trim().replace(/^['"]|['"]$/g, '');
  if (!cleaned.startsWith('cloudinary://')) return null;
  try {
    const raw = cleaned.replace('cloudinary://', '');
    const [auth, cloud] = raw.split('@');
    if (!auth || !cloud) return null;
    const [key, secret] = auth.split(':');
    return {
      apiKey: (key || '').trim(),
      apiSecret: (secret || '').trim(),
      cloudName: (cloud || '').trim().replace(/\/.*$/, ''),
    };
  } catch {
    return null;
  }
}

export function getCloudinaryCredentials() {
  const urlFromEnv = process.env.CLOUDINARY_URL || '';
  const parsedFromUrl = parseCloudinaryUrl(urlFromEnv);

  const rawCloudName =
    parsedFromUrl?.cloudName ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUD_NAME ||
    process.env.CLOUDINARY_NAME ||
    '';

  const rawApiKey =
    parsedFromUrl?.apiKey ||
    process.env.CLOUDINARY_API_KEY ||
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ||
    process.env.CLOUDINARY_KEY ||
    '';

  const rawApiSecret =
    parsedFromUrl?.apiSecret ||
    process.env.CLOUDINARY_API_SECRET ||
    process.env.CLOUDINARY_SECRET ||
    process.env.CLOUDINARY_API_SECRET_KEY ||
    '';

  // Sanitize: remove quotes, whitespace, or placeholder defaults
  const cloudName = rawCloudName.trim().replace(/^['"]|['"]$/g, '');
  const apiKey = rawApiKey.trim().replace(/^['"]|['"]$/g, '');
  const apiSecret = rawApiSecret.trim().replace(/^['"]|['"]$/g, '');

  const isConfigured = Boolean(
    cloudName &&
    apiKey &&
    apiSecret &&
    !cloudName.toLowerCase().includes('your-') &&
    !apiKey.toLowerCase().includes('your-') &&
    !cloudName.toLowerCase().includes('placeholder')
  );

  return { cloudName, apiKey, apiSecret, isConfigured };
}

export const isCloudinaryConfigured = (): boolean => getCloudinaryCredentials().isConfigured;

/**
 * Configure or refresh Cloudinary instance dynamically
 */
function configureCloudinary() {
  const { cloudName, apiKey, apiSecret, isConfigured } = getCloudinaryCredentials();
  if (!isConfigured) return false;

  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    return true;
  } catch (err) {
    console.warn('Cloudinary config initialization warning:', err);
    return false;
  }
}

/**
 * Uploads a payment image buffer or base64 data URI to Cloudinary in a secure, server-side environment.
 * If Cloudinary is not configured or fails, gracefully falls back to secure base64 data URI
 * so user submission is never blocked, and provides full error diagnostic feedback.
 */
export async function uploadPaymentImageToCloudinary(
  bufferOrDataUri: Buffer | string,
  mimeType: string = 'image/jpeg'
): Promise<{
  public_id: string;
  secure_url: string;
  uploadedToCloudinary: boolean;
  error?: string;
  cloudName?: string;
}> {
  const { cloudName, isConfigured } = getCloudinaryCredentials();
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const publicId = `payment_${uniqueId}`;
  const folder = 'payments';

  // Prepare standard base64 data URI
  let base64DataUri = '';
  if (typeof bufferOrDataUri === 'string') {
    if (bufferOrDataUri.startsWith('data:')) {
      base64DataUri = bufferOrDataUri;
    } else {
      const safeMime = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
      base64DataUri = `data:${safeMime};base64,${bufferOrDataUri}`;
    }
  } else if (Buffer.isBuffer(bufferOrDataUri)) {
    const safeMime = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
    base64DataUri = `data:${safeMime};base64,${bufferOrDataUri.toString('base64')}`;
  }

  if (isConfigured && configureCloudinary()) {
    try {
      // Primary: Direct Base64 API upload
      const uploadResult: UploadApiResponse = await cloudinary.uploader.upload(base64DataUri, {
        folder,
        public_id: publicId,
        resource_type: 'auto',
        overwrite: true,
      });

      if (uploadResult && uploadResult.secure_url) {
        return {
          public_id: uploadResult.public_id || `${folder}/${publicId}`,
          secure_url: uploadResult.secure_url,
          uploadedToCloudinary: true,
          cloudName,
        };
      }
    } catch (uploadErr: unknown) {
      const errMsg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
      console.error('Cloudinary Direct Upload Error:', errMsg);

      // Secondary Attempt: Upload Stream with buffer if available
      if (Buffer.isBuffer(bufferOrDataUri)) {
        try {
          const streamResult = await new Promise<UploadApiResponse>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder,
                public_id: publicId,
                resource_type: 'auto',
              },
              (err, res) => {
                if (err || !res) return reject(err || new Error('Stream upload failed'));
                resolve(res);
              }
            );
            stream.end(bufferOrDataUri);
          });

          if (streamResult && streamResult.secure_url) {
            return {
              public_id: streamResult.public_id || `${folder}/${publicId}`,
              secure_url: streamResult.secure_url,
              uploadedToCloudinary: true,
              cloudName,
            };
          }
        } catch (streamErr) {
          console.error('Cloudinary Stream Upload Fallback Error:', streamErr);
        }
      }

      return {
        public_id: `${folder}/${publicId}`,
        secure_url: base64DataUri,
        uploadedToCloudinary: false,
        error: `Cloudinary upload failed: ${errMsg}`,
        cloudName,
      };
    }
  }

  // Graceful fallback for local development or unconfigured environment
  return {
    public_id: `${folder}/${publicId}`,
    secure_url: base64DataUri,
    uploadedToCloudinary: false,
    error: isConfigured ? 'Cloudinary initialization failed' : 'Cloudinary credentials not configured',
    cloudName: cloudName || undefined,
  };
}

