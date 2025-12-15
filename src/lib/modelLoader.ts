/**
 * ONNX Model Loader with WebGPU/WASM fallback
 *
 * This module handles:
 * 1. Detecting WebGPU availability
 * 2. Loading the ONNX model with appropriate execution provider
 * 3. Caching the model in memory for subsequent runs
 * 4. Running inference on preprocessed image tensors
 *
 * Note: ONNX Runtime is loaded from CDN to avoid Next.js bundling issues
 */

import { MODEL_PATH, MODEL_INPUT_SIZE } from './constants';

// Type for execution provider
type ExecutionProvider = 'webgpu' | 'wasm';

// ONNX Runtime types
interface OrtEnv {
  wasm: {
    wasmPaths: string;
    numThreads: number;
  };
  logLevel: string;
}

interface OrtTensor {
  data: Float32Array;
}

interface OrtSession {
  inputNames: string[];
  outputNames: string[];
  run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensor>>;
  release(): Promise<void>;
}

interface OrtModule {
  env: OrtEnv;
  InferenceSession: {
    create(
      path: string,
      options: { executionProviders: string[]; graphOptimizationLevel: string }
    ): Promise<OrtSession>;
  };
  Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown;
}

// Singleton state
let ortModule: OrtModule | null = null;
let cachedSession: OrtSession | null = null;
let currentProvider: ExecutionProvider | null = null;
let isLoading = false;
let loadPromise: Promise<OrtModule> | null = null;

/**
 * Load ONNX Runtime Web from CDN
 */
async function loadOrtFromCDN(): Promise<OrtModule> {
  if (ortModule) {
    return ortModule;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<OrtModule>((resolve, reject) => {
    // Check if already loaded
    if (typeof window !== 'undefined' && (window as unknown as { ort?: OrtModule }).ort) {
      ortModule = (window as unknown as { ort: OrtModule }).ort;
      resolve(ortModule);
      return;
    }

    // Load from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.0/dist/ort.min.js';
    script.async = true;

    script.onload = () => {
      ortModule = (window as unknown as { ort: OrtModule }).ort;
      if (ortModule) {
        resolve(ortModule);
      } else {
        reject(new Error('ONNX Runtime failed to load'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load ONNX Runtime from CDN'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Check if WebGPU is available in the browser
 */
export async function checkWebGPUSupport(): Promise<boolean> {
  if (typeof navigator === 'undefined') {
    console.log('[WebGPU] Not in browser environment');
    return false;
  }

  if (!('gpu' in navigator)) {
    console.log('[WebGPU] navigator.gpu not available - Browser does not support WebGPU');
    console.log('[WebGPU] Try Chrome/Edge 113+, or enable chrome://flags/#enable-unsafe-webgpu');
    return false;
  }

  try {
    const gpu = (navigator as Navigator & { gpu: GPU }).gpu;
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      console.log('[WebGPU] No adapter available - GPU may not support WebGPU');
      return false;
    }
    const device = await adapter.requestDevice();
    console.log('[WebGPU] ✓ Available and working');
    console.log('[WebGPU] Adapter:', adapter);
    // Clean up
    device.destroy();
    return true;
  } catch (error) {
    console.error('[WebGPU] Error during initialization:', error);
    return false;
  }
}

/**
 * Configure ONNX Runtime environment
 */
function configureOrtEnvironment(ort: OrtModule): void {
  // Set WASM paths to load from CDN
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.0/dist/';

  // Enable multi-threading for WASM if supported
  ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;

  // Set log level
  ort.env.logLevel = 'warning';
}

/**
 * Load the segmentation model
 * Returns the loaded session and the provider used
 */
export async function loadModel(
  onProgress?: (message: string) => void
): Promise<{ session: OrtSession; provider: ExecutionProvider }> {
  // Return cached session if available
  if (cachedSession && currentProvider) {
    onProgress?.('Model already loaded');
    return { session: cachedSession, provider: currentProvider };
  }

  // Prevent concurrent loading
  if (isLoading) {
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (cachedSession && currentProvider) {
      return { session: cachedSession, provider: currentProvider };
    }
  }

  isLoading = true;

  try {
    onProgress?.('Loading ONNX Runtime...');
    const ort = await loadOrtFromCDN();
    configureOrtEnvironment(ort);

    // Check WebGPU support
    onProgress?.('Checking WebGPU support...');
    const hasWebGPU = await checkWebGPUSupport();

    let session: OrtSession;
    let provider: ExecutionProvider;

    if (hasWebGPU) {
      onProgress?.('Loading model with WebGPU acceleration...');
      try {
        session = await ort.InferenceSession.create(MODEL_PATH, {
          executionProviders: ['webgpu'],
          graphOptimizationLevel: 'all',
        });
        provider = 'webgpu';
        onProgress?.('Model loaded with WebGPU');
      } catch (webgpuError) {
        console.error('[WebGPU] Model loading failed:', webgpuError);
        onProgress?.('Loading with WASM...');
        session = await ort.InferenceSession.create(MODEL_PATH, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        provider = 'wasm';
        onProgress?.('Model loaded with WASM');
      }
    } else {
      onProgress?.('Loading model with WASM (WebGPU not available)...');
      session = await ort.InferenceSession.create(MODEL_PATH, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      provider = 'wasm';
      onProgress?.('Model loaded with WASM');
    }

    // Cache the session
    cachedSession = session;
    currentProvider = provider;

    return { session, provider };
  } finally {
    isLoading = false;
  }
}

/**
 * Run inference on an image tensor
 *
 * @param imageData - Float32Array of normalized image data in NCHW format
 *                    Shape: [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]
 *                    Values: normalized to [0, 1] range
 * @returns Float32Array of mask data, shape [1, 1, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]
 */
export async function runInference(
  imageData: Float32Array,
  onProgress?: (message: string) => void
): Promise<Float32Array> {
  const { session } = await loadModel(onProgress);
  const ort = await loadOrtFromCDN();

  onProgress?.('Running inference...');

  // Create input tensor
  // U2Net expects input shape: [batch, channels, height, width] = [1, 3, 320, 320]
  const inputTensor = new ort.Tensor('float32', imageData, [
    1,
    3,
    MODEL_INPUT_SIZE,
    MODEL_INPUT_SIZE,
  ]);

  // Get input name from model (usually 'input' or 'input.1')
  const inputName = session.inputNames[0];

  // Run inference
  const feeds: Record<string, unknown> = { [inputName]: inputTensor };
  const results = await session.run(feeds);

  // U2Net outputs multiple masks; we use the first (finest) one
  // Output name is typically 'd0' for the finest segmentation
  const outputName = session.outputNames[0];
  const outputTensor = results[outputName];

  onProgress?.('Inference complete');

  return outputTensor.data as Float32Array;
}

/**
 * Get the current execution provider being used
 */
export function getCurrentProvider(): ExecutionProvider | null {
  return currentProvider;
}

/**
 * Check if the model is loaded
 */
export function isModelLoaded(): boolean {
  return cachedSession !== null;
}

/**
 * Clear the cached model (for testing or memory management)
 */
export async function clearModelCache(): Promise<void> {
  if (cachedSession) {
    await cachedSession.release();
    cachedSession = null;
    currentProvider = null;
  }
}
