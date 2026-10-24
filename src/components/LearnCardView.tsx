import React, { useState, useEffect } from 'react';
import { Level, Concept, GameChoice } from '../types/course.ts';
import { GamesInLevelChips } from './GamesInLevelChips.tsx';
import { clearAllLevelCaches } from '../services/levelSession.ts';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Quote,
  Layers,
  RefreshCw,
  Sliders,
} from 'lucide-react';

interface LearnCardViewProps {
  level: Level;
  totalLevelsInChapter: number;
  onBackToCourse: () => void;
  onStartGame: (
    practiceMode: boolean,
    forceRegenerate?: boolean,
    targetLevel?: Level,
    forceGame?: GameChoice | 'auto'
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
  const [forceGame, setForceGame] = useState<GameChoice | 'auto'>('auto');

  // Check if ?debug=1 is in the URL
  const isDebugMode = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug') === '1';

  // Clean up any leftover temporary key from Phase 4
  useEffect(() => {
    try {
      localStorage.removeItem(`studyquest_game_choice_${level.id}`);
    } catch {}
  }, [level.id]);

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
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-slate-400">No concepts found for this level.</p>
        <button
          type="button"
          onClick={onBackToCourse}
          className="mt-4 btn-pixel-dark px-4 py-2 rounded-lg text-xs"
        >
          Back to Course
        </button>
      </div>
    );
  }

  const conceptTypeLabel =
    currentConcept.type === 'process'
      ? 'Process / Sequence'
      : currentConcept.type === 'detail'
      ? 'Critical Detail'
      : 'Core Fact';

  const conceptTypeColor =
    currentConcept.type === 'process'
      ? 'bg-purple-950/80 border-purple-500/60 text-purple-300'
      : currentConcept.type === 'detail'
      ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
      : 'bg-teal-950/80 border-teal-500/60 text-teal-300';

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 flex flex-col items-center">
      {/* 1. Header with Breadcrumb and Level Info */}
      <header className="w-full flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBackToCourse}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Course</span>
        </button>

        <span className="font-pixel text-[11px] text-[#F5C542]">
          Level {level.levelNumber} / {totalLevelsInChapter}
        </span>
      </header>

      {/* 2. Step Progress Indicator */}
      <div className="w-full mb-6">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Card {currentIndex + 1} of {concepts.length}</span>
          <span className="font-mono text-slate-500">{level.chapterTitle}</span>
        </div>

        <div className="w-full h-2 bg-[#1A1F36] rounded-full overflow-hidden flex gap-1 p-0.5 border border-[#2B3356]">
          {concepts.map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 h-full rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'bg-[#F5C542]'
                  : idx < currentIndex
                  ? 'bg-[#2DD4BF]'
                  : 'bg-[#101426]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 3. Main Learn Card */}
      <article className="w-full dungeon-card p-6 sm:p-8 mb-6 shadow-2xl relative animate-fade-in border-2 border-[#262D4A]">
        {/* Concept Type Badge & Page Reference */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md border ${conceptTypeColor}`}>
            {conceptTypeLabel}
          </span>
          <span className="text-xs font-mono text-slate-400">
            Page {currentConcept.page}
          </span>
        </div>

        {/* Concept Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 tracking-tight">
          {currentConcept.name}
        </h2>

        {/* Summary */}
        <p className="text-sm sm:text-base text-slate-200 leading-relaxed mb-5">
          {currentConcept.summary}
        </p>

        {/* Ordered Process Steps if type is process */}
        {currentConcept.type === 'process' && currentConcept.steps && currentConcept.steps.length > 0 && (
          <div className="mb-5 p-4 rounded-lg bg-[#0E1224] border border-[#232D52]">
            <div className="flex items-center gap-2 text-xs font-mono text-purple-300 font-semibold mb-2.5">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>KEY PROCESS STAGES:</span>
            </div>
            <ol className="space-y-2 text-xs sm:text-sm text-slate-300 list-decimal list-inside">
              {currentConcept.steps.map((step, sIdx) => (
                <li key={sIdx} className="leading-relaxed">
                  <span className="text-slate-200">{step}</span>
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

        {/* Automatic Games in this level chips on the last card */}
        {isLast && (
          <GamesInLevelChips
            level={level}
            options={forceGame !== 'auto' ? { forceGame } : undefined}
          />
        )}

        {/* Hidden Developer Option (?debug=1 only) */}
        {isLast && isDebugMode && (
          <div className="mt-3 p-3 rounded-lg bg-[#1a1c29] border border-amber-600/50 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-mono">
              <Sliders className="w-4 h-4" />
              <span>Force game for this level:</span>
            </div>
            <select
              value={forceGame}
              onChange={(e) => setForceGame(e.target.value as GameChoice | 'auto')}
              className="bg-[#0B0D19] border border-[#2A345B] text-slate-200 rounded px-2 py-1 text-xs font-mono"
            >
              <option value="auto">Auto (Selection Rules)</option>
              <option value="runner">Concept Runner</option>
              <option value="lieHunter">Lie Hunter</option>
              <option value="platformer">Process Platformer</option>
            </select>
          </div>
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
                clearAllLevelCaches(level.id);
                onStartGame(practiceMode, true, undefined, forceGame !== 'auto' ? forceGame : undefined);
              }}
              className="text-xs text-slate-400 hover:text-[#F5C542] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              <span>Regenerate challenges</span>
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
          <div />
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
            onClick={() => onStartGame(practiceMode, false, undefined, forceGame !== 'auto' ? forceGame : undefined)}
            className="btn-pixel-gold px-7 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-950" aria-hidden="true" />
            <span>Start Challenge</span>
          </button>
        )}
      </div>
    </div>
  );
};
