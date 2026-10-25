import React, { useState } from 'react';
import { StudyQuestStats, GameChoice, ConceptType } from '../../types/course.ts';
import { GAME_REGISTRY } from '../../services/gameRegistry.ts';
import { generatePerformanceInsight } from '../../services/statsService.ts';
import { Gamepad2, Layers, Lightbulb, Table, BarChart2 } from 'lucide-react';

interface PerformanceChartsProps {
  stats: StudyQuestStats;
}

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ stats }) => {
  const [showTable, setShowTable] = useState(false);

  const games: Array<{ id: GameChoice; name: string }> = [
    { id: 'runner', name: 'Concept Runner' },
    { id: 'lieHunter', name: 'Lie Hunter' },
    { id: 'platformer', name: 'Process Platformer' },
  ];

  const types: Array<{ id: ConceptType; label: string }> = [
    { id: 'fact', label: 'Facts' },
    { id: 'detail', label: 'Details' },
    { id: 'process', label: 'Processes' },
  ];

  const insightLine = generatePerformanceInsight(stats);

  return (
    <div className="mb-6 rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-4 sm:p-6 shadow-lg text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-pixel text-xs sm:text-sm text-white">Performance Breakdown</h2>
          <p className="text-xs text-slate-400 mt-1">Accuracy by game format and concept type.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#2B355E] bg-[#141A33] hover:bg-[#1C2548] text-slate-300 font-mono text-xs transition-colors cursor-pointer self-start sm:self-center"
          aria-pressed={showTable}
        >
          {showTable ? <BarChart2 className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
          <span>{showTable ? 'Show charts' : 'Show as table'}</span>
        </button>
      </div>

      {showTable ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Game Stats Table */}
          <div className="overflow-x-auto p-3 rounded-xl bg-[#0F1426] border border-[#232D52]">
            <h3 className="font-pixel text-[11px] text-[#F5C542] uppercase mb-2">Game Accuracy</h3>
            <table className="w-full text-xs font-mono border-collapse" aria-label="Game accuracy table">
              <thead>
                <tr className="border-b border-[#232D52] text-slate-400">
                  <th className="py-1.5 px-2 text-left">Game</th>
                  <th className="py-1.5 px-2 text-center">Answered</th>
                  <th className="py-1.5 px-2 text-center">Correct</th>
                  <th className="py-1.5 px-2 text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D2545]">
                {games.map((g) => {
                  const data = stats.games[g.id] || { answered: 0, correct: 0 };
                  const acc = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0;
                  return (
                    <tr key={g.id}>
                      <td className="py-2 px-2 text-white font-semibold">{g.name}</td>
                      <td className="py-2 px-2 text-center text-slate-300">{data.answered}</td>
                      <td className="py-2 px-2 text-center text-emerald-400">{data.correct}</td>
                      <td className="py-2 px-2 text-right font-bold text-[#F5C542]">
                        {data.answered >= 5 ? `${acc}%` : 'Not enough data'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Type Stats Table */}
          <div className="overflow-x-auto p-3 rounded-xl bg-[#0F1426] border border-[#232D52]">
            <h3 className="font-pixel text-[11px] text-[#2DD4BF] uppercase mb-2">Concept Type Accuracy</h3>
            <table className="w-full text-xs font-mono border-collapse" aria-label="Concept type accuracy table">
              <thead>
                <tr className="border-b border-[#232D52] text-slate-400">
                  <th className="py-1.5 px-2 text-left">Type</th>
                  <th className="py-1.5 px-2 text-center">Answered</th>
                  <th className="py-1.5 px-2 text-center">Correct</th>
                  <th className="py-1.5 px-2 text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D2545]">
                {types.map((t) => {
                  const data = stats.types[t.id] || { answered: 0, correct: 0 };
                  const acc = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0;
                  return (
                    <tr key={t.id}>
                      <td className="py-2 px-2 text-white font-semibold">{t.label}</td>
                      <td className="py-2 px-2 text-center text-slate-300">{data.answered}</td>
                      <td className="py-2 px-2 text-center text-emerald-400">{data.correct}</td>
                      <td className="py-2 px-2 text-right font-bold text-[#2DD4BF]">
                        {data.answered >= 5 ? `${acc}%` : 'Not enough data'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chart 1: Game Formats */}
          <div
            className="p-4 rounded-xl bg-[#0F1426] border border-[#232D52] space-y-3"
            role="region"
            aria-label="Accuracy by game format bar chart"
          >
            <div className="flex items-center gap-2 mb-1">
              <Gamepad2 className="w-4 h-4 text-[#F5C542]" />
              <h3 className="font-pixel text-[11px] text-[#F5C542] uppercase">By Game Format</h3>
            </div>

            {games.map((g) => {
              const data = stats.games[g.id] || { answered: 0, correct: 0 };
              const hasEnough = data.answered >= 5;
              const acc = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0;
              const entry = GAME_REGISTRY[g.id];
              const GameIcon = entry.icon;

              return (
                <div key={g.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-slate-200">
                      <GameIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{g.name}</span>
                    </div>
                    {hasEnough ? (
                      <span className="text-slate-300">
                        {data.correct}/{data.answered} ({acc}%)
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">
                        Not enough data yet ({data.answered}/5)
                      </span>
                    )}
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    {hasEnough ? (
                      <div
                        style={{ width: `${acc}%` }}
                        className={`h-full ${
                          acc >= 80 ? 'bg-emerald-400' : acc >= 50 ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                      />
                    ) : (
                      <div className="h-full bg-slate-700/50" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart 2: Concept Types */}
          <div
            className="p-4 rounded-xl bg-[#0F1426] border border-[#232D52] space-y-3"
            role="region"
            aria-label="Accuracy by concept type bar chart"
          >
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-[#2DD4BF]" />
              <h3 className="font-pixel text-[11px] text-[#2DD4BF] uppercase">By Concept Type</h3>
            </div>

            {types.map((t) => {
              const data = stats.types[t.id] || { answered: 0, correct: 0 };
              const hasEnough = data.answered >= 5;
              const acc = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0;

              return (
                <div key={t.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-200">{t.label}</span>
                    {hasEnough ? (
                      <span className="text-slate-300">
                        {data.correct}/{data.answered} ({acc}%)
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">
                        Not enough data yet ({data.answered}/5)
                      </span>
                    )}
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    {hasEnough ? (
                      <div
                        style={{ width: `${acc}%` }}
                        className={`h-full ${
                          acc >= 80 ? 'bg-emerald-400' : acc >= 50 ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                      />
                    ) : (
                      <div className="h-full bg-slate-700/50" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Insight line if eligible */}
      {insightLine && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-xs font-mono text-amber-200">
          <Lightbulb className="w-4 h-4 text-[#F5C542] shrink-0 mt-0.5" />
          <span>{insightLine}</span>
        </div>
      )}
    </div>
  );
};
