import React, { useState } from 'react';
import { RevisionPlan, ConceptReviewCandidate, Concept } from '../../types/course.ts';
import { GAME_REGISTRY } from '../../services/gameRegistry.ts';
import { GamesInLevelChips } from '../GamesInLevelChips.tsx';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Clock,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Quote,
  Shield,
  Layers,
  BookOpen,
} from 'lucide-react';

interface RevisionBriefViewProps {
  plan: RevisionPlan;
  onStartSession: (plan: RevisionPlan, practiceMode: boolean) => void;
  onBackToDashboard: () => void;
}

export const RevisionBriefView: React.FC<RevisionBriefViewProps> = ({
  plan,
  onStartSession,
  onBackToDashboard,
}) => {
  const [practiceMode, setPracticeMode] = useState(false);
  const [expandedRecapId, setExpandedRecapId] = useState<string | null>(null);

  const candidates: ConceptReviewCandidate[] = plan.candidates || [];

  const sizeLabel =
    plan.size === 'quick'
      ? 'Quick Session (4 concepts · ~3 min)'
      : plan.size === 'deep'
      ? 'Deep Session (9 concepts · ~10 min)'
      : plan.size === 'custom'
      ? `${candidates.length} Concepts Session`
      : 'Standard Session (6 concepts · ~6 min)';

  const toggleRecap = (id: string) => {
    setExpandedRecapId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 w-full animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2B355E] bg-[#141A33] hover:bg-[#1C2548] text-slate-300 font-mono text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-pixel text-xs text-[#F5C542] uppercase tracking-wider">
            Smart Revision Brief
          </span>
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border-2 border-amber-500/50 bg-[#12162B] p-5 sm:p-7 shadow-[0_0_30px_rgba(245,197,66,0.15)] relative overflow-hidden text-left">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#252E54]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-inner">
                <Sparkles className="w-5 h-5 text-[#F5C542]" />
              </div>
              <div>
                <h1 className="font-pixel text-base sm:text-lg text-white">Smart Revision</h1>
                <p className="text-xs text-amber-300 font-mono mt-0.5">{sizeLabel}</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 mt-2.5 max-w-xl">
              Targeting your weakest and most overdue concepts. Game formats are rotated from last
              time to strengthen multi-angle retention.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-[#182042] border border-[#2B3A70] text-xs font-mono text-slate-300">
              {candidates.length} {candidates.length === 1 ? 'Concept' : 'Concepts'}
            </span>
          </div>
        </div>

        {/* Concept list */}
        <div className="my-6 space-y-3" aria-live="polite">
          <h2 className="text-xs font-pixel text-slate-400 tracking-wider uppercase mb-2">
            Concepts in this Session
          </h2>

          {candidates.map((cand) => {
            const gameEntry = GAME_REGISTRY[cand.suggestedGame] || GAME_REGISTRY.runner;
            const GameIcon = gameEntry.icon;
            const isExpanded = expandedRecapId === cand.concept.id;

            let typeBadgeClass = 'bg-teal-950/80 text-[#2DD4BF] border-teal-500/40';
            let typeLabel = 'Fact';
            if (cand.concept.type === 'process') {
              typeBadgeClass = 'bg-amber-950/80 text-[#F5C542] border-amber-500/40';
              typeLabel = 'Process';
            } else if (cand.concept.type === 'detail') {
              typeBadgeClass = 'bg-purple-950/80 text-[#C084FC] border-purple-500/40';
              typeLabel = 'Detail';
            }

            return (
              <div
                key={cand.concept.id}
                className="rounded-xl border border-[#232D52] bg-[#161B33] p-4 transition-all hover:border-[#38467D]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg bg-[#0F1426] border border-[#2B3B70] flex items-center justify-center shrink-0 text-[#F5C542]"
                      title={`Format: ${gameEntry.name}`}
                    >
                      <GameIcon className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white">{cand.concept.name}</span>
                        <span
                          className={`px-2 py-0.2 rounded text-[10px] font-mono border ${typeBadgeClass}`}
                        >
                          {typeLabel}
                        </span>
                        <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {cand.reason}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {cand.chapter?.title || 'Chapter'} · Page {cand.concept.page}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => toggleRecap(cand.concept.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono text-teal-400 hover:text-teal-300 hover:bg-teal-950/30 border border-teal-500/30 transition-colors cursor-pointer"
                      aria-expanded={isExpanded}
                    >
                      <span>{isExpanded ? 'Hide recap' : 'Quick recap'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Quick Recap */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[#232D52] space-y-2 text-xs text-slate-300 bg-[#0E1324] p-3 rounded-lg animate-in fade-in duration-200">
                    <p className="leading-relaxed">
                      <span className="font-bold text-white">Summary: </span>
                      {cand.concept.summary}
                    </p>

                    {cand.concept.type === 'process' && cand.concept.steps && (
                      <div className="space-y-1 pt-1">
                        <span className="font-bold text-amber-300 block">Process Steps:</span>
                        <ol className="list-decimal list-inside space-y-0.5 text-slate-300 pl-1 font-mono text-[11px]">
                          {cand.concept.steps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div className="pt-1.5 flex items-start gap-1.5 text-[11px] text-teal-300 italic border-l-2 border-teal-500/40 pl-2">
                      <Quote className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>
                        Page {cand.concept.page}: &ldquo;{cand.concept.sourceQuote}&rdquo;
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Games in this session row */}
        <GamesInLevelChips level={plan.virtualLevel} />

        {/* Practice Mode Toggle & Start Button Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#232D52]">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-mono text-slate-300 select-none">
            <input
              type="checkbox"
              checked={practiceMode}
              onChange={(e) => setPracticeMode(e.target.checked)}
              className="w-4 h-4 rounded bg-[#161B33] border-[#2D3A68] text-[#F5C542] focus:ring-[#F5C542] accent-[#F5C542] cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Practice mode (no lives / no pressure)</span>
            </span>
          </label>

          <button
            type="button"
            onClick={() => onStartSession(plan, practiceMode)}
            className="btn-pixel-gold w-full sm:w-auto px-7 py-3.5 rounded-xl font-pixel text-xs sm:text-sm text-black flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>Start revision</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
};
