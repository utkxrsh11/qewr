import React from 'react';
import { StudyQuestStats, GameChoice, ConceptType } from '../../types/course.ts';
import { GAME_REGISTRY } from '../../services/gameRegistry.ts';
import { BarChart3, Gamepad2, Layers } from 'lucide-react';

interface PerformanceChartsProps {
  stats: StudyQuestStats;
}

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ stats }) => {
  const games: Array<{ id: GameChoice; name: string }> = [
    { id: 'runner', name: 'Concept Runner' },
    { id: 'lieHunter', name: 'Lie Hunter' },
    { id: 'platformer', name: 'Process Platformer' },
  ];

  const types: Array<{ id: ConceptType; label: string }> = [
    { id: 'fact', label: 'Facts' },
    { id: 'process', label: 'Processes' },
    { id: 'detail', label: 'Details' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* 1. Performance by Game Format */}
      <div className="rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Gamepad2 className="w-4 h-4 text-[#F5C542]" />
          <h2 className="font-pixel text-xs sm:text-sm text-white">
            Accuracy by Game Format
          </h2>
        </div>

        <div className="space-y-4">
          {games.map((g) => {
            const data = stats.byGame[g.id] || { played: 0, correct: 0, totalItems: 0 };
            const accuracy = data.totalItems > 0 ? Math.round((data.correct / data.totalItems) * 100) : 0;
            const entry = GAME_REGISTRY[g.id];
            const GameIcon = entry.icon;

            return (
              <div key={g.id} className="p-3 rounded-xl bg-[#161B33] border border-[#232C52]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-white">
                    <GameIcon className="w-4 h-4 text-[#F5C542]" />
                    <span className="font-bold">{g.name}</span>
                  </div>
                  <div className="text-xs font-mono">
                    <span className="text-slate-400 mr-2">{data.correct}/{data.totalItems}</span>
                    <span className="font-bold text-[#F5C542]">{accuracy}%</span>
                  </div>
                </div>

                {/* Accuracy meter */}
                <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${accuracy}%` }}
                    className={`h-full transition-all duration-500 ${
                      accuracy >= 80 ? 'bg-emerald-400' : accuracy >= 50 ? 'bg-amber-400' : accuracy > 0 ? 'bg-red-400' : 'bg-transparent'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Performance by Concept Type */}
      <div className="rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="font-pixel text-xs sm:text-sm text-white">
            Accuracy by Concept Type
          </h2>
        </div>

        <div className="space-y-4">
          {types.map((t) => {
            const data = stats.byType[t.id] || { played: 0, correct: 0, totalItems: 0 };
            const accuracy = data.totalItems > 0 ? Math.round((data.correct / data.totalItems) * 100) : 0;

            return (
              <div key={t.id} className="p-3 rounded-xl bg-[#161B33] border border-[#232C52]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-white">
                    <span className="capitalize font-bold">{t.label}</span>
                  </div>
                  <div className="text-xs font-mono">
                    <span className="text-slate-400 mr-2">{data.correct}/{data.totalItems}</span>
                    <span className="font-bold text-cyan-300">{accuracy}%</span>
                  </div>
                </div>

                {/* Accuracy meter */}
                <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${accuracy}%` }}
                    className={`h-full transition-all duration-500 ${
                      accuracy >= 80 ? 'bg-emerald-400' : accuracy >= 50 ? 'bg-amber-400' : accuracy > 0 ? 'bg-red-400' : 'bg-transparent'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
