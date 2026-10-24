import React from 'react';
import { RevisionPlan } from '../../types/course.ts';
import { GAME_REGISTRY } from '../../services/gameRegistry.ts';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';

interface RevisionBriefViewProps {
  plan: RevisionPlan;
  onStartSession: (plan: RevisionPlan) => void;
  onCancel: () => void;
}

export const RevisionBriefView: React.FC<RevisionBriefViewProps> = ({
  plan,
  onStartSession,
  onCancel,
}) => {
  const candidates = plan.candidates || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 w-full animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2B355E] bg-[#141A33] hover:bg-[#1C2548] text-slate-300 font-mono text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-pixel text-xs text-[#F5C542] uppercase tracking-wider">
            Smart Revision Protocol
          </span>
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border-2 border-amber-500/50 bg-[#12162B] p-5 sm:p-7 shadow-[0_0_30px_rgba(245,197,66,0.15)] relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#252E54]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-inner">
                <Sparkles className="w-5 h-5 text-[#F5C542]" />
              </div>
              <div>
                <h1 className="font-pixel text-base sm:text-lg text-white">
                  Smart Revision Brief
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Targeted reinforcement session optimized for memory retention
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap font-mono text-xs">
            <span className="px-2.5 py-1 rounded-md bg-[#1B2240] border border-[#2D396B] text-amber-300">
              {candidates.length} Concepts
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[#1B2240] border border-[#2D396B] text-emerald-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              +30 XP Bonus
            </span>
          </div>
        </div>

        {/* Benefits notice */}
        <div className="mt-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs flex items-start gap-3">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-amber-300">Streamlined Revision Format: </span>
            This session is optimized for speed and variety. Concepts are rotated to different game styles whenever possible, with 2 questions in Runner, 1 board in Lie Hunter, and 1 order sequence in Platformer. Scoring 80%+ will extend the concept&apos;s review interval!
          </div>
        </div>

        {/* Selected Concepts List */}
        <div className="mt-6">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <span>Target Concepts in this Session ({candidates.length})</span>
          </h2>

          <div className="space-y-3">
            {candidates.map((cand, idx) => {
              const gameEntry = GAME_REGISTRY[cand.suggestedGame];
              const GameIcon = gameEntry.icon;
              const strengthPercent = Math.round(cand.strength * 100);

              let strengthBadge = {
                bg: 'bg-red-500/20 text-red-300 border-red-500/40',
                label: 'Weak',
              };
              if (cand.state === 'mastered') {
                strengthBadge = {
                  bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                  label: 'Mastered',
                };
              } else if (cand.state === 'shaky') {
                strengthBadge = {
                  bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                  label: 'Shaky',
                };
              } else if (cand.state === 'untouched') {
                strengthBadge = {
                  bg: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
                  label: 'Untouched',
                };
              }

              const rotatedFrom = cand.progress?.lastGame;
              const isRotated = rotatedFrom && rotatedFrom !== cand.suggestedGame;

              return (
                <div
                  key={cand.concept.id}
                  className="rounded-xl border border-[#232B4E] bg-[#161B33]/80 hover:bg-[#1A213D] p-3.5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-md bg-[#21294D] border border-[#2E3A6E] text-slate-400 font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">
                          {cand.concept.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${strengthBadge.bg}`}>
                          {strengthBadge.label} ({strengthPercent}%)
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-mono flex-wrap">
                        <span>{cand.chapter.title}</span>
                        <span>•</span>
                        <span className="text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {cand.reason}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Game */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1F274B] border border-[#303E75] text-xs font-mono text-white">
                      <GameIcon className="w-4 h-4 text-[#F5C542]" />
                      <span>{gameEntry.name}</span>
                    </div>

                    {isRotated && (
                      <span
                        title={`Format rotated from ${GAME_REGISTRY[rotatedFrom].name}`}
                        className="px-2 py-1 rounded-md bg-purple-950/60 border border-purple-700/60 text-purple-300 text-[10px] font-mono flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3 text-purple-400" />
                        <span>Rotated</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action button bar */}
        <div className="mt-8 pt-5 border-t border-[#252E54] flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#2E3A6C] bg-[#161C36] hover:bg-[#1D2548] text-slate-300 font-mono text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onStartSession(plan)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F5C542] via-amber-400 to-[#F5C542] hover:brightness-110 text-black font-pixel text-xs shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>Begin Revision Quest</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
};
