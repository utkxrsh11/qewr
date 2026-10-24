import React from 'react';
import { Course, StudyQuestProgress } from '../../types/course.ts';
import { stateOf, strength, getNow } from '../../services/masteryModel.ts';
import { BookOpen } from 'lucide-react';

interface ChapterBarsProps {
  course: Course;
  progress: StudyQuestProgress;
}

export const ChapterBars: React.FC<ChapterBarsProps> = ({ course, progress }) => {
  const now = getNow();

  const chapterData = (course.chapters || []).map((ch, idx) => {
    const concepts = ch.concepts || [];
    const total = concepts.length;

    let mastered = 0;
    let shaky = 0;
    let weak = 0;
    let untouched = 0;
    let sumStrength = 0;

    concepts.forEach((concept) => {
      const p = progress.concepts[concept.id];
      const s = strength(p, now);
      sumStrength += s;
      const st = stateOf(p, now);
      if (st === 'mastered') mastered++;
      else if (st === 'shaky') shaky++;
      else if (st === 'weak') weak++;
      else untouched++;
    });

    const avgStrength = total > 0 ? Math.round((sumStrength / total) * 100) : 0;

    return {
      id: ch.id,
      index: idx + 1,
      title: ch.title,
      pageStart: ch.pageStart,
      pageEnd: ch.pageEnd,
      total,
      mastered,
      shaky,
      weak,
      untouched,
      avgStrength,
    };
  });

  return (
    <div className="mb-6 rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-5 sm:p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#F5C542]" />
          <h2 className="font-pixel text-xs sm:text-sm text-white">
            Chapter Mastery Breakdown
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-emerald-400" /> Mastered
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-amber-400" /> Shaky
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-red-400" /> Weak
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-slate-600" /> Untouched
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {chapterData.map((ch) => {
          const mPct = ch.total > 0 ? (ch.mastered / ch.total) * 100 : 0;
          const sPct = ch.total > 0 ? (ch.shaky / ch.total) * 100 : 0;
          const wPct = ch.total > 0 ? (ch.weak / ch.total) * 100 : 0;
          const uPct = ch.total > 0 ? (ch.untouched / ch.total) * 100 : 0;

          return (
            <div key={ch.id} className="p-3.5 rounded-xl bg-[#161B33] border border-[#232C52]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-pixel text-xs text-white">
                    Ch {ch.index}: {ch.title}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    (pp. {ch.pageStart}–{ch.pageEnd})
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-400">
                    {ch.mastered}/{ch.total} mastered
                  </span>
                  <span className="font-bold text-[#F5C542]">
                    {ch.avgStrength}% strength
                  </span>
                </div>
              </div>

              {/* Stacked Proportional Bar */}
              <div className="h-3 w-full rounded-full bg-slate-800 flex overflow-hidden">
                {mPct > 0 && (
                  <div
                    style={{ width: `${mPct}%` }}
                    className="bg-emerald-500 h-full transition-all"
                    title={`Mastered: ${ch.mastered} (${Math.round(mPct)}%)`}
                  />
                )}
                {sPct > 0 && (
                  <div
                    style={{ width: `${sPct}%` }}
                    className="bg-amber-400 h-full transition-all"
                    title={`Shaky: ${ch.shaky} (${Math.round(sPct)}%)`}
                  />
                )}
                {wPct > 0 && (
                  <div
                    style={{ width: `${wPct}%` }}
                    className="bg-red-500 h-full transition-all"
                    title={`Weak: ${ch.weak} (${Math.round(wPct)}%)`}
                  />
                )}
                {uPct > 0 && (
                  <div
                    style={{ width: `${uPct}%` }}
                    className="bg-slate-700 h-full transition-all"
                    title={`Untouched: ${ch.untouched} (${Math.round(uPct)}%)`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
