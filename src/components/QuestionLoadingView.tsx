import React, { useState, useEffect } from 'react';
import { PixelTorch } from './PixelTorch.tsx';
import { GameChoice } from '../types/course.ts';
import { AlertTriangle, RefreshCw, ArrowLeft, XCircle, Zap, CheckCircle2, Gamepad2 } from 'lucide-react';

interface QuestionLoadingViewProps {
  gameType?: GameChoice;
  onCancel: () => void;
  error: {
    message: string;
    technical?: string;
  } | null;
  onRetry: () => void;
  onBackToCourse: () => void;
  onInstantLaunch?: () => void;
  onPlayRunnerInstead?: () => void;
}

const RUNNER_STEPS = [
  'Reviewing concept objectives & quotes...',
  'Generating realistic distractors & scenarios...',
  'Calibrating question difficulty tiers...',
  'Forging dungeon runner challenge...',
];

const LIE_HUNTER_STEPS = [
  'Examining concept objectives & quotes...',
  'Drafting authentic evidence statements...',
  'Crafting subtle corruption for the lie...',
  'Preparing your case files...',
];

export const QuestionLoadingView: React.FC<QuestionLoadingViewProps> = ({
  gameType = 'runner',
  onCancel,
  error,
  onRetry,
  onBackToCourse,
  onInstantLaunch,
  onPlayRunnerInstead,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(15);

  const steps = gameType === 'lieHunter' ? LIE_HUNTER_STEPS : RUNNER_STEPS;
  const loadingTitle =
    gameType === 'lieHunter' ? 'Preparing your case files...' : 'Preparing your challenge...';

  useEffect(() => {
    if (error) return;

    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
      setProgressPercent((prev) => Math.min(prev + 22, 94));
    }, 1500);

    return () => clearInterval(interval);
  }, [error, steps.length]);

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-12 flex flex-col items-center">
      <div className="w-full bg-[#12162B] border-2 border-[#232A47] rounded-2xl p-6 sm:p-8 shadow-2xl relative flex flex-col items-center">
        {/* Animated Pixel Torch */}
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
              {gameType === 'lieHunter' ? 'Case File Interrupted' : 'Challenge Interrupted'}
            </h2>

            <p className="text-sm sm:text-base text-slate-200 max-w-md mb-6 leading-relaxed">
              {error.message}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {/* Button 1: Try again */}
              <button
                type="button"
                onClick={onRetry}
                className="btn-pixel-gold w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-amber-950" aria-hidden="true" />
                <span>Try again</span>
              </button>

              {/* Button 2: Play Concept Runner instead (for Lie Hunter failure) */}
              {onPlayRunnerInstead && (
                <button
                  type="button"
                  onClick={onPlayRunnerInstead}
                  className="btn-pixel-teal w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Gamepad2 className="w-4 h-4 text-teal-950" aria-hidden="true" />
                  <span>Play Concept Runner instead</span>
                </button>
              )}

              {/* Offline fallback button if available and not Lie Hunter runner fallback */}
              {!onPlayRunnerInstead && onInstantLaunch && (
                <button
                  type="button"
                  onClick={onInstantLaunch}
                  className="btn-pixel-teal w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Zap className="w-4 h-4 text-teal-950 fill-current" aria-hidden="true" />
                  <span>Play Offline Challenge</span>
                </button>
              )}

              {/* Button 3: Back to course */}
              <button
                type="button"
                onClick={onBackToCourse}
                className="btn-pixel-dark w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <span>Back to course</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Loading State */
          <div className="w-full flex flex-col items-center text-center">
            <h2 className="font-pixel text-xs sm:text-sm text-[#F5C542] mb-2 drop-shadow-sm">
              {loadingTitle}
            </h2>

            <p className="text-xs text-sky-400 font-mono max-w-xs mb-4 min-h-[20px] transition-all duration-300">
              {steps[stepIndex]}
            </p>

            {/* Glowing progress bar */}
            <div className="w-full max-w-xs h-2 bg-[#0A0D1B] rounded-full overflow-hidden border border-[#232A47] mb-6">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(245,197,66,0.6)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Preparation checklist mini indicators */}
            <div className="w-full max-w-xs space-y-1.5 mb-6 text-left">
              {steps.map((step, idx) => {
                const isDone = idx < stepIndex;
                const isCurrent = idx === stepIndex;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 text-[11px] font-mono transition-colors ${
                      isDone
                        ? 'text-emerald-400'
                        : isCurrent
                        ? 'text-amber-300 font-bold'
                        : 'text-slate-600'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? 'border-amber-400 animate-pulse'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isCurrent && <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />}
                      </div>
                    )}
                    <span className="truncate">{step}</span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="btn-pixel-dark px-5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400 border-[#252E52] flex items-center gap-2 cursor-pointer transition-colors"
              aria-label="Cancel question preparation and return"
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
