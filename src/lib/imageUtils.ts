/**
 * Image Processing Utilities
 *
 * This module handles:
 * 1. Loading images from File objects
 * 2. Resizing images to fit constraints
 * 3. Converting images to tensors for model input
 * 4. Canvas operations for compositing
 */

import { MAX_IMAGE_DIMENSION, MODEL_INPUT_SIZE, SUPPORTED_IMAGE_TYPES, MAX_FILE_SIZE } from './constants';

/**
 * Image metadata extracted from loaded file
 */
export interface ImageMetadata {
  name: string;
  width: number;
  height: number;
  size: number; // bytes
  type: string;
}

/**
 * Result of loading and preprocessing an image
 */
export interface ProcessedImage {
  original: ImageBitmap;
  working: ImageBitmap; // Downscaled if necessary
  metadata: ImageMetadata;
  wasDownscaled: boolean;
  workingDimensions: { width: number; height: number };
}

/**
 * Validate a file before processing
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as typeof SUPPORTED_IMAGE_TYPES[number])) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Supported: JPG, PNG, WebP`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File too large: ${sizeMB}MB. Maximum: ${maxMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Load an image file and create an ImageBitmap
 */
export async function loadImageFile(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
export function calculateResizedDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const aspectRatio = width / height;

  if (width > height) {
    return {
      width: maxDimension,
      height: Math.round(maxDimension / aspectRatio),
    };
  } else {
    return {
      width: Math.round(maxDimension * aspectRatio),
      height: maxDimension,
    };
  }
}

/**
 * Resize an ImageBitmap to new dimensions
 */
export async function resizeImage(
  source: ImageBitmap,
  targetWidth: number,
  targetHeight: number
): Promise<ImageBitmap> {
  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Use high-quality resampling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

  return createImageBitmap(canvas);
}

/**
 * Load and preprocess an image file
 * Handles validation, loading, and optional downscaling
 */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  // Validate
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Load original
  const original = await loadImageFile(file);

  // Check if downscaling is needed
  const { width: workingWidth, height: workingHeight } = calculateResizedDimensions(
    original.width,
    original.height,
    MAX_IMAGE_DIMENSION
  );

  const wasDownscaled =
    workingWidth !== original.width || workingHeight !== original.height;

  // Create working copy (downscaled if needed)
  const working = wasDownscaled
    ? await resizeImage(original, workingWidth, workingHeight)
    : original;

  return {
    original,
    working,
    metadata: {
      name: file.name,
      width: original.width,
      height: original.height,
      size: file.size,
      type: file.type,
    },
    wasDownscaled,
    workingDimensions: { width: workingWidth, height: workingHeight },
  };
}

/**
 * Convert an ImageBitmap to a normalized Float32Array tensor
 *
 * Output format: NCHW (batch, channels, height, width)
 * - Batch size: 1
 * - Channels: 3 (RGB)
 * - Height/Width: MODEL_INPUT_SIZE
 * - Values: normalized to [0, 1]
 *
 * U2Net preprocessing:
 * - Resize to 320x320
 * - Normalize to [0, 1] range
 * - No mean subtraction or std normalization (handled by model)
 */
export function imageToTensor(image: ImageBitmap): Float32Array {
  // Create canvas at model input size
  const canvas = new OffscreenCanvas(MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image resized to model input size
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const pixels = imageData.data; // RGBA format, values 0-255

  // Create tensor in NCHW format
  const tensorSize = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  const tensor = new Float32Array(3 * tensorSize);

  // Convert RGBA to RGB channels and normalize to [0, 1]
  for (let i = 0; i < tensorSize; i++) {
    const pixelIndex = i * 4;
    // R channel
    tensor[i] = pixels[pixelIndex] / 255.0;
    // G channel
    tensor[tensorSize + i] = pixels[pixelIndex + 1] / 255.0;
    // B channel
    tensor[2 * tensorSize + i] = pixels[pixelIndex + 2] / 255.0;
  }

  return tensor;
}

/**
 * Get ImageData from an ImageBitmap
 */
export function getImageData(image: ImageBitmap): ImageData {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, image.width, image.height);
}

/**
 * Create a canvas from an ImageBitmap
 */
export function imageToCanvas(image: ImageBitmap): OffscreenCanvas {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(image, 0, 0);
  return canvas;
}

/**
 * Convert canvas to PNG Blob
 */
export async function canvasToBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  type: string = 'image/png',
  quality?: number
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type, quality });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Create a data URL from an ImageBitmap
 */
export function imageToDataURL(image: ImageBitmap): string {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Download a Blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
