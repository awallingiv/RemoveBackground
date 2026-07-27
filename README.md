# Remove Background

A privacy-focused web application that removes image backgrounds with a U2-Net segmentation model running entirely in the browser.

The application uses ONNX Runtime Web for local inference, prefers WebGPU when it is available, and falls back to WebAssembly for broader browser compatibility. User images are processed on-device and are not uploaded to an application server.

## Featured Code Sample

[`src/lib/modelLoader.ts`](https://github.com/awallingiv/RemoveBackground/blob/main/src/lib/modelLoader.ts)

This module is the clearest example of the engineering approach used in the project. It is responsible for:

- Loading ONNX Runtime Web from a CDN
- Detecting whether WebGPU is available and functional
- Falling back to WASM when WebGPU cannot be used
- Preventing duplicate model initialization
- Caching the inference session for subsequent requests
- Exposing progress updates to the user interface
- Running inference against a normalized NCHW image tensor

## Why I Built It

Many background-removal tools require users to upload images to a remote service. I wanted to explore a different architecture: keep the image on the user's device and run the model locally in the browser.

That created several engineering constraints:

- Browser support for WebGPU is not universal.
- The U2-Net model is large and should not be initialized repeatedly.
- The model expects a fixed `320 x 320` input tensor, while uploaded images may be much larger.
- Raw segmentation output is not immediately suitable for use as a clean alpha mask.
- Processing speed depends heavily on the user's browser and hardware.

The project addresses these constraints through execution-provider fallback, session caching, image downscaling, explicit preprocessing, mask post-processing, and local canvas-based compositing.

## Features

- **Local image processing** - images remain in the browser
- **AI segmentation** - U2-Net inference through ONNX Runtime Web
- **WebGPU acceleration** - preferred when supported
- **WASM fallback** - used when WebGPU is unavailable or model initialization fails
- **Input validation** - JPG, PNG, and WebP files up to 50 MB
- **Responsive interface** - designed for desktop and mobile browsers
- **Before-and-after comparison** - interactive result preview
- **Transparent PNG output**
- **Additional compositing support** - solid-color and blurred-background modes are implemented in the processing layer

## Processing Pipeline

### 1. Validate and load the image

The application validates the MIME type and file size before calling `createImageBitmap`. Images larger than the configured working dimension are downscaled while preserving their aspect ratio.

This prevents unnecessarily large intermediate buffers while retaining a higher-resolution working image for final compositing.

### 2. Convert the image into model input

The working image is drawn to a `320 x 320` `OffscreenCanvas`. RGBA browser pixel data is converted into a normalized `Float32Array` using NCHW layout:

```text
[batch, channels, height, width]
[1, 3, 320, 320]
```

The red, green, and blue channels are stored separately and normalized from `0-255` to `0-1`.

### 3. Select an inference provider

The model loader checks whether the browser exposes `navigator.gpu`, requests a GPU adapter, and verifies that a device can be created.

When WebGPU is available, ONNX Runtime first attempts to create the inference session with the `webgpu` execution provider. If session creation fails, the loader automatically retries with `wasm`.

Browsers without WebGPU use WASM directly.

### 4. Cache the runtime and model session

ONNX Runtime and the model session are cached in module-level state. Repeated image processing therefore reuses the existing session instead of downloading and initializing the model again.

The loader also coordinates concurrent calls so multiple UI actions do not initialize duplicate sessions. If the CDN runtime fails to load, the rejected promise is cleared so a later attempt can retry.

### 5. Run inference

The preprocessed tensor is passed to the model using the first declared input name. U2-Net returns multiple segmentation outputs; the application uses the first output as the highest-detail foreground mask.

### 6. Post-process the mask

The raw model output passes through a separate mask-processing pipeline:

1. Normalize values to the `0-1` range
2. Resize the mask to the working image dimensions with bilinear interpolation
3. Apply a configurable threshold
4. Smooth edges with separable Gaussian blur
5. Feather the transition around the subject
6. Optionally reduce edge halos through defringing

Keeping these operations separate from inference makes the model integration easier to understand and allows output quality to be tuned without changing the runtime loader.

### 7. Composite and export

The processed mask is written into the image's alpha channel with `OffscreenCanvas`.

The compositing layer can produce:

- A transparent background
- A solid-color background
- A blurred version of the original image behind the subject

The result is exported locally as a PNG blob. Temporary object URLs are revoked when results are replaced or reset.

## Architecture and Design Decisions

### Client-side inference

Running the model in the browser keeps user images private and removes the need for server-side inference infrastructure.

The tradeoff is that the initial model download is large and performance varies by device. A client-side architecture also requires a compatibility path for browsers that do not support WebGPU.

### WebGPU with WASM fallback

WebGPU provides the preferred execution path because it can substantially reduce inference time on compatible hardware. It cannot be treated as a hard requirement, however.

The WASM fallback adds implementation complexity but allows the same application to run across a broader range of browsers and machines.

### Fixed model input size

U2-Net expects a `320 x 320` input. Resizing every image to that resolution keeps inference predictable, but fine details may be lost around hair, fur, transparent objects, and other complex edges.

Mask smoothing and feathering improve the final result, but they cannot recreate detail that the model did not capture.

### Separation of responsibilities

The main processing concerns are intentionally split across modules:

- `imageUtils.ts` - file validation, resizing, tensor creation, and export helpers
- `modelLoader.ts` - runtime loading, provider selection, session caching, and inference
- `maskProcessing.ts` - normalization, resizing, edge refinement, and compositing
- `page.tsx` - application state and workflow orchestration

This separation keeps browser APIs, inference concerns, and image-processing logic from becoming tightly coupled.

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm

### Installation

```bash
git clone https://github.com/awallingiv/RemoveBackground.git
cd RemoveBackground
npm install
npm run download-model
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Configuration

Key values are defined in `src/lib/constants.ts`.

| Constant | Default | Purpose |
|---|---:|---|
| `MAX_IMAGE_DIMENSION` | `1600` | Maximum working-image dimension |
| `MODEL_INPUT_SIZE` | `320` | U2-Net input width and height |
| `MAX_FILE_SIZE` | `50 MB` | Maximum accepted upload size |
| `smoothingSigma` | `1.5` | Gaussian smoothing strength |
| `featherAmount` | `2` | Edge-feathering amount |
| `threshold` | `0.5` | Foreground-mask threshold |
| `defringeRadius` | `1` | Halo-reduction radius |

## Project Structure

```text
RemoveBackground/
|-- public/
|   `-- models/
|       `-- u2net.onnx
|-- scripts/
|   `-- download-model.mjs
|-- src/
|   |-- app/
|   |   |-- api/
|   |   |   `-- hq-export/
|   |   |       `-- route.ts
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components/
|   |   |-- AdSlot.tsx
|   |   |-- BackgroundOptions.tsx
|   |   |-- BeforeAfterSlider.tsx
|   |   |-- DownloadButton.tsx
|   |   |-- Dropzone.tsx
|   |   |-- ImageMetadata.tsx
|   |   |-- ProcessingButton.tsx
|   |   `-- index.ts
|   `-- lib/
|       |-- constants.ts
|       |-- imageUtils.ts
|       |-- maskProcessing.ts
|       `-- modelLoader.ts
|-- next.config.mjs
|-- package.json
|-- tailwind.config.ts
`-- tsconfig.json
```

## Browser Compatibility

| Browser | WebGPU | WASM fallback |
|---|---:|---:|
| Chrome 113+ | Yes | Yes |
| Edge 113+ | Yes | Yes |
| Firefox | No | Yes |
| Safari 17+ | Yes | Yes |

Actual WebGPU availability may still depend on the operating system, browser configuration, and graphics hardware.

## Current Limitations

- The model is approximately 168 MB and must be downloaded before first inference.
- Processing time depends on the user's hardware and selected execution provider.
- The working image is limited to a maximum dimension of 1600 pixels.
- Fine edges can require additional refinement.
- Inference and post-processing currently run on the main browser thread.
- The current interface defaults to transparent output, although additional background compositing modes exist in the processing layer.

## Potential Improvements

- Move preprocessing and post-processing into a Web Worker
- Add automated tests for tensor layout, interpolation, and mask-processing behavior
- Benchmark WebGPU and WASM on representative devices
- Add multiple model options for speed-versus-quality selection
- Add manual mask-refinement tools
- Expose the existing solid-color and blurred-background modes more prominently
- Improve retry and offline behavior for runtime and model downloads
- Add batch processing
- Add an optional server-side high-resolution processing path

## Technology

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- ONNX Runtime Web
- U2-Net
- WebGPU
- WebAssembly
- OffscreenCanvas

## Privacy

Uploaded images are processed locally in the browser. The application does not send image content to an application server.

Network requests are limited to application assets, the U2-Net model, ONNX Runtime Web, and its WASM files.

## Credits

- [U2-Net](https://github.com/xuebinqin/U-2-Net)
- [ONNX Runtime Web](https://onnxruntime.ai/)
- [rembg](https://github.com/danielgatis/rembg)

## License

MIT
