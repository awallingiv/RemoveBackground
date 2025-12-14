'use client';

/**
 * Download Button Component
 *
 * Button to download the processed image.
 */

import React from 'react';

interface DownloadButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export default function DownloadButton({
  onClick,
  disabled = false,
  label = 'Download PNG',
  className = '',
}: DownloadButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center gap-2
        px-6 py-3 rounded-xl font-medium
        transition-all duration-200
        ${disabled
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg'
        }
        ${className}
      `}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      {label}
    </button>
  );
}
