#!/usr/bin/env node

/**
 * Model Download Script
 *
 * Downloads the U2Net ONNX model for background removal.
 * The model is a lightweight version of U^2-Net optimized for web inference.
 *
 * Source: https://github.com/danielgatis/rembg (MIT License)
 *
 * Usage:
 *   npm run download-model
 *   node scripts/download-model.mjs
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Model configuration
const MODEL_CONFIG = {
  // U2Net model - good balance of quality and size
  // This is the same model used by rembg, exported to ONNX format
  name: 'u2net',
  url: 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx',
  outputPath: path.join(__dirname, '..', 'public', 'models', 'u2net.onnx'),
  expectedSize: 176_000_000, // ~168 MB
};

/**
 * Download file with progress reporting
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);
    console.log(`Destination: ${outputPath}`);

    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = fs.createWriteStream(outputPath);
    let downloadedBytes = 0;
    let totalBytes = 0;
    let lastProgress = -1;

    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(outputPath);
        console.log(`Redirecting to: ${response.headers.location}`);
        downloadFile(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath);
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      totalBytes = parseInt(response.headers['content-length'], 10) || MODEL_CONFIG.expectedSize;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const progress = Math.floor((downloadedBytes / totalBytes) * 100);

        if (progress !== lastProgress && progress % 5 === 0) {
          const mb = (downloadedBytes / (1024 * 1024)).toFixed(1);
          const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
          console.log(`Progress: ${progress}% (${mb} MB / ${totalMb} MB)`);
          lastProgress = progress;
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        const finalSize = fs.statSync(outputPath).size;
        const finalMb = (finalSize / (1024 * 1024)).toFixed(1);
        console.log(`\nDownload complete: ${finalMb} MB`);
        resolve();
      });
    });

    request.on('error', (err) => {
      file.close();
      fs.unlinkSync(outputPath);
      reject(err);
    });

    file.on('error', (err) => {
      file.close();
      fs.unlinkSync(outputPath);
      reject(err);
    });
  });
}

/**
 * Verify the downloaded model
 */
function verifyModel(outputPath) {
  if (!fs.existsSync(outputPath)) {
    throw new Error('Model file does not exist after download');
  }

  const stats = fs.statSync(outputPath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(1);

  console.log(`\nModel verification:`);
  console.log(`  File: ${outputPath}`);
  console.log(`  Size: ${sizeMb} MB`);

  // Basic check - file should be at least 100MB
  if (stats.size < 100_000_000) {
    throw new Error(`Model file seems too small (${sizeMb} MB). Download may have failed.`);
  }

  console.log(`  Status: OK`);
}

/**
 * Main entry point
 */
async function main() {
  console.log('='.repeat(60));
  console.log('U2Net Model Downloader');
  console.log('='.repeat(60));
  console.log();

  // Check if model already exists
  if (fs.existsSync(MODEL_CONFIG.outputPath)) {
    const stats = fs.statSync(MODEL_CONFIG.outputPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(1);

    console.log(`Model already exists: ${MODEL_CONFIG.outputPath}`);
    console.log(`Size: ${sizeMb} MB`);

    if (stats.size >= 100_000_000) {
      console.log('\nModel appears valid. Skipping download.');
      console.log('To re-download, delete the existing file first.');
      return;
    } else {
      console.log('\nExisting file appears incomplete. Re-downloading...');
      fs.unlinkSync(MODEL_CONFIG.outputPath);
    }
  }

  try {
    await downloadFile(MODEL_CONFIG.url, MODEL_CONFIG.outputPath);
    verifyModel(MODEL_CONFIG.outputPath);

    console.log('\n' + '='.repeat(60));
    console.log('Setup complete! You can now run: npm run dev');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\nError downloading model:', error.message);
    console.error('\nManual download instructions:');
    console.error(`1. Download from: ${MODEL_CONFIG.url}`);
    console.error(`2. Save to: ${MODEL_CONFIG.outputPath}`);
    process.exit(1);
  }
}

main();
