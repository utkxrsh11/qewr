import React, { useState, useEffect } from 'react';
import { Sparkles, Clock, ArrowRight, X } from 'lucide-react';

interface DueBannerProps {
  dueCount: number;
  onStartRevision: () => void;
}

const BANNER_DISMISSED_KEY = 'studyquest_banner_dismissed';

export const DueBanner: React.FC<DueBannerProps> = ({ dueCount, onStartRevision }) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const lastDismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
      if (lastDismissed === today || dueCount <= 0) {
        setDismissed(true);
      } else {
        setDismissed(false);
      }
    } catch {
      setDismissed(false);
    }
  }, [dueCount]);

  if (dismissed || dueCount <= 0) {
    return null;
  }

  const handleDismiss = () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(BANNER_DISMISSED_KEY, today);
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <div className="relative mb-6 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-950/80 via-[#181528]/90 to-amber-950/80 p-3.5 sm:p-4 text-amber-200 shadow-[0_0_20px_rgba(245,197,66,0.18)] backdrop-blur-xs animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300 shadow-inner">
            <Clock className="w-5 h-5 animate-pulse" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[11px] text-[#F5C542] tracking-wider uppercase">
                Spaced Repetition Alert
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold">
                {dueCount} {dueCount === 1 ? 'concept' : 'concepts'} due
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Knowledge decays over time! Reinforce your weakest & overdue concepts to lock in retention.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={onStartRevision}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#F5C542] to-amber-500 hover:from-amber-400 hover:to-amber-600 text-black font-pixel text-[10px] shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-black" aria-hidden="true" />
            <span>Start Smart Revision</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
