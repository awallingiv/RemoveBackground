/**
 * Application constants for background removal
 */

// Maximum image dimension for free tier processing
// Images larger than this will be downscaled before inference
export const MAX_IMAGE_DIMENSION = 1600;

// Model input size (U2Net uses 320x320)
// This is the size the image will be resized to for model inference
export const MODEL_INPUT_SIZE = 320;

// Model file path (relative to public directory)
export const MODEL_PATH = '/models/u2net.onnx';

// Supported image MIME types
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

// Maximum file size in bytes (50MB)
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Default mask postprocessing settings
export const DEFAULT_POSTPROCESS_CONFIG = {
  // Gaussian blur sigma for mask smoothing (0 = no smoothing)
  smoothingSigma: 1.5,
  // Feathering amount in pixels (0 = hard edges)
  featherAmount: 2,
  // Threshold for binary mask (0-1, lower = more inclusive)
  threshold: 0.5,
  // Enable defringe/halo reduction
  defringe: true,
  // Defringe radius in pixels
  defringeRadius: 1,
} as const;

// WebGPU availability check timeout (ms)
export const WEBGPU_CHECK_TIMEOUT = 5000;

// Progress states for UI
export const PROGRESS_STATES = {
  IDLE: 'idle',
  LOADING_MODEL: 'loading_model',
  PREPROCESSING: 'preprocessing',
  RUNNING_INFERENCE: 'running_inference',
  POSTPROCESSING: 'postprocessing',
  COMPLETE: 'complete',
  ERROR: 'error',
} as const;

export type ProgressState = (typeof PROGRESS_STATES)[keyof typeof PROGRESS_STATES];

// Background replacement modes
export const BACKGROUND_MODES = {
  TRANSPARENT: 'transparent',
  SOLID_COLOR: 'solid_color',
  BLUR: 'blur',
} as const;

export type BackgroundMode = (typeof BACKGROUND_MODES)[keyof typeof BACKGROUND_MODES];

// Feature flags
export const ENABLE_ADS = false; // Set to true to enable advertisement slots
