import React, { useState } from 'react';
import { ReadinessBand, ReadinessCounts } from '../../types/course.ts';
import {
  Trophy,
  Crown,
  Info,
  Flame,
  Layers,
  CheckCircle2,
  X,
  Target,
} from 'lucide-react';

interface SummaryCardsProps {
  readinessScore: number;
  readinessBand: ReadinessBand;
  coverageRatio: number; // 0..1
  counts: ReadinessCounts;
  totalXp: number;
  dayStreak: number;
}

const RANKS = [
  { name: 'Rookie', minXp: 0, maxXp: 150 },
  { name: 'Adventurer', minXp: 150, maxXp: 400 },
  { name: 'Knight', minXp: 400, maxXp: 800 },
  { name: 'Champion', minXp: 800, maxXp: 1500 },
  { name: 'Legend', minXp: 1500, maxXp: Infinity },
];

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  readinessScore,
  readinessBand,
  coverageRatio,
  counts,
  totalXp,
  dayStreak,
}) => {
  const [showInfoPopover, setShowInfoPopover] = useState(false);

  // Compute rank and progress to next rank
  const currentRankIndex = RANKS.findIndex(
    (r, idx) =>
      totalXp >= r.minXp && (idx === RANKS.length - 1 || totalXp < RANKS[idx + 1].minXp)
  );
  const currentRank = RANKS[currentRankIndex >= 0 ? currentRankIndex : 0];
  const nextRank =
    currentRankIndex < RANKS.length - 1 ? RANKS[currentRankIndex + 1] : null;

  let rankProgress = 100;
  let xpToNext = 0;
  if (nextRank) {
    const range = nextRank.minXp - currentRank.minXp;
    const progressInRank = totalXp - currentRank.minXp;
    rankProgress = Math.min(100, Math.max(0, Math.round((progressInRank / range) * 100)));
    xpToNext = nextRank.minXp - totalXp;
  }

  const coveragePercent = Math.round(coverageRatio * 100);
  const playedConcepts = counts.total - counts.untouched;

  let bandColorClass = 'text-amber-400 border-amber-500/40 bg-amber-500/10';
  let ringColor = '#F59E0B';
  if (readinessBand.color === 'emerald') {
    bandColorClass = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    ringColor = '#10B981';
  } else if (readinessBand.color === 'blue') {
    bandColorClass = 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
    ringColor = '#06B6D4';
  } else if (readinessBand.color === 'red') {
    bandColorClass = 'text-red-400 border-red-500/40 bg-red-500/10';
    ringColor = '#EF4444';
  }

  // Circular gauge
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readinessScore / 100) * circumference;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 mb-6">
      {/* 1. Exam Readiness Card */}
      <div className="rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-4 sm:p-5 shadow-lg flex flex-col justify-between relative overflow-hidden group hover:border-[#38467D] transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="font-pixel text-[10px] text-slate-400 tracking-wider uppercase">
                Readiness
              </span>
              <button
                type="button"
                onClick={() => setShowInfoPopover((prev) => !prev)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="About readiness formula"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${bandColorClass}`}>
              {readinessBand.label}
            </span>
          </div>

          {/* Info Popover */}
          {showInfoPopover && (
            <div
              role="tooltip"
              className="absolute inset-x-3 top-10 z-20 p-3 rounded-xl bg-[#18203E] border border-cyan-500/50 shadow-2xl text-xs text-slate-200 animate-in fade-in duration-150"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-bold text-cyan-300">Readiness Score</span>
                <button
                  type="button"
                  onClick={() => setShowInfoPopover(false)}
                  className="text-slate-400 hover:text-white"
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Readiness is the average strength of all concepts. Strength drops a little if you
                don't review a concept for a while.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 my-2">
            <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="text-[#1A223D]"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke={ringColor}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute font-pixel text-sm text-white">{readinessScore}%</span>
            </div>
            <div>
              <p className="text-xs text-slate-300 leading-snug">{readinessBand.description}</p>
            </div>
          </div>
        </div>

        {coveragePercent < 50 && (
          <p className="text-[10px] font-mono text-amber-300/90 pt-1 border-t border-[#1C2548]">
            Based on only {coveragePercent}% of your material so far.
          </p>
        )}
      </div>

      {/* 2. Coverage Card */}
      <div className="rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-4 sm:p-5 shadow-lg flex flex-col justify-between hover:border-[#38467D] transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-pixel text-[10px] text-slate-400 tracking-wider uppercase">
              Coverage
            </span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-pixel text-lg sm:text-xl text-white my-1">
            {coveragePercent}%
          </div>
          <p className="text-xs font-mono text-slate-300">
            {playedConcepts} of {counts.total} concepts played
          </p>
        </div>

        <div className="mt-3">
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              style={{ width: `${coveragePercent}%` }}
              className="h-full bg-cyan-400 transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Mastered Concepts Card */}
      <div className="rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-4 sm:p-5 shadow-lg flex flex-col justify-between hover:border-[#38467D] transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-pixel text-[10px] text-slate-400 tracking-wider uppercase">
              Mastered
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-pixel text-lg sm:text-xl text-emerald-400 my-1">
            {counts.mastered}
          </div>
          <p className="text-xs font-mono text-slate-300">
            {counts.mastered} of {counts.total} concepts
          </p>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
          <span className="text-amber-400">{counts.shaky} shaky</span>
          <span>·</span>
          <span className="text-red-400">{counts.weak} weak</span>
        </div>
      </div>

      {/* 4. XP and Rank Card */}
      <div className="rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-4 sm:p-5 shadow-lg flex flex-col justify-between hover:border-[#38467D] transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-pixel text-[10px] text-slate-400 tracking-wider uppercase">
              Rank & XP
            </span>
            <Trophy className="w-4 h-4 text-[#F5C542]" />
          </div>
          <div className="font-pixel text-base text-[#F5C542] my-1 flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-[#F5C542]" />
            <span>{currentRank.name}</span>
          </div>
          <p className="text-xs font-mono text-slate-300">{totalXp} Total XP</p>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>{nextRank ? `To ${nextRank.name}` : 'Max Rank'}</span>
            <span>{nextRank ? `+${xpToNext} XP` : '★'}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              style={{ width: `${rankProgress}%` }}
              className="h-full bg-[#F5C542] transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* 5. Day Streak Card */}
      <div className="rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-4 sm:p-5 shadow-lg flex flex-col justify-between hover:border-[#38467D] transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-pixel text-[10px] text-slate-400 tracking-wider uppercase">
              Day Streak
            </span>
            <Flame
              className={`w-4 h-4 ${dayStreak > 0 ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-slate-500'}`}
            />
          </div>
          <div className="font-pixel text-lg sm:text-xl text-amber-300 my-1">
            {dayStreak} {dayStreak === 1 ? 'day' : 'days'}
          </div>
          <p className="text-xs font-mono text-slate-300">
            {dayStreak > 0 ? 'Daily consistency pays off!' : 'Play today to start a streak'}
          </p>
        </div>

        <div className="mt-3 text-[11px] font-mono text-slate-400">
          Finished levels or revisions count
        </div>
      </div>
    </div>
  );
};
