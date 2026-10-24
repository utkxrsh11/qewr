import React from 'react';
import { Course } from '../../types/course.ts';
import { getOverallMastery, getMasteryCounts } from '../../services/masteryStore.ts';
import { ArrowLeft, Settings, Award, Compass, Sparkles, BookOpen } from 'lucide-react';

interface WorldMapHeaderProps {
  course: Course;
  onBackToCourse: () => void;
  onOpenSettings: () => void;
}

export const WorldMapHeader: React.FC<WorldMapHeaderProps> = ({
  course,
  onBackToCourse,
  onOpenSettings,
}) => {
  const overallMastery = getOverallMastery(course);
  const { totalConcepts, masteredConcepts, attemptedConcepts } = getMasteryCounts(course);

  // Overall mastery gauge color
  let masteryColor = 'text-slate-400';
  let badgeBorder = 'border-slate-700 bg-slate-900/60';
  if (overallMastery >= 75) {
    masteryColor = 'text-emerald-400';
    badgeBorder = 'border-emerald-500/60 bg-emerald-950/50 shadow-[0_0_15px_rgba(52,211,153,0.3)]';
  } else if (overallMastery >= 40) {
    masteryColor = 'text-amber-400';
    badgeBorder = 'border-amber-500/60 bg-amber-950/50 shadow-[0_0_15px_rgba(245,197,66,0.3)]';
  } else if (overallMastery > 0) {
    masteryColor = 'text-red-400';
    badgeBorder = 'border-red-500/60 bg-red-950/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
  }

  return (
    <div className="mb-8 p-4 sm:p-6 rounded-2xl bg-[#10142A]/90 border-2 border-[#202947] shadow-xl backdrop-blur-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left: Back button & Title */}
        <div className="flex items-start gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onBackToCourse}
            className="p-2 sm:p-2.5 rounded-xl bg-[#161C33] border border-[#2B355A] hover:bg-[#1E2747] text-slate-300 hover:text-white transition-colors cursor-pointer flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542]"
            aria-label="Back to Course Overview"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <Compass className="w-3.5 h-3.5 text-[#2DD4BF]" aria-hidden="true" />
              <span className="text-[#2DD4BF] font-semibold tracking-wider">WORLD EXPEDITION</span>
              <span>·</span>
              <span className="truncate max-w-[200px] sm:max-w-xs">{course.sourceName}</span>
            </div>

            <h1 className="font-pixel text-base sm:text-xl text-white tracking-tight drop-shadow-sm truncate">
              {course.courseTitle}
            </h1>
          </div>
        </div>

        {/* Right: Mastery Stats & Settings */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap flex-shrink-0">
          {/* Overall Mastery Gauge */}
          <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border ${badgeBorder}`}>
            <Award className={`w-4 h-4 ${masteryColor}`} aria-hidden="true" />
            <div className="text-left font-mono">
              <div className="text-[10px] text-slate-400 leading-none">OVERALL MASTERY</div>
              <div className={`text-base font-bold ${masteryColor} leading-tight`}>
                {overallMastery}%
              </div>
            </div>
          </div>

          {/* Mastered concepts tally */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[#263156] bg-[#141A33] text-left font-mono">
            <Sparkles className="w-4 h-4 text-[#F5C542]" aria-hidden="true" />
            <div>
              <div className="text-[10px] text-slate-400 leading-none">MASTERED</div>
              <div className="text-sm font-bold text-white leading-tight">
                {masteredConcepts} <span className="text-xs text-slate-400 font-normal">/ {totalConcepts}</span>
              </div>
            </div>
          </div>

          {/* Chapters count */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#263156] bg-[#141A33] text-left font-mono">
            <BookOpen className="w-4 h-4 text-teal-400" aria-hidden="true" />
            <div>
              <div className="text-[10px] text-slate-400 leading-none">REALMS</div>
              <div className="text-sm font-bold text-white leading-tight">
                {course.chapters.length}
              </div>
            </div>
          </div>

          {/* Settings button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-[#161C33] border border-[#2B355A] hover:bg-[#1E2747] text-slate-300 hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542]"
            aria-label="Settings and Reset Mastery"
            title="Settings and Reset Progress"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
