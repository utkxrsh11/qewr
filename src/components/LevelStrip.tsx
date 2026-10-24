import React from 'react';
import { Level, StudyQuestProgress, GameChoice } from '../types/course.ts';
import { selectGame, GAME_REGISTRY } from '../services/gameRegistry.ts';
import { Star, Swords } from 'lucide-react';

interface LevelStripProps {
  levels: Level[];
  progress: StudyQuestProgress;
  onSelectLevel: (level: Level) => void;
}

export const LevelStrip: React.FC<LevelStripProps> = ({
  levels,
  progress,
  onSelectLevel,
}) => {
  if (levels.length === 0) return null;

  return (
    <div className="mb-5 p-3 sm:p-4 rounded-lg bg-[#0A0D1B] border border-[#232B4A]">
      <div className="flex items-center gap-2 mb-2.5">
        <Swords className="w-4 h-4 text-[#F5C542]" aria-hidden="true" />
        <span className="text-xs font-pixel text-[#F5C542] tracking-wider uppercase">
          Chapter Challenges
        </span>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-1 pt-0.5">
        {levels.map((level) => {
          const levelProgress = progress.levels[level.id];
          const bestStars = levelProgress?.bestStars ?? -1;
          const isPlayed = bestStars >= 0;

          // Unique games contained in this level
          const gameIds = Array.from(
            new Set((level.concepts || []).map((c) => selectGame(c)))
          ) as GameChoice[];

          return (
            <button
              key={level.id}
              type="button"
              onClick={() => onSelectLevel(level)}
              className="btn-pixel-dark px-3.5 py-2.5 rounded-lg flex flex-col items-start gap-1 flex-shrink-0 min-w-[130px] hover:border-[#F5C542] group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542]"
              aria-label={`Start Level ${level.levelNumber}, ${level.concepts.length} concepts, ${
                isPlayed ? `${bestStars} stars` : 'Not played'
              }`}
            >
              <div className="flex items-center justify-between w-full gap-2">
                <span className="font-pixel text-[11px] text-white group-hover:text-[#F5C542] transition-colors">
                  Level {level.levelNumber}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {level.concepts.length}c
                </span>
              </div>

              {/* Tiny Game Icons for games in this level */}
              <div className="flex items-center gap-1 my-0.5">
                {gameIds.map((gId) => {
                  const Icon = GAME_REGISTRY[gId].icon;
                  return (
                    <span
                      key={gId}
                      className="w-4 h-4 rounded bg-[#101426] border border-[#252E4E] flex items-center justify-center text-teal-400"
                      title={GAME_REGISTRY[gId].name}
                    >
                      <Icon className="w-2.5 h-2.5" />
                    </span>
                  );
                })}
              </div>

              {/* Star Rating Display */}
              <div className="flex items-center gap-1 mt-0.5">
                {isPlayed ? (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3].map((starIdx) => (
                      <Star
                        key={starIdx}
                        className={`w-3 h-3 ${
                          starIdx <= bestStars
                            ? 'text-[#F5C542] fill-[#F5C542]'
                            : 'text-slate-600'
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                    <span className="text-[10px] text-slate-300 font-mono ml-1">
                      {bestStars}/3
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono italic">
                    Not played
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
