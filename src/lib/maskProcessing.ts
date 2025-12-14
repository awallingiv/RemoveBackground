/**
 * Mask Processing and Compositing Utilities
 *
 * This module handles:
 * 1. Converting model output to a usable mask
 * 2. Resizing mask to match working image dimensions
 * 3. Smoothing and feathering the mask
 * 4. Defringing/halo reduction
 * 5. Compositing the subject with various backgrounds
 */

import { MODEL_INPUT_SIZE, DEFAULT_POSTPROCESS_CONFIG, type BackgroundMode } from './constants';

export interface PostprocessConfig {
  smoothingSigma: number;
  featherAmount: number;
  threshold: number;
  defringe: boolean;
  defringeRadius: number;
}

/**
 * Convert raw model output to a normalized mask
 *
 * U2Net outputs values in range [0, 1] where:
 * - 1 = foreground (subject)
 * - 0 = background
 *
 * The output is a single-channel mask of shape [1, 1, H, W]
 */
export function normalizeModelOutput(
  rawOutput: Float32Array,
  outputWidth: number = MODEL_INPUT_SIZE,
  outputHeight: number = MODEL_INPUT_SIZE
): Float32Array {
  const size = outputWidth * outputHeight;

  // Handle case where output might be larger (multiple outputs concatenated)
  const mask = rawOutput.length > size ? rawOutput.slice(0, size) : rawOutput;

  // Normalize to [0, 1] range
  // Find min/max for normalization (some models output unnormalized values)
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < mask.length; i++) {
    if (mask[i] < min) min = mask[i];
    if (mask[i] > max) max = mask[i];
  }

  const range = max - min;
  const normalized = new Float32Array(mask.length);

  if (range > 0) {
    for (let i = 0; i < mask.length; i++) {
      normalized[i] = (mask[i] - min) / range;
    }
  } else {
    // All same value, return as-is (clamped to 0-1)
    for (let i = 0; i < mask.length; i++) {
      normalized[i] = Math.max(0, Math.min(1, mask[i]));
    }
  }

  return normalized;
}

/**
 * Resize mask from model output size to target dimensions
 * Uses bilinear interpolation for smooth results
 */
export function resizeMask(
  mask: Float32Array,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): Float32Array {
  const result = new Float32Array(dstWidth * dstHeight);

  const xRatio = srcWidth / dstWidth;
  const yRatio = srcHeight / dstHeight;

  for (let y = 0; y < dstHeight; y++) {
    for (let x = 0; x < dstWidth; x++) {
      // Map destination coords to source coords
      const srcX = x * xRatio;
      const srcY = y * yRatio;

      // Bilinear interpolation
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(x0 + 1, srcWidth - 1);
      const y1 = Math.min(y0 + 1, srcHeight - 1);

      const xFrac = srcX - x0;
      const yFrac = srcY - y0;

      // Get four surrounding pixels
      const tl = mask[y0 * srcWidth + x0];
      const tr = mask[y0 * srcWidth + x1];
      const bl = mask[y1 * srcWidth + x0];
      const br = mask[y1 * srcWidth + x1];

      // Interpolate
      const top = tl + (tr - tl) * xFrac;
      const bottom = bl + (br - bl) * xFrac;
      const value = top + (bottom - top) * yFrac;

      result[y * dstWidth + x] = value;
    }
  }

  return result;
}

/**
 * Apply Gaussian blur to mask for smoothing
 * Uses separable 1D convolution for efficiency
 */
export function gaussianBlur(
  mask: Float32Array,
  width: number,
  height: number,
  sigma: number
): Float32Array {
  if (sigma <= 0) {
    return mask.slice();
  }

  // Calculate kernel size (6*sigma covers 99.7% of distribution)
  const kernelSize = Math.max(3, Math.ceil(sigma * 6) | 1); // Ensure odd
  const halfKernel = Math.floor(kernelSize / 2);

  // Generate 1D Gaussian kernel
  const kernel = new Float32Array(kernelSize);
  let sum = 0;

  for (let i = 0; i < kernelSize; i++) {
    const x = i - halfKernel;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }

  // Normalize kernel
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum;
  }

  // Horizontal pass
  const temp = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;

      for (let k = 0; k < kernelSize; k++) {
        const sx = Math.max(0, Math.min(width - 1, x + k - halfKernel));
        value += mask[y * width + sx] * kernel[k];
      }

      temp[y * width + x] = value;
    }
  }

  // Vertical pass
  const result = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;

      for (let k = 0; k < kernelSize; k++) {
        const sy = Math.max(0, Math.min(height - 1, y + k - halfKernel));
        value += temp[sy * width + x] * kernel[k];
      }

      result[y * width + x] = value;
    }
  }

  return result;
}

/**
 * Apply feathering to mask edges
 * Creates a smooth transition at the boundaries
 */
export function featherMask(
  mask: Float32Array,
  width: number,
  height: number,
  amount: number
): Float32Array {
  if (amount <= 0) {
    return mask.slice();
  }

  // Feathering is essentially edge-aware blurring
  // We blur the mask slightly and blend based on edge proximity
  const blurred = gaussianBlur(mask, width, height, amount);

  return blurred;
}

/**
 * Apply threshold to create a sharper mask
 * Values below threshold -> 0, above -> remapped to 0-1
 */
export function thresholdMask(
  mask: Float32Array,
  threshold: number
): Float32Array {
  const result = new Float32Array(mask.length);

  for (let i = 0; i < mask.length; i++) {
    if (mask[i] < threshold) {
      result[i] = 0;
    } else {
      // Remap threshold..1 to 0..1
      result[i] = (mask[i] - threshold) / (1 - threshold);
    }
  }

  return result;
}

/**
 * Defringe/reduce halo artifacts at mask edges
 *
 * This simple approach shrinks the mask slightly at edges
 * to remove color bleeding from the background
 */
export function defringeMask(
  mask: Float32Array,
  width: number,
  height: number,
  radius: number
): Float32Array {
  if (radius <= 0) {
    return mask.slice();
  }

  const result = new Float32Array(mask.length);
  const r = Math.ceil(radius);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const currentValue = mask[idx];

      // Only process edge pixels (not fully opaque or transparent)
      if (currentValue > 0.1 && currentValue < 0.9) {
        // Find minimum value in neighborhood
        let minValue = currentValue;

        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= radius) {
                const nidx = ny * width + nx;
                if (mask[nidx] < minValue) {
                  minValue = mask[nidx];
                }
              }
            }
          }
        }

        // Blend towards minimum (shrink edges)
        result[idx] = currentValue * 0.7 + minValue * 0.3;
      } else {
        result[idx] = currentValue;
      }
    }
  }

  return result;
}

/**
 * Full mask postprocessing pipeline
 */
export function postprocessMask(
  rawMask: Float32Array,
  targetWidth: number,
  targetHeight: number,
  config: Partial<PostprocessConfig> = {}
): Float32Array {
  const fullConfig = { ...DEFAULT_POSTPROCESS_CONFIG, ...config };

  // 1. Normalize model output
  let mask = normalizeModelOutput(rawMask);

  // 2. Resize to target dimensions
  mask = resizeMask(mask, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, targetWidth, targetHeight);

  // 3. Apply threshold
  mask = thresholdMask(mask, fullConfig.threshold);

  // 4. Smooth edges
  mask = gaussianBlur(mask, targetWidth, targetHeight, fullConfig.smoothingSigma);

  // 5. Feather edges
  mask = featherMask(mask, targetWidth, targetHeight, fullConfig.featherAmount);

  // 6. Defringe if enabled
  if (fullConfig.defringe) {
    mask = defringeMask(mask, targetWidth, targetHeight, fullConfig.defringeRadius);
  }

  return mask;
}

/**
 * Apply mask to create transparent PNG
 * Returns canvas with alpha channel applied
 */
export function applyMaskToImage(
  image: ImageBitmap,
  mask: Float32Array
): OffscreenCanvas {
  const { width, height } = image;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw original image
  ctx.drawImage(image, 0, 0);

  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // Apply mask to alpha channel
  for (let i = 0; i < mask.length; i++) {
    const alpha = Math.round(mask[i] * 255);
    pixels[i * 4 + 3] = alpha; // Alpha channel
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

/**
 * Composite subject onto solid color background
 */
export function compositeOnSolidColor(
  image: ImageBitmap,
  mask: Float32Array,
  color: string // CSS color string
): OffscreenCanvas {
  const { width, height } = image;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Fill with background color
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  // Draw subject
  const subjectCanvas = applyMaskToImage(image, mask);
  ctx.drawImage(subjectCanvas, 0, 0);

  return canvas;
}

/**
 * Create blurred version of image
 */
export function createBlurredBackground(
  image: ImageBitmap,
  blurRadius: number = 20
): OffscreenCanvas {
  const { width, height } = image;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Apply CSS filter for blur (simpler than manual convolution)
  ctx.filter = `blur(${blurRadius}px)`;
  ctx.drawImage(image, 0, 0);
  ctx.filter = 'none';

  return canvas;
}

/**
 * Composite subject onto blurred background
 */
export function compositeOnBlurredBackground(
  image: ImageBitmap,
  mask: Float32Array,
  blurRadius: number = 20
): OffscreenCanvas {
  const { width, height } = image;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw blurred background
  const blurredBg = createBlurredBackground(image, blurRadius);
  ctx.drawImage(blurredBg, 0, 0);

  // Draw subject
  const subjectCanvas = applyMaskToImage(image, mask);
  ctx.drawImage(subjectCanvas, 0, 0);

  return canvas;
}

/**
 * Create final output based on background mode
 */
export function createFinalOutput(
  image: ImageBitmap,
  mask: Float32Array,
  mode: BackgroundMode,
  options: { solidColor?: string; blurRadius?: number } = {}
): OffscreenCanvas {
  switch (mode) {
    case 'transparent':
      return applyMaskToImage(image, mask);

    case 'solid_color':
      return compositeOnSolidColor(image, mask, options.solidColor || '#ffffff');

    case 'blur':
      return compositeOnBlurredBackground(image, mask, options.blurRadius || 20);

    default:
      return applyMaskToImage(image, mask);
  }
}
