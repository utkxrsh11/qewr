import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, RotateCcw, Clock, Zap } from 'lucide-react';
import { RevisionPlan } from '../../types/course.ts';

interface SmartRevisionCardProps {
  plan: RevisionPlan | null;
  dueCount: number;
  onStartRevision: () => void;
}

export const SmartRevisionCard: React.FC<SmartRevisionCardProps> = ({
  plan,
  dueCount,
  onStartRevision,
}) => {
  const candidateCount = plan?.candidates?.length || 0;

  return (
    <div className="mb-6 rounded-2xl border-2 border-amber-500/60 bg-gradient-to-r from-[#17142A] via-[#141A33] to-[#17142A] p-5 sm:p-6 shadow-[0_0_25px_rgba(245,197,66,0.15)] relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-pixel bg-[#F5C542]/20 border border-[#F5C542]/50 text-[#F5C542] tracking-wider uppercase flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#F5C542]" />
              Smart Spaced Repetition
            </span>
            {dueCount > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950/80 border border-red-700/60 text-red-300 font-bold animate-pulse">
                {dueCount} overdue
              </span>
            )}
          </div>

          <h2 className="font-pixel text-base sm:text-lg text-white">
            Smart Revision Session Ready
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            One click generates a rapid multi-game revision round targeting your weakest and most overdue concepts, automatically rotating game types to build durable memory.
          </p>

          <div className="flex items-center gap-4 pt-1 text-xs font-mono text-slate-400 flex-wrap">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Clock className="w-3.5 h-3.5" />
              <span>{candidateCount} concepts queued</span>
            </span>
            <span className="flex items-center gap-1.5 text-purple-300">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Format rotation active</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-300">
              <Zap className="w-3.5 h-3.5" />
              <span>+30 XP completion bonus</span>
            </span>
          </div>
        </div>

        <div className="shrink-0 self-start lg:self-center">
          <button
            type="button"
            onClick={onStartRevision}
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#F5C542] via-amber-400 to-[#F5C542] hover:brightness-110 text-black font-pixel text-xs sm:text-sm shadow-xl shadow-amber-500/25 transition-all transform hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>Launch Smart Revision</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
};
