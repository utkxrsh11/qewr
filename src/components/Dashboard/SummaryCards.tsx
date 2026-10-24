import React from 'react';
import { ReadinessBand, ExamInfo } from '../../types/course.ts';
import {
  Trophy,
  Crown,
  Clock,
  Calendar,
  Zap,
  Target,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Flame,
} from 'lucide-react';

interface SummaryCardsProps {
  readinessScore: number;
  readinessBand: ReadinessBand;
  counts: {
    total: number;
    mastered: number;
    shaky: number;
    weak: number;
    untouched: number;
    due: number;
  };
  totalXp: number;
  levelsCompleted: number;
  totalLevels: number;
  examQuota: {
    daysLeft: number | null;
    dailyQuota: number;
    status: string;
  };
  examInfo: ExamInfo;
  onOpenExamModal: () => void;
  onStartRevision: () => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  readinessScore,
  readinessBand,
  counts,
  totalXp,
  levelsCompleted,
  totalLevels,
  examQuota,
  examInfo,
  onOpenExamModal,
  onStartRevision,
}) => {
  // SVG circular gauge calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readinessScore / 100) * circumference;

  let bandColorClass = 'text-amber-400 border-amber-500/40 bg-amber-500/10';
  let ringColor = '#F59E0B'; // amber
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Exam Readiness Score Gauge */}
      <div className="rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-5 shadow-lg flex flex-col justify-between relative overflow-hidden group hover:border-[#38467D] transition-colors">
        <div className="flex items-center justify-between mb-3">
          <span className="font-pixel text-[10px] text-slate-400 tracking-wider uppercase">
            Exam Readiness
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${bandColorClass}`}>
            {readinessBand.label}
          </span>
        </div>

        <div className="flex items-center gap-4 my-2">
          {/* Circular SVG Ring */}
          <div className="relative w-22 h-22 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 90 90">
              <circle
                cx="45"
                cy="45"
                r={radius}
                className="text-[#1D2545]"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="45"
                cy="45"
                r={radius}
                stroke={ringColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-pixel text-lg text-white font-bold">
                {readinessScore}%
              </span>
            </div>
          </div>

          <div className="flex-1">
            <p className="text-xs text-slate-300 leading-relaxed">
              {readinessBand.description}
            </p>
          </div>
        </div>

        <div className="mt-2 text-[10px] font-mono text-slate-400 border-t border-[#1C2342] pt-2 flex items-center justify-between">
          <span>Target: {examInfo.targetReadiness || 85}%</span>
          <span>{counts.total} concepts total</span>
        </div>
      </div>

      {/* 2. Concept Mastery Breakdown */}
      <div className="rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-5 shadow-lg flex flex-col justify-between hover:border-[#38467D] transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="font-pixel text-[10px] text-slate-400 tracking-wider uppercase">
            Mastery Breakdown
          </span>
          <Crown className="w-4 h-4 text-emerald-400" />
        </div>

        <div className="grid grid-cols-2 gap-2.5 my-1">
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <div>
              <div className="font-pixel text-sm text-emerald-300">{counts.mastered}</div>
              <div className="text-[10px] font-mono text-slate-400">Mastered</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div>
              <div className="font-pixel text-sm text-amber-300">{counts.shaky}</div>
              <div className="text-[10px] font-mono text-slate-400">Shaky</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div>
              <div className="font-pixel text-sm text-red-300">{counts.weak}</div>
              <div className="text-[10px] font-mono text-slate-400">Weak</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <div>
              <div className="font-pixel text-sm text-slate-300">{counts.untouched}</div>
              <div className="text-[10px] font-mono text-slate-400">Untouched</div>
            </div>
          </div>
        </div>

        <div className="mt-2 text-[10px] font-mono text-slate-400 border-t border-[#1C2342] pt-2 flex items-center justify-between">
          <span>Mastery: {counts.total > 0 ? Math.round((counts.mastered / counts.total) * 100) : 0}%</span>
          <span>Coverage: {counts.total > 0 ? Math.round(((counts.total - counts.untouched) / counts.total) * 100) : 0}%</span>
        </div>
      </div>

      {/* 3. Due For Review (Spaced Repetition) */}
      <div
        className={`rounded-2xl border-2 p-5 shadow-lg flex flex-col justify-between transition-colors ${
          counts.due > 0
            ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/30 to-[#12162B]'
            : 'border-[#242D52] bg-[#12162B] hover:border-[#38467D]'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-pixel text-[10px] text-slate-400 tracking-wider uppercase">
            Review Queue
          </span>
          <Clock className={`w-4 h-4 ${counts.due > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-2">
            <span className="font-pixel text-2xl text-white font-bold">
              {counts.due}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {counts.due === 1 ? 'concept due' : 'concepts due'}
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            {counts.due > 0
              ? 'These concepts are decaying. Revise now to maintain retention.'
              : 'All caught up! No concepts are currently due for spaced review.'}
          </p>
        </div>

        <div className="mt-2 border-t border-[#1C2342] pt-2 flex items-center justify-between">
          {counts.due > 0 ? (
            <button
              type="button"
              onClick={onStartRevision}
              className="text-[11px] font-mono text-[#F5C542] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Start revision now</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span>Up to date</span>
            </span>
          )}
        </div>
      </div>

      {/* 4. Exam Target & Daily Quota */}
      <div className="rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-5 shadow-lg flex flex-col justify-between hover:border-[#38467D] transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="font-pixel text-[10px] text-slate-400 tracking-wider uppercase">
            Exam Target
          </span>
          <Target className="w-4 h-4 text-cyan-400" />
        </div>

        <div className="my-2">
          {examQuota.daysLeft !== null ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-pixel text-2xl text-cyan-300 font-bold">
                  {Math.max(0, examQuota.daysLeft)}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {examQuota.daysLeft === 1 ? 'day left' : 'days left'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Recommended pace:{' '}
                <span className="font-bold text-[#F5C542]">
                  {examQuota.dailyQuota} {examQuota.dailyQuota === 1 ? 'concept' : 'concepts'} / day
                </span>{' '}
                to reach {examInfo.targetReadiness || 85}% readiness.
              </p>
            </>
          ) : (
            <>
              <div className="font-pixel text-sm text-slate-300 mt-1">
                No exam date set
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Set your exam date to get an automatic daily review quota.
              </p>
            </>
          )}
        </div>

        <div className="mt-2 border-t border-[#1C2342] pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={onOpenExamModal}
            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
          >
            {examQuota.daysLeft !== null ? 'Change exam date' : 'Set exam date'}
          </button>
          <span className="text-[10px] font-mono text-slate-500">
            {levelsCompleted} / {totalLevels} levels done
          </span>
        </div>
      </div>
    </div>
  );
};
