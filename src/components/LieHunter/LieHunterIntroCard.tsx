import React, { useState, useEffect, useRef } from 'react';
import { Concept } from '../../types/course.ts';
import { FileSearch, Sparkles, Heart, Search, Play, HelpCircle } from 'lucide-react';

interface LieHunterIntroCardProps {
  concepts: Concept[];
  isManualInfoOpen?: boolean;
  onStart: () => void;
  onCloseManualInfo?: () => void;
}

const STORAGE_KEY_SEEN = 'studyquest_seen_intro_lieHunter';

export const LieHunterIntroCard: React.FC<LieHunterIntroCardProps> = ({
  concepts,
  isManualInfoOpen = false,
  onStart,
  onCloseManualInfo,
}) => {
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SEEN) === 'true';
    } catch {
      return false;
    }
  });

  const [compactTimerRemaining, setCompactTimerRemaining] = useState<number | null>(null);
  const startBtnRef = useRef<HTMLButtonElement | null>(null);

  // If already seen and not manually opened via the Info button, auto-continue after 1.5s
  const showCompact = hasSeenIntro && !isManualInfoOpen;

  useEffect(() => {
    startBtnRef.current?.focus();

    if (showCompact) {
      setCompactTimerRemaining(1500);
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 1500 - elapsed);
        setCompactTimerRemaining(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          onStart();
        }
      }, 100);

      const cancelAutoTimerOnKey = (e: KeyboardEvent) => {
        // Any key cancels auto-start countdown so the user can read if they want
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          clearInterval(interval);
          onStart();
        } else {
          clearInterval(interval);
          setCompactTimerRemaining(null);
        }
      };

      window.addEventListener('keydown', cancelAutoTimerOnKey);
      return () => {
        clearInterval(interval);
        window.removeEventListener('keydown', cancelAutoTimerOnKey);
      };
    } else {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStart();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showCompact, onStart]);

  const handleStart = () => {
    try {
      localStorage.setItem(STORAGE_KEY_SEEN, 'true');
    } catch {}
    setHasSeenIntro(true);
    if (onCloseManualInfo) {
      onCloseManualInfo();
    } else {
      onStart();
    }
  };

  // Compact Auto-Continuing Version
  if (showCompact) {
    return (
      <div className="w-full max-w-xl mx-auto my-4 p-4 rounded-xl bg-[#0F1426] border-2 border-[#F5C542] shadow-2xl flex items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-[#F5C542] text-[#F5C542] flex items-center justify-center shrink-0">
            <FileSearch className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-pixel text-xs text-[#F5C542] block">LIE HUNTER READY</span>
            <p className="text-[11px] text-slate-300 truncate">
              {compactTimerRemaining !== null && compactTimerRemaining > 0
                ? `Starting in ${(compactTimerRemaining / 1000).toFixed(1)}s (press any key to pause)...`
                : 'Press Start or Enter to begin investigation'}
            </p>
          </div>
        </div>

        <button
          ref={startBtnRef}
          type="button"
          onClick={handleStart}
          className="btn-pixel-gold px-4 py-2 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 text-black" />
          <span>Start (Enter)</span>
        </button>
      </div>
    );
  }

  // Full Intro / Rules Card
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lie-hunter-intro-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-lg bg-[#0F1426] border-2 border-[#F5C542] rounded-xl p-6 sm:p-7 shadow-[0_0_40px_rgba(245,197,66,0.3)] flex flex-col gap-4 text-left">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-[#242F55]">
          <div className="w-12 h-12 rounded-xl bg-amber-950/80 border-2 border-[#F5C542] text-[#F5C542] flex items-center justify-center shadow-md shrink-0">
            <FileSearch className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="lie-hunter-intro-title" className="font-pixel text-base sm:text-lg text-[#F5C542]">
              LIE HUNTER
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Each case has 4 statements from your material. Exactly one is a lie. Find it.
            </p>
          </div>
        </div>

        {/* Rules & Mechanics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#141B33] border border-[#2B3760]">
            <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#F5C542]" />
              <span>CONTROLS</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Select a card (click, tap, or keys <strong>1 to 4</strong>), then press <strong>Accuse (Enter)</strong>. <strong>H</strong> uses the Magnifier. <strong>P</strong> pauses.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#141B33] border border-[#2B3760]">
            <div className="flex items-center gap-1.5 font-bold text-red-300 mb-1">
              <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
              <span>RULES</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              3 lives. A wrong accusation costs a life. The Magnifier removes one true statement but costs points.
            </p>
          </div>
        </div>

        {/* Concepts in Level */}
        <div className="p-3 rounded-lg bg-[#0C101F] border border-[#1E2644]">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            CONCEPTS UNDER INVESTIGATION:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {concepts.map((c) => (
              <span
                key={c.id}
                className="text-xs px-2 py-0.5 rounded bg-[#1A223E] text-amber-200 border border-[#2B3864]"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            ref={startBtnRef}
            type="button"
            onClick={handleStart}
            className="btn-pixel-gold w-full sm:w-auto px-7 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
          >
            <Play className="w-4 h-4 text-black" aria-hidden="true" />
            <span>Start Investigation (Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
