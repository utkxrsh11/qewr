import React, { useState, useEffect } from 'react';
import { GameChoice, LevelSegment } from '../types/course.ts';
import { GAME_REGISTRY } from '../services/gameRegistry.ts';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface ChallengeIntroCardProps {
  segment: LevelSegment;
  onStart: () => void;
  onQuit: () => void;
}

export const ChallengeIntroCard: React.FC<ChallengeIntroCardProps> = ({
  segment,
  onStart,
  onQuit,
}) => {
  const game = GAME_REGISTRY[segment.gameId];
  const GameIcon = game.icon;

  const storageKey = `studyquest_seen_intro_${segment.gameId}`;

  // Process Platformer always shows full intro card first because controls are new per Section 4
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean>(() => {
    try {
      if (segment.gameId === 'platformer') {
        const platformerSeen = localStorage.getItem(storageKey);
        return platformerSeen === 'true';
      }
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });

  const [showFullCard, setShowFullCard] = useState<boolean>(!hasSeenIntro);
  const [autoTimer, setAutoTimer] = useState<number>(1.5);

  // Mark as seen when full card is closed/started
  const handleStart = () => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {}
    onStart();
  };

  // Auto-continue timer for compact mode (1.5 seconds)
  useEffect(() => {
    if (showFullCard) return;

    const interval = setInterval(() => {
      setAutoTimer((prev) => {
        if (prev <= 0.1) {
          clearInterval(interval);
          handleStart();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [showFullCard]);

  // Keyboard support: Enter / Space starts immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleStart();
      } else if (e.key === 'Escape') {
        if (showFullCard && hasSeenIntro) {
          setShowFullCard(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullCard, hasSeenIntro]);

  // Compact one-line version (seen intro already)
  if (!showFullCard) {
    return (
      <div className="w-full max-w-xl mx-auto my-6 p-4 rounded-xl bg-[#0F1426] border-2 border-[#242F55] shadow-2xl flex items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-teal-950/80 border border-[#2DD4BF] text-[#2DD4BF] flex items-center justify-center shrink-0">
            <GameIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="font-pixel text-[11px] text-[#F5C542] block truncate">
              {game.name} {segment.totalSegments > 1 ? `(Segment ${segment.index + 1} of ${segment.totalSegments})` : ''}
            </span>
            <span className="text-[11px] text-slate-300 truncate block">
              Starting in {autoTimer.toFixed(1)}s...
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFullCard(true)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded cursor-pointer underline"
          >
            Controls
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="btn-pixel-gold px-3.5 py-1.5 rounded-lg text-xs font-pixel cursor-pointer"
          >
            Start Now
          </button>
        </div>
      </div>
    );
  }

  // Full detailed intro card
  return (
    <div className="w-full max-w-xl mx-auto my-6 p-6 sm:p-8 rounded-2xl bg-[#0F1426] border-2 border-[#242F55] shadow-2xl animate-fade-in text-center font-sans">
      {/* Icon */}
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-b from-[#182348] to-[#0A0D1B] border-2 border-[#2DD4BF] text-[#2DD4BF] flex items-center justify-center shadow-[0_0_20px_rgba(45,212,191,0.25)]">
        <GameIcon className="w-8 h-8" />
      </div>

      {/* Segment label */}
      {segment.totalSegments > 1 && (
        <span className="text-[11px] font-mono font-bold text-teal-400 uppercase tracking-widest block mb-1">
          Segment {segment.index + 1} of {segment.totalSegments}
        </span>
      )}

      {/* Title */}
      <h2 className="font-pixel text-base sm:text-lg text-[#F5C542] mb-2 tracking-wide">
        {segment.totalSegments > 1 ? `Next challenge: ${game.name}` : game.name}
      </h2>

      {/* Intro line */}
      <p className="text-xs sm:text-sm text-slate-200 mb-4 max-w-md mx-auto leading-relaxed">
        {game.introLine}
      </p>

      {/* Concepts covered */}
      <div className="p-3 rounded-xl bg-[#090D1C] border border-[#1C2647] text-left mb-4">
        <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5">
          Concepts covered in this challenge:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {segment.concepts.map((c) => (
            <span
              key={c.id}
              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#131A33] border border-[#25325C] text-teal-300"
            >
              {c.name}
            </span>
          ))}
        </div>
      </div>

      {/* Controls help */}
      <div className="p-3.5 rounded-xl bg-[#121930] border border-[#2B3968] text-xs text-slate-300 text-left mb-6">
        <span className="font-bold text-[#F5C542] block mb-1 font-mono uppercase text-[10px]">
          Controls:
        </span>
        <p className="text-[11px] leading-relaxed text-slate-200">{game.controlsHelp}</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleStart}
          className="w-full btn-pixel-gold py-3.5 rounded-xl text-xs sm:text-sm font-pixel flex items-center justify-center gap-2 cursor-pointer shadow-lg"
        >
          <span>Start Challenge (Space / Enter)</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onQuit}
          className="text-xs text-slate-400 hover:text-red-400 transition-colors py-1 cursor-pointer"
        >
          Quit Level
        </button>
      </div>
    </div>
  );
};
