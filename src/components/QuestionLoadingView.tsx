import React, { useState, useEffect } from 'react';
import { PixelTorch } from './PixelTorch.tsx';
import { GameChoice } from '../types/course.ts';
import { GAME_REGISTRY } from '../services/gameRegistry.ts';
import {
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  XCircle,
  Zap,
  CheckCircle2,
  Gamepad2,
  Loader2,
} from 'lucide-react';

export interface SegmentStatusItem {
  gameId: GameChoice;
  name: string;
  status: 'preparing' | 'done' | 'failed';
}

interface QuestionLoadingViewProps {
  gameType?: GameChoice;
  segmentStatuses?: SegmentStatusItem[];
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

export const QuestionLoadingView: React.FC<QuestionLoadingViewProps> = ({
  gameType = 'runner',
  segmentStatuses,
  onCancel,
  error,
  onRetry,
  onBackToCourse,
  onInstantLaunch,
  onPlayRunnerInstead,
}) => {
  const [progressPercent, setProgressPercent] = useState(25);

  useEffect(() => {
    if (error) return;

    const interval = setInterval(() => {
      setProgressPercent((prev) => Math.min(prev + 18, 92));
    }, 1200);

    return () => clearInterval(interval);
  }, [error]);

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-12 flex flex-col items-center font-sans">
      <div className="w-full bg-[#12162B] border-2 border-[#232A47] rounded-2xl p-6 sm:p-8 shadow-2xl relative flex flex-col items-center">
        {/* Animated Pixel Torch */}
        <div className="mb-4">
          <PixelTorch size="lg" />
        </div>

        {error ? (
          /* Error State Screen with 3 Buttons */
          <div className="w-full flex flex-col items-center text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-950/80 border-2 border-[#EF4444] text-[#EF4444] flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>

            <h2 className="font-pixel text-xs sm:text-sm text-red-400 mb-2">
              Challenge Interrupted
            </h2>

            <p className="text-sm sm:text-base text-slate-200 max-w-md mb-6 leading-relaxed">
              {error.message}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              {/* Button 1: Try again */}
              <button
                type="button"
                onClick={onRetry}
                className="btn-pixel-gold w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-pixel flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-950" aria-hidden="true" />
                <span>Try again</span>
              </button>

              {/* Button 2: Play these concepts in Concept Runner instead */}
              {onPlayRunnerInstead && (
                <button
                  type="button"
                  onClick={onPlayRunnerInstead}
                  className="btn-pixel-teal w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Gamepad2 className="w-4 h-4 text-teal-950" aria-hidden="true" />
                  <span>Play in Concept Runner instead</span>
                </button>
              )}

              {/* Button 3: Back to course */}
              <button
                type="button"
                onClick={onBackToCourse}
                className="btn-pixel-dark w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>Back to course</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Loading State */
          <div className="w-full flex flex-col items-center text-center">
            <h2 className="font-pixel text-xs sm:text-sm text-[#F5C542] mb-3 drop-shadow-sm">
              Preparing your challenge...
            </h2>

            {/* Glowing progress bar */}
            <div className="w-full max-w-xs h-2 bg-[#0A0D1B] rounded-full overflow-hidden border border-[#232A47] mb-6">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(245,197,66,0.6)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Segment status lines per Section 5 */}
            {segmentStatuses && segmentStatuses.length > 0 ? (
              <div className="w-full max-w-xs space-y-2 mb-6 text-left">
                {segmentStatuses.map((seg, idx) => {
                  const isDone = seg.status === 'done';
                  const isFailed = seg.status === 'failed';
                  const isPreparing = seg.status === 'preparing';

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs font-mono transition-colors ${
                        isDone
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : isFailed
                          ? 'bg-red-950/30 border-red-500/40 text-red-300'
                          : 'bg-[#0E1326] border-[#222B4D] text-amber-300'
                      }`}
                    >
                      <span className="font-semibold">{seg.name}</span>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        {isDone ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="font-bold">done</span>
                          </>
                        ) : isFailed ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                            <span>failed</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                            <span>preparing...</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-sky-400 font-mono max-w-xs mb-6">
                Forging dungeon challenges...
              </p>
            )}

            <button
              type="button"
              onClick={onCancel}
              className="btn-pixel-dark px-5 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400 border-[#252E52] flex items-center gap-2 cursor-pointer transition-colors"
              aria-label="Cancel challenge preparation"
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
