import React from 'react';
import { Level, GameChoice } from '../types/course.ts';
import { GAME_REGISTRY, selectGame, SelectGameOptions } from '../services/gameRegistry.ts';
import { Sparkles, Info } from 'lucide-react';

interface GamesInLevelChipsProps {
  level: Level;
  options?: SelectGameOptions;
}

export const GamesInLevelChips: React.FC<GamesInLevelChipsProps> = ({ level, options }) => {
  const concepts = level.concepts || [];

  // Count concepts per game
  const counts: Record<GameChoice, number> = {
    runner: 0,
    lieHunter: 0,
    platformer: 0,
  };

  concepts.forEach((c) => {
    const game = selectGame(c, options);
    counts[game] = (counts[game] || 0) + 1;
  });

  const activeGames = (Object.keys(counts) as GameChoice[]).filter((g) => counts[g] > 0);
  const hasProcessConcept = concepts.some((c) => c.type === 'process');

  return (
    <div className="w-full my-5 p-4 rounded-xl bg-[#0D1224] border border-[#232D52] shadow-inner text-left font-sans">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-pixel text-[11px] text-[#F5C542] tracking-wide uppercase">
          Games In This Level
        </h3>
        <span className="text-[11px] font-mono text-slate-400">
          Automatic Challenge Selection
        </span>
      </div>

      {/* Game Chips */}
      <div className="flex flex-wrap items-center gap-2.5 mb-3">
        {activeGames.map((gameId) => {
          const game = GAME_REGISTRY[gameId];
          const GameIcon = game.icon;
          const count = counts[gameId];

          return (
            <div
              key={gameId}
              className="px-3.5 py-2 rounded-lg bg-[#141C38] border border-[#2B3B70] flex items-center gap-2 text-slate-200"
            >
              <div className="w-6 h-6 rounded bg-teal-950/80 border border-teal-500/40 text-[#2DD4BF] flex items-center justify-center shrink-0">
                <GameIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-white">{game.name}</span>
              <span className="text-xs font-mono font-bold text-[#F5C542] px-1.5 py-0.5 rounded bg-black/40 border border-[#F5C542]/30">
                {count} {count === 1 ? 'concept' : 'concepts'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tip for Process Platformer if level contains a process concept */}
      {hasProcessConcept && (
        <div className="p-2.5 rounded-lg bg-[#101933] border border-[#233566] flex items-start gap-2 text-xs text-teal-200">
          <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Tip:</strong> In Process Platformer you put steps in order. Stand on a platform to choose it.
          </p>
        </div>
      )}
    </div>
  );
};
