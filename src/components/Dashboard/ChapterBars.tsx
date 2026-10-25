import React, { useState } from 'react';
import { Course, StudyQuestProgress } from '../../types/course.ts';
import { stateOf, getNow } from '../../services/masteryModel.ts';
import { BookOpen, Table, BarChart2 } from 'lucide-react';

interface ChapterBarsProps {
  course: Course;
  progress: StudyQuestProgress;
  onSelectChapter?: (chapterId: string) => void;
}

export const ChapterBars: React.FC<ChapterBarsProps> = ({
  course,
  progress,
  onSelectChapter,
}) => {
  const [showTable, setShowTable] = useState(false);
  const now = getNow();

  const chapterData = (course.chapters || []).map((ch, idx) => {
    const concepts = ch.concepts || [];
    const total = concepts.length;

    let mastered = 0;
    let shaky = 0;
    let weak = 0;
    let untouched = 0;

    concepts.forEach((concept) => {
      const p = progress.concepts[concept.id];
      const st = stateOf(p, now);
      if (st === 'mastered') mastered++;
      else if (st === 'shaky') shaky++;
      else if (st === 'weak') weak++;
      else untouched++;
    });

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
    };
  });

  return (
    <div className="mb-6 rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-4 sm:p-6 shadow-lg text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#F5C542]" />
          <h2 className="font-pixel text-xs sm:text-sm text-white">Chapter Breakdown</h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>Mastered</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
              <span>Shaky</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
              <span>Weak</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-700" />
              <span>Untouched</span>
            </span>
          </div>

          {/* Table toggle */}
          <button
            type="button"
            onClick={() => setShowTable((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#2B355E] bg-[#141A33] hover:bg-[#1C2548] text-slate-300 font-mono text-xs transition-colors cursor-pointer"
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
            aria-label="Chapter concept mastery breakdown table"
          >
            <thead>
              <tr className="border-b border-[#232D52] text-slate-400">
                <th className="py-2 px-3">Chapter</th>
                <th className="py-2 px-3">Pages</th>
                <th className="py-2 px-3 text-emerald-400">Mastered</th>
                <th className="py-2 px-3 text-amber-400">Shaky</th>
                <th className="py-2 px-3 text-red-400">Weak</th>
                <th className="py-2 px-3 text-slate-400">Untouched</th>
                <th className="py-2 px-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D2545]">
              {chapterData.map((ch) => (
                <tr
                  key={ch.id}
                  onClick={() => onSelectChapter?.(ch.id)}
                  className="hover:bg-[#171E3A] cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 font-semibold text-white">
                    {ch.index}. {ch.title}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    p. {ch.pageStart}-{ch.pageEnd}
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">{ch.mastered}</td>
                  <td className="py-2.5 px-3 text-amber-400 font-bold">{ch.shaky}</td>
                  <td className="py-2.5 px-3 text-red-400 font-bold">{ch.weak}</td>
                  <td className="py-2.5 px-3 text-slate-400">{ch.untouched}</td>
                  <td className="py-2.5 px-3 text-slate-200">{ch.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="space-y-4"
          role="region"
          aria-label="Chapter concept mastery breakdown horizontal bars"
        >
          {chapterData.map((ch) => {
            const mPct = ch.total > 0 ? (ch.mastered / ch.total) * 100 : 0;
            const sPct = ch.total > 0 ? (ch.shaky / ch.total) * 100 : 0;
            const wPct = ch.total > 0 ? (ch.weak / ch.total) * 100 : 0;
            const uPct = ch.total > 0 ? (ch.untouched / ch.total) * 100 : 0;

            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => onSelectChapter?.(ch.id)}
                className="w-full text-left p-3.5 rounded-xl bg-[#0F1426] border border-[#232D52] hover:border-[#F5C542]/60 hover:bg-[#141A33] transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542]"
                aria-label={`Chapter ${ch.index}: ${ch.title}. ${ch.mastered} mastered, ${ch.shaky} shaky, ${ch.weak} weak, ${ch.untouched} untouched. Click to open in World Map.`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-white group-hover:text-[#F5C542] transition-colors">
                      {ch.index}. {ch.title}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      (Pages {ch.pageStart}–{ch.pageEnd})
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">{ch.mastered}M</span>
                    <span>·</span>
                    <span className="text-amber-400 font-bold">{ch.shaky}S</span>
                    <span>·</span>
                    <span className="text-red-400 font-bold">{ch.weak}W</span>
                    <span>·</span>
                    <span className="text-slate-400">{ch.untouched}U</span>
                    <span className="text-slate-500 font-normal">/ {ch.total}</span>
                  </div>
                </div>

                {/* Stacked bar */}
                <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex">
                  {mPct > 0 && (
                    <div style={{ width: `${mPct}%` }} className="h-full bg-emerald-500" />
                  )}
                  {sPct > 0 && (
                    <div style={{ width: `${sPct}%` }} className="h-full bg-amber-400" />
                  )}
                  {wPct > 0 && (
                    <div style={{ width: `${wPct}%` }} className="h-full bg-red-500" />
                  )}
                  {uPct > 0 && (
                    <div style={{ width: `${uPct}%` }} className="h-full bg-slate-700" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
