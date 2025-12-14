'use client';

/**
 * Ad Slot Placeholder Component
 *
 * This component renders a placeholder for future ad integration.
 * In production, this would be replaced with actual ad network code.
 */

import React from 'react';

interface AdSlotProps {
  position: 'header' | 'sidebar' | 'footer';
  className?: string;
}

const AD_SIZES: Record<string, { width: number; height: number; label: string }> = {
  header: { width: 728, height: 90, label: 'Leaderboard (728x90)' },
  sidebar: { width: 300, height: 250, label: 'Medium Rectangle (300x250)' },
  footer: { width: 728, height: 90, label: 'Leaderboard (728x90)' },
};

export default function AdSlot({ position, className = '' }: AdSlotProps) {
  const { width, height, label } = AD_SIZES[position];

  return (
    <div
      className={`
        flex items-center justify-center
        bg-gray-100 border-2 border-dashed border-gray-300
        rounded-lg text-gray-400 text-sm
        ${className}
      `}
      style={{
        width: '100%',
        maxWidth: width,
        height: height,
        minHeight: height,
      }}
    >
      <div className="text-center p-4">
        <div className="text-xs uppercase tracking-wide mb-1">Advertisement</div>
        <div className="text-xs">{label}</div>
      </div>
    </div>
  );
}
