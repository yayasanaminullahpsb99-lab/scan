import { DocumentFilter, CropRect } from '../types';

/**
 * Loads an image from a DataURL or URL into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Converts a File or Blob into a base64 DataURL
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Applies crop, rotation, brightness, contrast, and document filters using an offscreen canvas
 */
export async function processImage(
  sourceUrl: string,
  filter: DocumentFilter = 'magic',
  rotation: number = 0,
  brightness: number = 0, // -100 to 100
  contrast: number = 0, // -100 to 100
  crop?: CropRect
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImage(sourceUrl);

  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  // Step 1: Handle Crop
  let cropX = 0;
  let cropY = 0;
  let cropW = naturalWidth;
  let cropH = naturalHeight;

  if (crop && crop.width > 0 && crop.height > 0) {
    cropX = Math.max(0, Math.floor((crop.x / 100) * naturalWidth));
    cropY = Math.max(0, Math.floor((crop.y / 100) * naturalHeight));
    cropW = Math.min(naturalWidth - cropX, Math.floor((crop.width / 100) * naturalWidth));
    cropH = Math.min(naturalHeight - cropY, Math.floor((crop.height / 100) * naturalHeight));
  }

  // Step 2: Handle Rotation
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const isRotated90 = normalizedRotation === 90 || normalizedRotation === 270;

  const outWidth = isRotated90 ? cropH : cropW;
  const outHeight = isRotated90 ? cropW : cropH;

  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Canvas 2D context tidak tersedia');
  }

  // Draw rotated & cropped image
  ctx.save();
  ctx.translate(outWidth / 2, outHeight / 2);
  ctx.rotate((normalizedRotation * Math.PI) / 180);

  // Draw source cropped rect centered
  ctx.drawImage(
    img,
    cropX,
    cropY,
    cropW,
    cropH,
    -cropW / 2,
    -cropH / 2,
    cropW,
    cropH
  );
  ctx.restore();

  // Step 3: Apply Pixel Processing for Filters & Brightness/Contrast
  const imgData = ctx.getImageData(0, 0, outWidth, outHeight);
  const data = imgData.data;
  const len = data.length;

  // Calculate contrast multiplier [-100, 100] -> factor
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const brightnessOffset = (brightness / 100) * 128;

  // We can calculate average luminance to inform adaptive filters
  let sumLum = 0;
  // Sample every 4th pixel for speed
  const step = 16;
  let sampleCount = 0;
  for (let i = 0; i < len; i += step) {
    sumLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sampleCount++;
  }
  const avgLum = sampleCount > 0 ? sumLum / sampleCount : 128;

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Standard brightness and contrast adjustments first
    if (brightness !== 0 || contrast !== 0) {
      r = contrastFactor * (r - 128) + 128 + brightnessOffset;
      g = contrastFactor * (g - 128) + 128 + brightnessOffset;
      b = contrastFactor * (b - 128) + 128 + brightnessOffset;

      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));
    }

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    switch (filter) {
      case 'original':
        // Keep RGB as adjusted
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        break;

      case 'magic': {
        // Magic Color (CamScanner style):
        // Turns grayish/yellow paper to clean white, while boosting dark ink/pen and preserving stamps
        // Adaptive stretch:
        const paperWhiteThreshold = Math.max(130, avgLum * 0.95);
        if (lum > paperWhiteThreshold) {
          // Push background pixels smoothly to clean paper white
          const t = (lum - paperWhiteThreshold) / (255 - paperWhiteThreshold);
          const boost = t * 1.25;
          r = Math.min(255, r + (255 - r) * boost);
          g = Math.min(255, g + (255 - g) * boost);
          b = Math.min(255, b + (255 - b) * boost);
        } else {
          // Darken and sharpen text
          const factor = 1.35;
          r = Math.max(0, lum < 90 ? r * 0.8 : r * factor - 35);
          g = Math.max(0, lum < 90 ? g * 0.8 : g * factor - 35);
          b = Math.max(0, lum < 90 ? b * 0.8 : b * factor - 35);
        }
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
        break;
      }

      case 'bw': {
        // High-contrast clean black-and-white (Otsu-like dynamic thresholding)
        const threshold = Math.max(90, Math.min(170, avgLum * 0.92));
        const val = lum >= threshold ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        break;
      }

      case 'grayscale': {
        // Smooth clean document grayscale
        // Stretch grayscale slightly for better paper readability
        const stretched = lum > 140 ? Math.min(255, lum * 1.15) : Math.max(0, lum * 0.9);
        data[i] = stretched;
        data[i + 1] = stretched;
        data[i + 2] = stretched;
        break;
      }

      case 'contrast': {
        // High contrast color
        const cf = 1.7;
        const cr = Math.max(0, Math.min(255, cf * (r - 128) + 128 + 20));
        const cg = Math.max(0, Math.min(255, cf * (g - 128) + 128 + 20));
        const cb = Math.max(0, Math.min(255, cf * (b - 128) + 128 + 20));
        data[i] = cr;
        data[i + 1] = cg;
        data[i + 2] = cb;
        break;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Export as high quality JPEG DataURL
  const processedDataUrl = canvas.toDataURL('image/jpeg', 0.92);

  return {
    dataUrl: processedDataUrl,
    width: outWidth,
    height: outHeight,
  };
}
