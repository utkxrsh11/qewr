import React, { useState, useEffect } from 'react';
import { Sparkles, Clock, ArrowRight, X } from 'lucide-react';
import { getIsoDateKey } from '../../services/statsService.ts';

interface DueBannerProps {
  dueCount: number;
  hasPlayedAnything: boolean;
  onStartRevision: () => void;
}

const BANNER_DISMISSED_KEY = 'studyquest_banner_dismissed';

export const DueBanner: React.FC<DueBannerProps> = ({
  dueCount,
  hasPlayedAnything,
  onStartRevision,
}) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const today = getIsoDateKey();
      const lastDismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
      if (lastDismissed === today || dueCount <= 0 || !hasPlayedAnything) {
        setDismissed(true);
      } else {
        setDismissed(false);
      }
    } catch {
      setDismissed(false);
    }
  }, [dueCount, hasPlayedAnything]);

  if (dismissed || dueCount <= 0 || !hasPlayedAnything) {
    return null;
  }

  const handleDismiss = () => {
    try {
      const today = getIsoDateKey();
      localStorage.setItem(BANNER_DISMISSED_KEY, today);
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="Spaced repetition review alert"
      className="relative mb-6 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-950/80 via-[#181528]/95 to-amber-950/80 p-3.5 sm:p-4 text-amber-200 shadow-[0_0_20px_rgba(245,197,66,0.18)] backdrop-blur-xs"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300 shadow-inner">
            <Clock className="w-5 h-5 text-[#F5C542]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[11px] text-[#F5C542] tracking-wider uppercase">
                Spaced Repetition
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold">
                {dueCount} {dueCount === 1 ? 'concept' : 'concepts'} need review.
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Concept strength fades over time. Review now to keep your knowledge locked in.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={onStartRevision}
            className="btn-pixel-gold px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-black" aria-hidden="true" />
            <span>Start smart revision</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="px-2.5 py-1.5 rounded-lg border border-[#2B355E] bg-[#141A33] hover:bg-[#1C2548] text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors cursor-pointer"
            aria-label="Dismiss review reminder for today"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};
