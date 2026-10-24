import React, { useState, useEffect } from 'react';
import { Level, Concept, GameChoice } from '../types/course.ts';
import { GameChoiceSelector, getInitialGameChoice } from './GameChoiceSelector.tsx';
import { clearCachedQuestionsForLevel } from '../services/questionService.ts';
import { clearCachedLieHunterForLevel } from '../services/lieHunterService.ts';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Quote,
  Layers,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

interface LearnCardViewProps {
  level: Level;
  totalLevelsInChapter: number;
  onBackToCourse: () => void;
  onStartGame: (
    practiceMode: boolean,
    forceRegenerate?: boolean,
    targetLevel?: Level,
    selectedGame?: GameChoice
  ) => void;
}

export const LearnCardView: React.FC<LearnCardViewProps> = ({
  level,
  totalLevelsInChapter,
  onBackToCourse,
  onStartGame,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [practiceMode, setPracticeMode] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameChoice>(() => getInitialGameChoice(level));

  useEffect(() => {
    setSelectedGame(getInitialGameChoice(level));
  }, [level]);

  const concepts = level.concepts || [];
  const currentConcept: Concept | undefined = concepts[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === concepts.length - 1;

  // Keyboard navigation support: Left / Right arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && !isLast) {
        setCurrentIndex((prev) => Math.min(concepts.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' && !isFirst) {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isFirst, isLast, concepts.length]);

  if (!currentConcept) {
    return null;
  }

  // Type badge styling matching Phase 1
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'fact':
        return {
          label: 'Fact',
          classes: 'bg-teal-950/80 text-[#2DD4BF] border border-teal-500/40',
          dot: 'bg-[#2DD4BF]',
        };
      case 'process':
        return {
          label: 'Process',
          classes: 'bg-amber-950/80 text-[#F5C542] border border-amber-500/40',
          dot: 'bg-[#F5C542]',
        };
      case 'detail':
        return {
          label: 'Detail',
          classes: 'bg-purple-950/80 text-[#C084FC] border border-purple-500/40',
          dot: 'bg-[#C084FC]',
        };
      default:
        return {
          label: 'Fact',
          classes: 'bg-slate-900 text-slate-300 border border-slate-700',
          dot: 'bg-slate-400',
        };
    }
  };

  const badge = getTypeBadge(currentConcept.type);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col items-center">
      {/* 1. Top Bar */}
      <div className="w-full flex items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={onBackToCourse}
          className="btn-pixel-dark px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542]"
          aria-label="Back to course overview"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to course</span>
        </button>

        <div className="text-right">
          <p className="text-xs font-mono text-slate-400 truncate max-w-xs">
            {level.chapterTitle}
          </p>
          <p className="font-pixel text-[11px] text-[#F5C542]">
            Level {level.levelNumber} of {totalLevelsInChapter}
          </p>
        </div>
      </div>

      {/* 2. Progress Indicator */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-slate-300 font-medium">
          Concept {currentIndex + 1} of {concepts.length}
        </span>
        <div className="flex items-center gap-1.5 ml-2" aria-hidden="true">
          {concepts.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-6 bg-[#F5C542]'
                  : idx < currentIndex
                    ? 'w-2 bg-[#2DD4BF]'
                    : 'w-2 bg-[#232B4A]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 3. Large Learn Card */}
      <article
        className="w-full dungeon-card p-6 sm:p-8 bg-[#12162B] border-2 border-[#232A47] rounded-xl shadow-2xl relative mb-6"
        aria-label={`Concept ${currentIndex + 1}: ${currentConcept.name}`}
      >
        {/* Header: Type badge & Page tag */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider ${badge.classes}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
            {badge.label}
          </span>

          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono bg-[#1B213D] text-slate-300 border border-[#2B355E]">
            Page {currentConcept.page}
          </span>
        </div>

        {/* Concept Name */}
        <h2 className="font-pixel text-lg sm:text-2xl text-white tracking-tight leading-snug mb-4 text-[#F5C542]">
          {currentConcept.name}
        </h2>

        {/* Readable Summary */}
        <p className="text-sm sm:text-base text-slate-200 leading-relaxed mb-6 font-sans">
          {currentConcept.summary}
        </p>

        {/* Ordered Process Steps (if type is process) */}
        {currentConcept.type === 'process' && currentConcept.steps && currentConcept.steps.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-[#0B0D19] border border-[#232B4A]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#F5C542] mb-3">
              <Layers className="w-4 h-4" aria-hidden="true" />
              <span>ORDERED PROCESS STEPS:</span>
            </div>
            <ol className="space-y-2 text-xs sm:text-sm text-slate-300">
              {currentConcept.steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded bg-[#1C2344] text-[#F5C542] font-mono text-xs font-bold flex items-center justify-center border border-amber-500/30">
                    {idx + 1}
                  </span>
                  <span className="leading-snug pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* From the PDF Box with Source Quote */}
        <div className="p-4 rounded-lg bg-[#0B0F20] border-l-4 border-teal-400 border-y border-r border-[#1C2545]">
          <div className="flex items-center justify-between text-xs text-teal-300 mb-1.5 font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <Quote className="w-3.5 h-3.5" aria-hidden="true" />
              <span>FROM THE PDF:</span>
            </span>
            <span className="font-mono text-teal-400">Page {currentConcept.page}</span>
          </div>
          <p className="text-xs sm:text-sm italic text-teal-100/90 leading-relaxed font-sans">
            &ldquo;{currentConcept.sourceQuote}&rdquo;
          </p>
        </div>

        {/* Game Mode Choice Selector on the last card */}
        {isLast && (
          <GameChoiceSelector
            level={level}
            selectedGame={selectedGame}
            onSelectGame={setSelectedGame}
          />
        )}

        {/* Practice Mode & Regenerate Options on the last card */}
        {isLast && (
          <div className="mt-4 pt-4 border-t border-[#1F2747] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={practiceMode}
                onChange={(e) => setPracticeMode(e.target.checked)}
                className="w-4 h-4 rounded bg-[#0A0D1B] border-[#2A345B] text-[#F5C542] focus:ring-[#F5C542]"
              />
              <span className="font-medium">Practice mode (no lives lost, no XP saved)</span>
            </label>

            <button
              type="button"
              onClick={() => {
                // Clear the caches of BOTH games for that level per Section 2 spec
                clearCachedQuestionsForLevel(level.id);
                clearCachedLieHunterForLevel(level.id);
                onStartGame(practiceMode, true, undefined, selectedGame);
              }}
              className="text-xs text-slate-400 hover:text-[#F5C542] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              <span>Regenerate questions</span>
            </button>
          </div>
        )}
      </article>

      {/* 4. Bottom Navigation Buttons */}
      <div className="w-full flex items-center justify-between gap-4">
        {!isFirst ? (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="btn-pixel-dark px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span>Previous</span>
          </button>
        ) : (
          <div /> // Spacer
        )}

        {!isLast ? (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.min(concepts.length - 1, prev + 1))}
            className="btn-pixel-dark px-6 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white flex items-center gap-2 cursor-pointer hover:border-[#F5C542]"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onStartGame(practiceMode, false, undefined, selectedGame)}
            className="btn-pixel-gold px-7 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-950" aria-hidden="true" />
            <span>
              {selectedGame === 'lieHunter'
                ? "I'm ready, start Lie Hunter!"
                : "I'm ready, start the Runner!"}
            </span>
          </button>
        )}
      </div>

      {/* 5. Skip Learning Secondary Link */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => onStartGame(practiceMode, false, undefined, selectedGame)}
          className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors cursor-pointer"
        >
          Skip learning (jump straight to the game)
        </button>
      </div>

    </div>
  );
};
