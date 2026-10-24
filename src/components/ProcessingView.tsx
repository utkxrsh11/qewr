import React from 'react';
import { PixelTorch } from './PixelTorch.tsx';
import { CheckCircle2, Circle, Loader2, AlertTriangle, RefreshCw, ArrowLeft, XCircle } from 'lucide-react';

interface ProcessingViewProps {
  currentStepLabel: string;
  currentStepIndex: number; // 0 to 4
  onCancel: () => void;
  error: {
    message: string;
    technical?: string;
  } | null;
  onRetry: () => void;
  onBackToUpload: () => void;
}

const DEFAULT_STEPS = [
  'Reading your PDF...',
  'Finding chapters...',
  'Extracting concepts...',
  'Checking the results...',
  'Your course is ready!',
];

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  currentStepLabel,
  currentStepIndex,
  onCancel,
  error,
  onRetry,
  onBackToUpload,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-12 flex flex-col items-center">
      <div className="w-full bg-[#12162B] border-2 border-[#232A47] rounded-xl p-6 sm:p-8 shadow-2xl relative flex flex-col items-center">
        {/* Animated Pixel Loader */}
        <div className="mb-4">
          <PixelTorch size="lg" />
        </div>

        {error ? (
          /* Error State Screen */
          <div className="w-full flex flex-col items-center text-center animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-red-950/80 border-2 border-[#EF4444] text-[#EF4444] flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>

            <h2 className="font-pixel text-sm sm:text-base text-red-400 mb-2">
              Quest Interrupted
            </h2>

            <p className="text-sm sm:text-base text-slate-200 max-w-md mb-6 leading-relaxed">
              {error.message}
            </p>

            {/* Error Actions: Try again and Back to upload */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onRetry}
                className="btn-pixel-gold w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-amber-950" aria-hidden="true" />
                <span>Try again</span>
              </button>

              <button
                type="button"
                onClick={onBackToUpload}
                className="btn-pixel-dark w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <span>Back to upload</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Processing State */
          <div className="w-full flex flex-col items-center">
            <h2 className="font-pixel text-xs sm:text-sm text-[#F5C542] text-center mb-6 drop-shadow-sm">
              Analyzing Study Material
            </h2>

            {/* Step-by-step Status List */}
            <div className="w-full max-w-sm flex flex-col gap-3 mb-8" role="status" aria-live="polite">
              {DEFAULT_STEPS.map((stepText, idx) => {
                const isCompleted = currentStepIndex > idx;
                const isCurrent = currentStepIndex === idx;

                // Handle chunked step label replacement for step 2 (extracting)
                let displayLabel = stepText;
                if (isCurrent && idx === 2 && currentStepLabel.startsWith('Extracting concepts (part')) {
                  displayLabel = currentStepLabel;
                }

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isCurrent
                        ? 'bg-[#1A2038] border-[#F5C542] text-white shadow-[0_0_12px_rgba(245,197,66,0.15)]'
                        : isCompleted
                          ? 'bg-[#0E1224] border-teal-500/30 text-teal-300'
                          : 'bg-[#0B0D19]/40 border-transparent text-slate-500'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-[#22C55E]" aria-hidden="true" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-[#F5C542] animate-spin" aria-hidden="true" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600" aria-hidden="true" />
                      )}
                    </div>

                    <span
                      className={`text-xs sm:text-sm font-medium ${
                        isCurrent ? 'text-white font-semibold' : ''
                      }`}
                    >
                      {displayLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 3. Cancel Button */}
            <button
              type="button"
              onClick={onCancel}
              className="btn-pixel-dark px-5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400 border-[#252E52] flex items-center gap-2 cursor-pointer transition-colors"
              aria-label="Cancel course extraction and return to upload"
            >
              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
