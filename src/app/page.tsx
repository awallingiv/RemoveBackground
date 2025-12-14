'use client';

/**
 * Main Application Page
 *
 * Single-page experience for background removal:
 * 1. Upload image via drag/drop or file picker
 * 2. Preview original with metadata
 * 3. Process with background removal
 * 4. Compare before/after with slider
 * 5. Choose background mode and download
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  AdSlot,
  Dropzone,
  BeforeAfterSlider,
  ProcessingButton,
  BackgroundOptions,
  ImageMetadata,
  DownloadButton,
} from '@/components';
import {
  PROGRESS_STATES,
  BACKGROUND_MODES,
  type ProgressState,
  type BackgroundMode,
} from '@/lib/constants';
import {
  processImageFile,
  imageToTensor,
  canvasToBlob,
  downloadBlob,
  imageToDataURL,
  type ProcessedImage,
} from '@/lib/imageUtils';
import { loadModel, runInference, getCurrentProvider } from '@/lib/modelLoader';
import { postprocessMask, createFinalOutput } from '@/lib/maskProcessing';

export default function HomePage() {
  // Image state
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [originalDataUrl, setOriginalDataUrl] = useState<string | null>(null);
  const [resultDataUrl, setResultDataUrl] = useState<string | null>(null);

  // Processing state
  const [progressState, setProgressState] = useState<ProgressState>(PROGRESS_STATES.IDLE);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Background options
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(BACKGROUND_MODES.TRANSPARENT);
  const [solidColor, setSolidColor] = useState('#ffffff');
  const [blurRadius, setBlurRadius] = useState(20);

  // Store the mask for re-compositing when background options change
  const maskRef = useRef<Float32Array | null>(null);

  /**
   * Handle file selection from dropzone
   */
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      // Reset state
      setProgressState(PROGRESS_STATES.IDLE);
      setStatusMessage('');
      setResultDataUrl(null);
      maskRef.current = null;

      // Process the file
      const processed = await processImageFile(file);
      setProcessedImage(processed);

      // Create data URL for preview
      const dataUrl = imageToDataURL(processed.working);
      setOriginalDataUrl(dataUrl);
    } catch (error) {
      console.error('Error loading image:', error);
      setProgressState(PROGRESS_STATES.ERROR);
      setStatusMessage(error instanceof Error ? error.message : 'Failed to load image');
    }
  }, []);

  /**
   * Run background removal
   */
  const handleRemoveBackground = useCallback(async () => {
    if (!processedImage) return;

    try {
      // Load model
      setProgressState(PROGRESS_STATES.LOADING_MODEL);
      setStatusMessage('Loading AI model...');
      await loadModel((msg) => setStatusMessage(msg));

      // Preprocess
      setProgressState(PROGRESS_STATES.PREPROCESSING);
      setStatusMessage('Preparing image...');
      const tensor = imageToTensor(processedImage.working);

      // Run inference
      setProgressState(PROGRESS_STATES.RUNNING_INFERENCE);
      setStatusMessage('Removing background...');
      const rawMask = await runInference(tensor, (msg) => setStatusMessage(msg));

      // Postprocess
      setProgressState(PROGRESS_STATES.POSTPROCESSING);
      setStatusMessage('Refining edges...');

      const mask = postprocessMask(
        rawMask,
        processedImage.workingDimensions.width,
        processedImage.workingDimensions.height
      );
      maskRef.current = mask;

      // Create output
      const outputCanvas = createFinalOutput(processedImage.working, mask, backgroundMode, {
        solidColor,
        blurRadius,
      });

      const blob = await canvasToBlob(outputCanvas);
      const resultUrl = URL.createObjectURL(blob);
      setResultDataUrl(resultUrl);

      setProgressState(PROGRESS_STATES.COMPLETE);
      const provider = getCurrentProvider();
      setStatusMessage(`Done! Using ${provider === 'webgpu' ? 'WebGPU' : 'WASM'} acceleration`);
    } catch (error) {
      console.error('Error processing image:', error);
      setProgressState(PROGRESS_STATES.ERROR);
      setStatusMessage(error instanceof Error ? error.message : 'Processing failed');
    }
  }, [processedImage, backgroundMode, solidColor, blurRadius]);

  /**
   * Update result when background options change
   */
  const updateResult = useCallback(async () => {
    if (!processedImage || !maskRef.current) return;

    const outputCanvas = createFinalOutput(processedImage.working, maskRef.current, backgroundMode, {
      solidColor,
      blurRadius,
    });

    const blob = await canvasToBlob(outputCanvas);
    const resultUrl = URL.createObjectURL(blob);
    setResultDataUrl(resultUrl);
  }, [processedImage, backgroundMode, solidColor, blurRadius]);

  // Update result when background options change
  React.useEffect(() => {
    if (progressState === PROGRESS_STATES.COMPLETE && maskRef.current) {
      updateResult();
    }
  }, [backgroundMode, solidColor, blurRadius, progressState, updateResult]);

  /**
   * Handle download
   */
  const handleDownload = useCallback(async () => {
    if (!processedImage || !maskRef.current) return;

    const outputCanvas = createFinalOutput(processedImage.working, maskRef.current, backgroundMode, {
      solidColor,
      blurRadius,
    });

    const blob = await canvasToBlob(outputCanvas);
    const baseName = processedImage.metadata.name.replace(/\.[^/.]+$/, '');
    downloadBlob(blob, `${baseName}-no-bg.png`);
  }, [processedImage, backgroundMode, solidColor, blurRadius]);

  /**
   * Reset to upload new image
   */
  const handleReset = useCallback(() => {
    setProcessedImage(null);
    setOriginalDataUrl(null);
    setResultDataUrl(null);
    setProgressState(PROGRESS_STATES.IDLE);
    setStatusMessage('');
    maskRef.current = null;
  }, []);

  const hasResult = progressState === PROGRESS_STATES.COMPLETE && resultDataUrl;
  const nonProcessingStates: ProgressState[] = [
    PROGRESS_STATES.IDLE,
    PROGRESS_STATES.COMPLETE,
    PROGRESS_STATES.ERROR,
  ];
  const isProcessing = !nonProcessingStates.includes(progressState);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Remove Background</h1>
                <p className="text-xs text-gray-500">100% free, 100% private</p>
              </div>
            </div>

            {/* Header Ad Slot */}
            <div className="hidden lg:block">
              <AdSlot position="header" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="flex gap-8">
          {/* Main workspace */}
          <div className="flex-1 min-w-0">
            {!processedImage ? (
              /* Upload state */
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Remove Image Backgrounds Instantly
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Upload your image and let AI remove the background in seconds.
                    Everything runs locally in your browser - your images never leave your device.
                  </p>
                </div>

                <Dropzone onFileSelect={handleFileSelect} />

                {/* Privacy notice */}
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span>Your images are processed locally and never uploaded to any server.</span>
                </div>
              </div>
            ) : (
              /* Processing/Result state */
              <div className="space-y-6">
                {/* Image preview */}
                {hasResult && originalDataUrl ? (
                  <BeforeAfterSlider
                    beforeSrc={originalDataUrl}
                    afterSrc={resultDataUrl}
                    beforeLabel="Original"
                    afterLabel="Result"
                  />
                ) : originalDataUrl ? (
                  <div className="relative rounded-xl overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
                    <img
                      src={originalDataUrl}
                      alt="Original"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-white rounded-xl p-6 text-center">
                          <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
                          <p className="text-gray-900 font-medium">{statusMessage}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Action buttons */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {!hasResult ? (
                    <ProcessingButton
                      onClick={handleRemoveBackground}
                      state={progressState}
                      statusMessage={!isProcessing ? statusMessage : undefined}
                      disabled={!processedImage}
                    />
                  ) : (
                    <>
                      <DownloadButton onClick={handleDownload} />
                      <button
                        onClick={handleReset}
                        className="px-6 py-3 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        Upload New Image
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block w-80 flex-shrink-0 space-y-6">
            {/* Image metadata */}
            {processedImage && (
              <ImageMetadata
                metadata={processedImage.metadata}
                wasDownscaled={processedImage.wasDownscaled}
                workingDimensions={processedImage.workingDimensions}
              />
            )}

            {/* Background options */}
            {processedImage && (
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <BackgroundOptions
                  mode={backgroundMode}
                  solidColor={solidColor}
                  blurRadius={blurRadius}
                  onModeChange={setBackgroundMode}
                  onColorChange={setSolidColor}
                  onBlurRadiusChange={setBlurRadius}
                  disabled={!hasResult}
                />
              </div>
            )}

            {/* Sidebar Ad Slot */}
            <div className="flex justify-center">
              <AdSlot position="sidebar" />
            </div>

            {/* HQ Mode placeholder */}
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 border border-primary-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span className="font-semibold text-primary-900">HQ Mode</span>
                <span className="text-xs bg-primary-200 text-primary-700 px-2 py-0.5 rounded-full">Coming Soon</span>
              </div>
              <p className="text-sm text-primary-700">
                Process images at full resolution with server-side AI for maximum quality.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Footer Ad */}
          <div className="flex justify-center mb-6">
            <AdSlot position="footer" />
          </div>

          <div className="text-center text-sm text-gray-500">
            <p className="mb-2">
              Powered by AI segmentation running entirely in your browser.
              No data is sent to any server.
            </p>
            <p>
              Built with Next.js, ONNX Runtime Web, and U&sup2;-Net.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
