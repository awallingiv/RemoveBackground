# Remove Background

A free, privacy-focused web application that removes image backgrounds using AI - running entirely in your browser.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **100% Client-Side Processing**: All image processing happens locally in your browser. Your images never leave your device.
- **AI-Powered Segmentation**: Uses U²-Net neural network for accurate subject detection.
- **WebGPU Acceleration**: Utilizes WebGPU when available for faster processing, with WASM fallback.
- **Background Options**:
  - Transparent PNG output
  - Solid color replacement
  - Blurred background effect
- **Before/After Comparison**: Interactive slider to compare original and processed images.
- **Responsive Design**: Works on desktop and mobile browsers.

## How It Works

1. **Upload**: Drag & drop or select an image (JPG, PNG, or WebP)
2. **Process**: Click "Remove Background" to run AI segmentation
3. **Customize**: Choose transparent, solid color, or blurred background
4. **Download**: Save your processed image as a transparent PNG

### Technical Pipeline

1. **Image Loading**: File is loaded as ImageBitmap and optionally downscaled (max 1600px for free tier)
2. **Preprocessing**: Image is resized to 320×320 and normalized for model input (NCHW tensor format)
3. **Inference**: ONNX Runtime Web runs U²-Net with WebGPU or WASM execution provider
4. **Mask Processing**:
   - Normalize model output to [0,1] range
   - Resize mask back to working image dimensions
   - Apply Gaussian smoothing for clean edges
   - Feathering for smooth transitions
   - Optional defringe to reduce halo artifacts
5. **Compositing**: Subject mask applied as alpha channel, composited with selected background

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd remove-background

# Install dependencies
npm install

# Download the AI model (~168 MB)
npm run download-model

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
remove-background/
├── public/
│   └── models/
│       └── u2net.onnx          # AI model (downloaded separately)
├── scripts/
│   └── download-model.mjs      # Model download script
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── hq-export/      # Stub for future HQ mode
│   │   │       └── route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx            # Main application page
│   ├── components/
│   │   ├── AdSlot.tsx          # Ad placeholder component
│   │   ├── BackgroundOptions.tsx
│   │   ├── BeforeAfterSlider.tsx
│   │   ├── DownloadButton.tsx
│   │   ├── Dropzone.tsx
│   │   ├── ImageMetadata.tsx
│   │   ├── ProcessingButton.tsx
│   │   └── index.ts
│   └── lib/
│       ├── constants.ts        # Application constants
│       ├── imageUtils.ts       # Image processing utilities
│       ├── maskProcessing.ts   # Mask postprocessing
│       └── modelLoader.ts      # ONNX model loading (CDN)
├── package.json
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## Configuration

Key constants can be adjusted in `src/lib/constants.ts`:

| Constant | Default | Description |
|----------|---------|-------------|
| `MAX_IMAGE_DIMENSION` | 1600 | Maximum image dimension for free tier processing |
| `MODEL_INPUT_SIZE` | 320 | Neural network input resolution |
| `smoothingSigma` | 1.5 | Gaussian blur for mask smoothing |
| `featherAmount` | 2 | Edge feathering in pixels |
| `threshold` | 0.5 | Mask threshold (0-1) |
| `defringeRadius` | 1 | Halo reduction radius |

## Limitations

- **Model Size**: The U²-Net model is ~168 MB and needs to be downloaded on first use
- **Resolution Limit**: Free tier limits processing to 1600px max dimension
- **Memory Usage**: Large images may require significant browser memory
- **Browser Support**: Requires modern browser with WebGPU (preferred) or WASM support
- **Edge Quality**: Some complex edges (hair, fur) may need manual refinement

## Browser Compatibility

| Browser | WebGPU | WASM | Status |
|---------|--------|------|--------|
| Chrome 113+ | ✅ | ✅ | Full support |
| Edge 113+ | ✅ | ✅ | Full support |
| Firefox | ❌ | ✅ | WASM only |
| Safari 17+ | ✅ | ✅ | Full support |

## Future Extensions

### HQ Mode (Server-Side)

A stub endpoint exists at `/api/hq-export` for future server-side processing:

- Full resolution processing (no downscaling)
- More powerful GPU-based inference
- Advanced edge refinement algorithms
- Batch processing support

### Potential Enhancements

- [ ] Multiple model options (speed vs quality)
- [ ] Manual mask editing tools
- [ ] Batch processing
- [ ] Advanced edge refinement
- [ ] Background image replacement
- [ ] API access for developers

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Runtime**: ONNX Runtime Web (loaded from CDN)
- **Model**: U²-Net (Qin et al., 2020)

## Credits

- [U²-Net](https://github.com/xuebinqin/U-2-Net) - Salient Object Detection model
- [rembg](https://github.com/danielgatis/rembg) - Python library that inspired this project
- [ONNX Runtime Web](https://onnxruntime.ai/) - Cross-platform ML inference

## License

MIT License - see LICENSE file for details.

## Privacy

This application processes all images locally in your browser. No images are uploaded to any server. The only network requests are:
- Loading the application files
- Downloading the AI model (once, from local server)
- Loading ONNX Runtime from CDN (jsdelivr.net)
- Loading ONNX Runtime WASM files from CDN

Your images remain completely private.
