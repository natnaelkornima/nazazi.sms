/**
 * Compresses an image file or base64 data URL to an optimized, crisp JPEG
 * with a maximum dimension of 1400px and ~80-85% quality.
 * This reduces 5MB-15MB mobile photos to ~100-250KB, preventing HTTP 413
 * and payload timeout errors while maintaining full legibility of text & receipts.
 */
export async function compressImage(
  source: File | string,
  maxDimension: number = 1400,
  quality: number = 0.82
): Promise<{ file: File; dataUrl: string }> {
  return new Promise((resolve) => {
    // If not in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      if (typeof source === 'string') {
        const dummy = new File([], 'receipt.jpg', { type: 'image/jpeg' });
        return resolve({ file: dummy, dataUrl: source });
      }
      return resolve({ file: source, dataUrl: '' });
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        if (typeof source === 'string') {
          const fallback = new File([], 'receipt.jpg', { type: 'image/jpeg' });
          return resolve({ file: fallback, dataUrl: source });
        }
        return resolve({ file: source, dataUrl: '' });
      }

      // Calculate constrained dimensions
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        if (typeof source === 'string') {
          const fallback = new File([], 'receipt.jpg', { type: 'image/jpeg' });
          return resolve({ file: fallback, dataUrl: source });
        }
        return resolve({ file: source, dataUrl: '' });
      }

      // Draw with smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], 'receipt.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve({ file: compressedFile, dataUrl: compressedDataUrl });
          } else {
            const fallbackFile =
              typeof source === 'string'
                ? new File([], 'receipt.jpg', { type: 'image/jpeg' })
                : source;
            resolve({ file: fallbackFile, dataUrl: compressedDataUrl });
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      if (typeof source === 'string') {
        const fallback = new File([], 'receipt.jpg', { type: 'image/jpeg' });
        resolve({ file: fallback, dataUrl: source });
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            file: source,
            dataUrl: typeof reader.result === 'string' ? reader.result : '',
          });
        };
        reader.onerror = () => {
          resolve({ file: source, dataUrl: '' });
        };
        reader.readAsDataURL(source);
      }
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    }
  });
}
