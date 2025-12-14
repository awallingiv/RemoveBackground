'use client';

/**
 * Image Metadata Component
 *
 * Displays file information for the uploaded image.
 */

import React from 'react';
import { formatFileSize } from '@/lib/imageUtils';
import type { ImageMetadata as ImageMetadataType } from '@/lib/imageUtils';

interface ImageMetadataProps {
  metadata: ImageMetadataType;
  wasDownscaled?: boolean;
  workingDimensions?: { width: number; height: number };
  className?: string;
}

export default function ImageMetadata({
  metadata,
  wasDownscaled,
  workingDimensions,
  className = '',
}: ImageMetadataProps) {
  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <h3 className="font-medium text-gray-900 mb-2">Image Info</h3>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">File:</span>
          <span className="text-gray-900 truncate max-w-[200px]" title={metadata.name}>
            {metadata.name}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Type:</span>
          <span className="text-gray-900">{metadata.type.split('/')[1].toUpperCase()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Size:</span>
          <span className="text-gray-900">{formatFileSize(metadata.size)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Dimensions:</span>
          <span className="text-gray-900">
            {metadata.width} × {metadata.height}
          </span>
        </div>

        {wasDownscaled && workingDimensions && (
          <div className="flex justify-between text-amber-600">
            <span>Processing at:</span>
            <span>
              {workingDimensions.width} × {workingDimensions.height}
            </span>
          </div>
        )}
      </div>

      {wasDownscaled && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          Image will be processed at reduced resolution (free tier limit).
          Full resolution available in HQ mode.
        </div>
      )}
    </div>
  );
}
