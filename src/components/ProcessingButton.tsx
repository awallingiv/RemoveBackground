'use client';

/**
 * Processing Button Component
 *
 * Button that triggers background removal with progress states.
 */

import React from 'react';
import { ProgressState, PROGRESS_STATES } from '@/lib/constants';

interface ProcessingButtonProps {
  onClick: () => void;
  state: ProgressState;
  statusMessage?: string;
  disabled?: boolean;
  className?: string;
}

const STATE_LABELS: Record<ProgressState, string> = {
  [PROGRESS_STATES.IDLE]: 'Remove Background',
  [PROGRESS_STATES.LOADING_MODEL]: 'Loading Model...',
  [PROGRESS_STATES.PREPROCESSING]: 'Preprocessing...',
  [PROGRESS_STATES.RUNNING_INFERENCE]: 'Removing Background...',
  [PROGRESS_STATES.POSTPROCESSING]: 'Finishing Up...',
  [PROGRESS_STATES.COMPLETE]: 'Done!',
  [PROGRESS_STATES.ERROR]: 'Try Again',
};

export default function ProcessingButton({
  onClick,
  state,
  statusMessage,
  disabled = false,
  className = '',
}: ProcessingButtonProps) {
  const nonProcessingStates: ProgressState[] = [
    PROGRESS_STATES.IDLE,
    PROGRESS_STATES.COMPLETE,
    PROGRESS_STATES.ERROR,
  ];
  const isProcessing = !nonProcessingStates.includes(state);

  const buttonLabel = STATE_LABELS[state];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <button
        onClick={onClick}
        disabled={disabled || isProcessing}
        className={`
          relative flex items-center justify-center gap-2
          px-8 py-4 rounded-xl font-semibold text-lg
          transition-all duration-200 min-w-[240px]
          ${isProcessing
            ? 'bg-primary-400 text-white cursor-wait'
            : state === PROGRESS_STATES.ERROR
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : state === PROGRESS_STATES.COMPLETE
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : disabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg hover:shadow-xl'
          }
        `}
      >
        {/* Spinner */}
        {isProcessing && (
          <svg
            className="animate-spin h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {/* Checkmark for complete */}
        {state === PROGRESS_STATES.COMPLETE && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}

        {/* Error icon */}
        {state === PROGRESS_STATES.ERROR && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )}

        <span>{buttonLabel}</span>
      </button>

      {/* Status message */}
      {statusMessage && (
        <p className={`mt-2 text-sm ${state === PROGRESS_STATES.ERROR ? 'text-red-600' : 'text-gray-600'}`}>
          {statusMessage}
        </p>
      )}
    </div>
  );
}
