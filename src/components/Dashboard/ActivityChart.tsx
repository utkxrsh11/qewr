import React from 'react';
import { getLast14DaysActivity } from '../../services/statsService.ts';
import { Activity, Flame, Calendar } from 'lucide-react';

export const ActivityChart: React.FC = () => {
  const activityDays = getLast14DaysActivity();

  const maxItems = Math.max(10, ...activityDays.map((d) => d.itemsAnswered));
  const totalItems14 = activityDays.reduce((acc, d) => acc + d.itemsAnswered, 0);
  const totalXp14 = activityDays.reduce((acc, d) => acc + d.xpEarned, 0);

  // Compute active days streak (working backwards from today)
  let currentStreak = 0;
  for (let i = activityDays.length - 1; i >= 0; i--) {
    if (activityDays[i].itemsAnswered > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  const chartHeight = 120;
  const chartWidth = 560;
  const barWidth = 24;
  const gap = (chartWidth - barWidth * activityDays.length) / (activityDays.length + 1);

  return (
    <div className="mb-6 rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-5 sm:p-6 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h2 className="font-pixel text-xs sm:text-sm text-white">
            14-Day Study Activity
          </h2>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
          <span className="flex items-center gap-1.5 text-amber-400">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="font-bold">{currentStreak} day streak</span>
          </span>
          <span className="text-slate-400">
            {totalItems14} challenges · +{totalXp14} XP
          </span>
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[560px]">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`} className="w-full h-40">
            {/* Grid horizontal guidelines */}
            <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#1F2847" strokeDasharray="4 4" />
            <line x1="0" y1="65" x2={chartWidth} y2="65" stroke="#1F2847" strokeDasharray="4 4" />
            <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#2D3863" />

            {/* Bars */}
            {activityDays.map((d, idx) => {
              const x = gap + idx * (barWidth + gap);
              const heightRatio = d.itemsAnswered / maxItems;
              const barH = Math.max(4, heightRatio * (chartHeight - 30));
              const y = chartHeight - barH;
              const isToday = idx === activityDays.length - 1;

              return (
                <g key={d.date} className="cursor-pointer group">
                  <title>
                    {d.dayLabel}: {d.itemsAnswered} challenges, {d.correctCount} correct, +{d.xpEarned} XP
                  </title>
                  {/* Background slot */}
                  <rect
                    x={x}
                    y={20}
                    width={barWidth}
                    height={chartHeight - 20}
                    fill="#151A31"
                    rx={4}
                  />

                  {/* Active bar */}
                  {d.itemsAnswered > 0 && (
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barH}
                      fill={isToday ? '#F5C542' : '#10B981'}
                      className="group-hover:brightness-125 transition-all"
                      rx={4}
                    />
                  )}

                  {/* Value label on top of bar if active */}
                  {d.itemsAnswered > 0 && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 4}
                      textAnchor="middle"
                      fill="#CBD5E1"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {d.itemsAnswered}
                    </text>
                  )}

                  {/* Date label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 18}
                    textAnchor="middle"
                    fill={isToday ? '#F5C542' : '#64748B'}
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {d.dayLabel.split(' ')[1]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
