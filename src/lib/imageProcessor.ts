import { supabase } from './supabase';

export interface ProcessedImageResult {
  blob: Blob;
  dataUrl: string;
  sizeBytes: number;
  width: number;
  height: number;
}

/**
 * In-browser image processing:
 * 1. Centers-crops any source photo to 1:1 square.
 * 2. Resizes to 600 x 600 px using high-quality bicubic canvas interpolation.
 * 3. Iteratively optimizes WebP compression so resulting file is under ~40 KB (40960 bytes).
 */
export async function cropAndCompressImage(
  file: File,
  options: { size?: number; maxBytes?: number } = {}
): Promise<ProcessedImageResult> {
  const targetSize = options.size || 600;
  const maxBytes = options.maxBytes || 40 * 1024; // 40 KB

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas 2D rendering context'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fill with crisp white background in case source has transparency
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetSize, targetSize);

        // Calculate center square crop coordinates
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        const cropDim = Math.min(srcW, srcH);
        const cropX = (srcW - cropDim) / 2;
        const cropY = (srcH - cropDim) / 2;

        // Draw cropped & scaled image
        ctx.drawImage(img, cropX, cropY, cropDim, cropDim, 0, 0, targetSize, targetSize);

        // Iterative compression quality loop to ensure <= maxBytes (40 KB)
        const qualities = [0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4];
        let bestBlob: Blob | null = null;

        for (const q of qualities) {
          const blob = await new Promise<Blob | null>((res) => {
            canvas.toBlob(res, 'image/webp', q);
          });

          if (blob) {
            bestBlob = blob;
            if (blob.size <= maxBytes) {
              break;
            }
          }
        }

        if (!bestBlob) {
          reject(new Error('Failed to encode image to WebP format'));
          return;
        }

        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        resolve({
          blob: bestBlob,
          dataUrl,
          sizeBytes: bestBlob.size,
          width: targetSize,
          height: targetSize,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file into browser'));
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads a WebP image blob to Supabase Storage with long-lived immutable cache headers.
 * Returns the public URL of the uploaded image.
 */
export async function uploadProductImage(
  blob: Blob,
  filename: string,
  folder = 'products'
): Promise<string> {
  const cleanName = filename.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  const baseName = cleanName.endsWith('.webp') ? cleanName : `${cleanName}.webp`;
  const storagePath = `${folder}/${Date.now()}-${baseName}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(storagePath, blob, {
      contentType: 'image/webp',
      cacheControl: '31536000, immutable', // 1 year long-lived cache header
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(storagePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to retrieve public URL from Supabase Storage');
  }

  return urlData.publicUrl;
}
