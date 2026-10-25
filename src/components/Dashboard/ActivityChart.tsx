import React, { useState } from 'react';
import { getLast14DaysActivity } from '../../services/statsService.ts';
import { Activity, Flame, Table, BarChart2 } from 'lucide-react';

export const ActivityChart: React.FC = () => {
  const [showTable, setShowTable] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activityDays = getLast14DaysActivity();
  const maxItems = Math.max(8, ...activityDays.map((d) => d.itemsAnswered));
  const totalItems14 = activityDays.reduce((acc, d) => acc + d.itemsAnswered, 0);
  const totalCorrect14 = activityDays.reduce((acc, d) => acc + d.correctCount, 0);

  const chartHeight = 110;
  const chartWidth = 560;
  const barWidth = 22;
  const gap = (chartWidth - barWidth * activityDays.length) / (activityDays.length + 1);

  return (
    <div className="mb-6 rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-4 sm:p-6 shadow-lg text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="font-pixel text-xs sm:text-sm text-white">Recent Activity</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Last 14 days of practice ({totalCorrect14} correct of {totalItems14} total answered).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Table toggle */}
          <button
            type="button"
            onClick={() => setShowTable((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#2B355E] bg-[#141A33] hover:bg-[#1C2548] text-slate-300 font-mono text-xs transition-colors cursor-pointer self-start sm:self-center"
            aria-pressed={showTable}
          >
            {showTable ? <BarChart2 className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
            <span>{showTable ? 'Show chart' : 'Show as table'}</span>
          </button>
        </div>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table
            className="w-full text-xs font-mono text-left border-collapse"
            aria-label="14-day study activity history table"
          >
            <thead>
              <tr className="border-b border-[#232D52] text-slate-400">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3 text-center">Items Answered</th>
                <th className="py-2 px-3 text-center text-emerald-400">Correct</th>
                <th className="py-2 px-3 text-center text-[#F5C542]">XP Earned</th>
                <th className="py-2 px-3 text-right">Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D2545]">
              {activityDays.map((d) => (
                <tr key={d.date} className="hover:bg-[#171E3A] transition-colors">
                  <td className="py-2 px-3 font-semibold text-white">{d.displayDate}</td>
                  <td className="py-2 px-3 text-center text-slate-300">{d.itemsAnswered}</td>
                  <td className="py-2 px-3 text-center text-emerald-400 font-bold">
                    {d.correctCount}
                  </td>
                  <td className="py-2 px-3 text-center text-[#F5C542]">+{d.xpEarned}</td>
                  <td className="py-2 px-3 text-right text-slate-400">{d.sessionsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="w-full overflow-x-auto"
          role="region"
          aria-label="14-day study activity bar chart with correct items highlighted"
        >
          <div className="min-w-[560px]">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`}
              className="w-full h-36 select-none"
            >
              {/* Guidelines */}
              <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#1F2847" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2={chartWidth} y2="60" stroke="#1F2847" strokeDasharray="3 3" />
              <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#2D3863" />

              {activityDays.map((d, idx) => {
                const x = gap + idx * (barWidth + gap);
                const totalH = (d.itemsAnswered / maxItems) * (chartHeight - 20);
                const correctH = d.itemsAnswered > 0 ? (d.correctCount / d.itemsAnswered) * totalH : 0;
                const isToday = idx === activityDays.length - 1;
                const isHovered = hoveredIdx === idx;

                return (
                  <g
                    key={d.date}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Background bar (total answered) */}
                    <rect
                      x={x}
                      y={chartHeight - totalH}
                      width={barWidth}
                      height={totalH}
                      rx={3}
                      fill={isHovered ? '#38467D' : isToday ? '#2E3A68' : '#232D52'}
                    />

                    {/* Filled bar (correct answers) */}
                    {correctH > 0 && (
                      <rect
                        x={x}
                        y={chartHeight - correctH}
                        width={barWidth}
                        height={correctH}
                        rx={3}
                        fill={isHovered ? '#34D399' : '#10B981'}
                      />
                    )}

                    {/* Date label */}
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight + 18}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      fill={isToday ? '#F5C542' : '#94A3B8'}
                      fontWeight={isToday ? 'bold' : 'normal'}
                    >
                      {isToday ? 'Today' : d.displayDate.split(' ')[1] || d.displayDate}
                    </text>

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <g>
                        <rect
                          x={Math.min(chartWidth - 110, Math.max(10, x - 40))}
                          y={Math.max(5, chartHeight - totalH - 32)}
                          width="90"
                          height="26"
                          rx="4"
                          fill="#0F1426"
                          stroke="#F5C542"
                          strokeWidth="1"
                        />
                        <text
                          x={Math.min(chartWidth - 65, Math.max(55, x + 5))}
                          y={Math.max(5, chartHeight - totalH - 32) + 16}
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="middle"
                          fill="#FFFFFF"
                        >
                          {d.correctCount}/{d.itemsAnswered} ({d.xpEarned} XP)
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
