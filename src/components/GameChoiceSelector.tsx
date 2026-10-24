import React, { useEffect } from 'react';
import { GameChoice, Level } from '../types/course.ts';
import { Gamepad2, FileSearch, CheckCircle2 } from 'lucide-react';

interface GameChoiceSelectorProps {
  level: Level;
  selectedGame: GameChoice;
  onSelectGame: (game: GameChoice) => void;
}

export const getInitialGameChoice = (level: Level): GameChoice => {
  try {
    const saved = localStorage.getItem(`studyquest_game_choice_${level.id}`);
    if (saved === 'runner' || saved === 'lieHunter') {
      return saved as GameChoice;
    }
  } catch {}

  // Default: Lie Hunter if level contains at least one concept of type "detail", otherwise Concept Runner
  const hasDetailConcept = (level.concepts || []).some((c) => c.type === 'detail');
  return hasDetailConcept ? 'lieHunter' : 'runner';
};

export const saveGameChoice = (levelId: string, choice: GameChoice): void => {
  try {
    localStorage.setItem(`studyquest_game_choice_${levelId}`, choice);
  } catch {}
};

export const GameChoiceSelector: React.FC<GameChoiceSelectorProps> = ({
  level,
  selectedGame,
  onSelectGame,
}) => {
  useEffect(() => {
    saveGameChoice(level.id, selectedGame);
  }, [level.id, selectedGame]);

  return (
    <div className="w-full my-5 p-4 rounded-xl bg-[#0D1224] border border-[#232D52] shadow-inner">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-pixel text-xs text-[#F5C542] tracking-wide">
          CHOOSE YOUR CHALLENGE
        </h3>
        <span className="text-[11px] font-mono text-slate-400">
          Select game mode for this level
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Game Mode Selection">
        {/* Option 1: Concept Runner */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedGame === 'runner'}
          onClick={() => onSelectGame('runner')}
          className={`p-3.5 rounded-lg border-2 text-left transition-all cursor-pointer relative flex items-start gap-3 ${
            selectedGame === 'runner'
              ? 'bg-[#182348] border-[#2DD4BF] shadow-[0_0_15px_rgba(45,212,191,0.2)]'
              : 'bg-[#10162B] border-[#222B4A] hover:border-slate-500 hover:bg-[#141B34]'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
              selectedGame === 'runner'
                ? 'bg-teal-950/80 border-[#2DD4BF] text-[#2DD4BF]'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <Gamepad2 className="w-5 h-5" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Concept Runner</span>
              {selectedGame === 'runner' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-900/60 text-[#2DD4BF] border border-teal-500/30">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-snug">
              Run and pick the right answer lane.
            </p>
          </div>

          <div className="shrink-0 mt-0.5">
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedGame === 'runner'
                  ? 'border-[#2DD4BF] bg-[#2DD4BF]'
                  : 'border-slate-600 bg-transparent'
              }`}
            >
              {selectedGame === 'runner' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
            </div>
          </div>
        </button>

        {/* Option 2: Lie Hunter */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedGame === 'lieHunter'}
          onClick={() => onSelectGame('lieHunter')}
          className={`p-3.5 rounded-lg border-2 text-left transition-all cursor-pointer relative flex items-start gap-3 ${
            selectedGame === 'lieHunter'
              ? 'bg-[#291F38] border-[#F5C542] shadow-[0_0_15px_rgba(245,197,66,0.2)]'
              : 'bg-[#10162B] border-[#222B4A] hover:border-slate-500 hover:bg-[#141B34]'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
              selectedGame === 'lieHunter'
                ? 'bg-amber-950/80 border-[#F5C542] text-[#F5C542]'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <FileSearch className="w-5 h-5" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Lie Hunter</span>
              {selectedGame === 'lieHunter' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-900/60 text-[#F5C542] border border-amber-500/30">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-snug">
              Spot the false statement on the evidence board.
            </p>
          </div>

          <div className="shrink-0 mt-0.5">
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedGame === 'lieHunter'
                  ? 'border-[#F5C542] bg-[#F5C542]'
                  : 'border-slate-600 bg-transparent'
              }`}
            >
              {selectedGame === 'lieHunter' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
