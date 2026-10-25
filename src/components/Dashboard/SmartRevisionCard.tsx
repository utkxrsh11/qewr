import React, { useState, useEffect } from 'react';
import {
  RevisionPlan,
  RevisionSize,
  ConceptReviewCandidate,
  ReadinessCounts,
} from '../../types/course.ts';
import { GAME_REGISTRY } from '../../services/gameRegistry.ts';
import { Sparkles, ArrowRight, Clock, Shield, CheckCircle2, BookOpen } from 'lucide-react';

const REVISION_SIZE_STORAGE_KEY = 'studyquest_revision_size';

interface SmartRevisionCardProps {
  plan: RevisionPlan | null;
  selectedSize: RevisionSize;
  onSizeChange: (size: RevisionSize) => void;
  onStartRevision: (practiceMode: boolean) => void;
  onGoToCourse: () => void;
  counts: ReadinessCounts;
  totalConcepts: number;
}

export const SmartRevisionCard: React.FC<SmartRevisionCardProps> = ({
  plan,
  selectedSize,
  onSizeChange,
  onStartRevision,
  onGoToCourse,
  counts,
  totalConcepts,
}) => {
  const [practiceMode, setPracticeMode] = useState(false);

  const candidateCount = plan?.candidates?.length || 0;
  const isEverythingMastered =
    counts.total > 0 && counts.mastered === counts.total && counts.due === 0;
  const isNothingPlayed = counts.untouched === counts.total;

  const handleSizeClick = (size: RevisionSize) => {
    try {
      localStorage.setItem(REVISION_SIZE_STORAGE_KEY, size);
    } catch {
      // ignore
    }
    onSizeChange(size);
  };

  // Section 9: Empty States
  if (!plan || candidateCount < 2) {
    if (isEverythingMastered) {
      return (
        <div className="mb-6 rounded-2xl border-2 border-emerald-500/50 bg-[#121B2A] p-5 sm:p-6 shadow-lg text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h2 className="font-pixel text-sm sm:text-base text-white">Smart Revision</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                You&apos;re on top of everything. Come back tomorrow, or play a Deep session to keep
                sharp.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                handleSizeClick('deep');
                onStartRevision(practiceMode);
              }}
              className="btn-pixel-gold px-5 py-2.5 rounded-xl font-pixel text-xs text-black shrink-0 cursor-pointer shadow-md"
            >
              Play Deep Session
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-6 rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-5 sm:p-6 shadow-lg text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="font-pixel text-sm sm:text-base text-white">Smart Revision</h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Nothing to revise yet. Finish a level first, or come back when concepts are due.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToCourse}
            className="btn-pixel-teal px-5 py-2.5 rounded-xl font-bold text-xs text-slate-900 shrink-0 flex items-center gap-2 cursor-pointer shadow-md"
          >
            <BookOpen className="w-4 h-4" />
            <span>Go to Course</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border-2 border-[#D9A422] bg-[#14182E] p-5 sm:p-6 shadow-[0_4px_24px_rgba(245,197,66,0.18)] text-left relative overflow-hidden">
      {/* Subtle gold accent border & header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#252E54]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5C542] animate-pulse" />
            <h2 className="font-pixel text-base sm:text-lg text-[#F5C542]">Smart Revision</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-200">
            A mixed session built from your weakest and most overdue concepts.
          </p>
        </div>

        {/* Size selector radio chips */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 mr-1">Session size:</span>
          {(
            [
              { id: 'quick', label: 'Quick (4)', time: '~3 min' },
              { id: 'standard', label: 'Standard (6)', time: '~6 min' },
              { id: 'deep', label: 'Deep (9)', time: '~10 min' },
            ] as const
          ).map((s) => {
            const isSelected = selectedSize === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSizeClick(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#F5C542] text-black font-bold shadow-md shadow-amber-500/20'
                    : 'bg-[#182042] text-slate-300 hover:text-white hover:bg-[#202B57] border border-[#2B3A70]'
                }`}
                aria-pressed={isSelected}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview list of concepts included */}
      <div className="my-4">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2.5">
          <span>Concepts queued for this session:</span>
          <span className="text-amber-300">{candidateCount} concepts</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {plan.candidates.map((cand) => {
            const gameEntry = GAME_REGISTRY[cand.suggestedGame] || GAME_REGISTRY.runner;
            const GameIcon = gameEntry.icon;

            return (
              <div
                key={cand.concept.id}
                className="p-2.5 rounded-xl bg-[#0F1326] border border-[#232D52] flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg bg-[#182042] border border-[#2D3B72] text-[#F5C542] flex items-center justify-center shrink-0"
                    title={`Format: ${gameEntry.name}`}
                  >
                    <GameIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate text-xs">{cand.concept.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      {cand.chapter?.title || 'Chapter'}
                    </p>
                  </div>
                </div>

                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 bg-[#1D2548] text-amber-300 border border-[#2E3C75]">
                  {cand.reason}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer controls: Practice mode toggle & Start button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[#252E54]">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300 select-none">
          <input
            type="checkbox"
            checked={practiceMode}
            onChange={(e) => setPracticeMode(e.target.checked)}
            className="w-4 h-4 rounded bg-[#161B33] border-[#2D3A68] text-[#F5C542] focus:ring-[#F5C542] accent-[#F5C542] cursor-pointer"
          />
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Practice mode (no lives)</span>
          </span>
        </label>

        <button
          type="button"
          onClick={() => onStartRevision(practiceMode)}
          className="btn-pixel-gold px-7 py-3 rounded-xl font-pixel text-xs sm:text-sm text-black flex items-center justify-center gap-2 cursor-pointer shadow-lg w-full sm:w-auto"
        >
          <Sparkles className="w-4 h-4 text-black" />
          <span>Start smart revision</span>
          <ArrowRight className="w-4 h-4 text-black" />
        </button>
      </div>
    </div>
  );
};
