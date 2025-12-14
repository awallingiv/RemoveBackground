'use client';

/**
 * Background Options Component
 *
 * Panel for selecting background replacement mode:
 * - Transparent
 * - Solid color
 * - Blurred original
 */

import React from 'react';
import { BackgroundMode, BACKGROUND_MODES } from '@/lib/constants';

interface BackgroundOptionsProps {
  mode: BackgroundMode;
  solidColor: string;
  blurRadius: number;
  onModeChange: (mode: BackgroundMode) => void;
  onColorChange: (color: string) => void;
  onBlurRadiusChange: (radius: number) => void;
  disabled?: boolean;
  className?: string;
}

const PRESET_COLORS = [
  '#ffffff', // White
  '#000000', // Black
  '#f3f4f6', // Gray
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
];

export default function BackgroundOptions({
  mode,
  solidColor,
  blurRadius,
  onModeChange,
  onColorChange,
  onBlurRadiusChange,
  disabled = false,
  className = '',
}: BackgroundOptionsProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="font-medium text-gray-900">Background</h3>

      {/* Mode selection */}
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange(BACKGROUND_MODES.TRANSPARENT)}
          disabled={disabled}
          className={`
            flex-1 px-3 py-2 rounded-lg text-sm font-medium
            transition-all duration-200
            ${mode === BACKGROUND_MODES.TRANSPARENT
              ? 'bg-primary-500 text-white'
              : disabled
                ? 'bg-gray-100 text-gray-400'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          <span className="flex items-center justify-center gap-1">
            {/* Checkerboard icon */}
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <rect x="0" y="0" width="4" height="4" />
              <rect x="8" y="0" width="4" height="4" />
              <rect x="4" y="4" width="4" height="4" />
              <rect x="12" y="4" width="4" height="4" />
              <rect x="0" y="8" width="4" height="4" />
              <rect x="8" y="8" width="4" height="4" />
              <rect x="4" y="12" width="4" height="4" />
              <rect x="12" y="12" width="4" height="4" />
            </svg>
            Transparent
          </span>
        </button>

        <button
          onClick={() => onModeChange(BACKGROUND_MODES.SOLID_COLOR)}
          disabled={disabled}
          className={`
            flex-1 px-3 py-2 rounded-lg text-sm font-medium
            transition-all duration-200
            ${mode === BACKGROUND_MODES.SOLID_COLOR
              ? 'bg-primary-500 text-white'
              : disabled
                ? 'bg-gray-100 text-gray-400'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          Solid Color
        </button>

        <button
          onClick={() => onModeChange(BACKGROUND_MODES.BLUR)}
          disabled={disabled}
          className={`
            flex-1 px-3 py-2 rounded-lg text-sm font-medium
            transition-all duration-200
            ${mode === BACKGROUND_MODES.BLUR
              ? 'bg-primary-500 text-white'
              : disabled
                ? 'bg-gray-100 text-gray-400'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          Blur
        </button>
      </div>

      {/* Color picker (shown when solid color mode) */}
      {mode === BACKGROUND_MODES.SOLID_COLOR && (
        <div className="space-y-2">
          <label className="text-sm text-gray-600">Color</label>
          <div className="flex items-center gap-2">
            {/* Preset colors */}
            <div className="flex gap-1">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  disabled={disabled}
                  className={`
                    w-7 h-7 rounded-full border-2 transition-transform
                    ${solidColor === color ? 'border-primary-500 scale-110' : 'border-gray-200'}
                    ${!disabled && 'hover:scale-105'}
                  `}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            {/* Custom color input */}
            <div className="relative">
              <input
                type="color"
                value={solidColor}
                onChange={e => onColorChange(e.target.value)}
                disabled={disabled}
                className="w-8 h-8 rounded cursor-pointer border border-gray-200"
              />
            </div>

            {/* Hex input */}
            <input
              type="text"
              value={solidColor}
              onChange={e => {
                const value = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                  onColorChange(value);
                }
              }}
              disabled={disabled}
              className="w-20 px-2 py-1 text-sm border border-gray-200 rounded"
              placeholder="#ffffff"
            />
          </div>
        </div>
      )}

      {/* Blur radius slider (shown when blur mode) */}
      {mode === BACKGROUND_MODES.BLUR && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm text-gray-600">Blur Amount</label>
            <span className="text-sm text-gray-500">{blurRadius}px</span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            value={blurRadius}
            onChange={e => onBlurRadiusChange(parseInt(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
        </div>
      )}
    </div>
  );
}
