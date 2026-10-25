import React, { useState, useMemo } from 'react';
import { Course, StudyQuestProgress, Level, Concept } from '../../types/course.ts';
import {
  strength,
  stateOf,
  priority,
  reasonOf,
  getNow,
} from '../../services/masteryModel.ts';
import { buildLevels } from '../../services/levelBuilder.ts';
import {
  RotateCcw,
  Sparkles,
  Play,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  List,
} from 'lucide-react';

interface ReviseListProps {
  course: Course;
  progress: StudyQuestProgress;
  onReviseConcept: (concept: Concept, chapterId: string) => void;
  onPlayLevel: (level: Level) => void;
}

export const ReviseList: React.FC<ReviseListProps> = ({
  course,
  progress,
  onReviseConcept,
  onPlayLevel,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [limit, setLimit] = useState(10);
  const [untouchedOpen, setUntouchedOpen] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const now = getNow();
  const allLevels = useMemo(() => buildLevels(course), [course]);

  // Map conceptId -> containing level
  const conceptToLevelMap = useMemo(() => {
    const map = new Map<string, Level>();
    allLevels.forEach((lvl) => {
      lvl.concepts.forEach((c) => {
        map.set(c.id, lvl);
      });
    });
    return map;
  }, [allLevels]);

  // Build list of all candidate concepts (played only)
  const { reviseCandidates, untouchedConcepts } = useMemo(() => {
    const reviseList: Array<{
      concept: Concept;
      chapterTitle: string;
      chapterId: string;
      strengthVal: number;
      prio: number;
      reason: string;
      state: string;
      page: number;
    }> = [];

    const untouchedList: Array<{
      concept: Concept;
      chapterTitle: string;
      chapterId: string;
      level?: Level;
    }> = [];

    (course.chapters || []).forEach((ch) => {
      (ch.concepts || []).forEach((c) => {
        const p = progress.concepts[c.id];
        if (p && p.answered > 0) {
          const s = strength(p, now);
          const st = stateOf(p, now);
          const prio = priority(p, now);
          const rsn = reasonOf(p, now);

          reviseList.push({
            concept: c,
            chapterTitle: ch.title,
            chapterId: ch.id,
            strengthVal: Math.round(s * 100),
            prio,
            reason: rsn,
            state: st,
            page: c.page,
          });
        } else {
          untouchedList.push({
            concept: c,
            chapterTitle: ch.title,
            chapterId: ch.id,
            level: conceptToLevelMap.get(c.id),
          });
        }
      });
    });

    // Sort by priority descending
    reviseList.sort((a, b) => b.prio - a.prio);

    return { reviseCandidates: reviseList, untouchedConcepts: untouchedList };
  }, [course, progress, now, conceptToLevelMap]);

  const displayedList = showAll
    ? reviseCandidates.slice(0, Math.min(50, limit))
    : reviseCandidates.slice(0, 10);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'fact':
        return { label: 'Fact', cls: 'bg-teal-950/80 text-[#2DD4BF] border-teal-500/40' };
      case 'process':
        return { label: 'Process', cls: 'bg-amber-950/80 text-[#F5C542] border-amber-500/40' };
      case 'detail':
        return { label: 'Detail', cls: 'bg-purple-950/80 text-[#C084FC] border-purple-500/40' };
      default:
        return { label: 'Fact', cls: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="mb-6 rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-4 sm:p-6 shadow-lg text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F5C542]" />
            <h2 className="font-pixel text-xs sm:text-sm text-white">Revise These</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Weak and due concepts ranked by urgency. Click &quot;Revise&quot; to practice right now.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#2B355E] bg-[#141A33] hover:bg-[#1C2548] text-slate-300 font-mono text-xs transition-colors cursor-pointer self-start sm:self-center"
          aria-pressed={showTable}
        >
          {showTable ? <List className="w-3.5 h-3.5" /> : <TableIcon className="w-3.5 h-3.5" />}
          <span>{showTable ? 'Show list' : 'Show as table'}</span>
        </button>
      </div>

      {reviseCandidates.length === 0 ? (
        <div className="p-4 rounded-xl bg-[#0F1426] border border-[#232D52] text-center text-xs font-mono text-slate-400">
          No concepts played yet. Play a level first to track review priorities!
        </div>
      ) : showTable ? (
        <div className="overflow-x-auto">
          <table
            className="w-full text-xs font-mono text-left border-collapse"
            aria-label="High priority concepts revision table"
          >
            <thead>
              <tr className="border-b border-[#232D52] text-slate-400">
                <th className="py-2 px-3">Concept</th>
                <th className="py-2 px-3">Chapter</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Page</th>
                <th className="py-2 px-3">Strength</th>
                <th className="py-2 px-3">Reason</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D2545]">
              {displayedList.map((item) => {
                const badge = getTypeBadge(item.concept.type);
                return (
                  <tr key={item.concept.id} className="hover:bg-[#171E3A] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white">{item.concept.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{item.chapterTitle}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">p. {item.page}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            style={{ width: `${item.strengthVal}%` }}
                            className={`h-full ${
                              item.strengthVal >= 80
                                ? 'bg-emerald-500'
                                : item.strengthVal >= 50
                                ? 'bg-amber-400'
                                : 'bg-red-500'
                            }`}
                          />
                        </div>
                        <span>{item.strengthVal}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">{item.reason}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onReviseConcept(item.concept, item.chapterId)}
                        className="btn-pixel-gold px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer"
                      >
                        Revise
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-2.5" role="region" aria-label="High priority concepts revision list">
          {displayedList.map((item) => {
            const badge = getTypeBadge(item.concept.type);
            return (
              <div
                key={item.concept.id}
                className="p-3 sm:p-3.5 rounded-xl bg-[#0F1426] border border-[#232D52] hover:border-[#334070] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-white">
                        {item.concept.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] font-mono text-teal-400">
                        Page {item.page}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[11px] font-mono text-slate-400 mt-1">
                      <span>{item.chapterTitle}</span>
                      <span>·</span>
                      <span className="text-amber-300 font-medium">{item.reason}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${item.strengthVal}%` }}
                        className={`h-full ${
                          item.strengthVal >= 80
                            ? 'bg-emerald-500'
                            : item.strengthVal >= 50
                            ? 'bg-amber-400'
                            : 'bg-red-500'
                        }`}
                      />
                    </div>
                    <span className="text-slate-300 font-bold">{item.strengthVal}%</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onReviseConcept(item.concept, item.chapterId)}
                    className="btn-pixel-gold px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-black" />
                    <span>Revise</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Show all / Show more expansion controls */}
      {reviseCandidates.length > 10 && (
        <div className="mt-3 flex items-center justify-between text-xs font-mono pt-2 border-t border-[#1C2548]">
          {!showAll ? (
            <button
              type="button"
              onClick={() => {
                setShowAll(true);
                setLimit(25);
              }}
              className="text-[#F5C542] hover:underline cursor-pointer"
            >
              Show all ({reviseCandidates.length} concepts)
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {limit < Math.min(50, reviseCandidates.length) && (
                <button
                  type="button"
                  onClick={() => setLimit((prev) => Math.min(50, prev + 15))}
                  className="text-teal-400 hover:underline cursor-pointer"
                >
                  Show more (+15)
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowAll(false);
                  setLimit(10);
                }}
                className="text-slate-400 hover:underline cursor-pointer"
              >
                Collapse to top 10
              </button>
            </div>
          )}
          <span className="text-slate-500">
            Showing {displayedList.length} of {reviseCandidates.length}
          </span>
        </div>
      )}

      {/* Collapsed Group: Not started yet */}
      {untouchedConcepts.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[#232D52]">
          <button
            type="button"
            onClick={() => setUntouchedOpen((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer py-1"
            aria-expanded={untouchedOpen}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              <span className="font-bold">Not started yet ({untouchedConcepts.length} concepts)</span>
            </div>
            {untouchedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {untouchedOpen && (
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
              {untouchedConcepts.map(({ concept, chapterTitle, level }) => (
                <div
                  key={concept.id}
                  className="p-2.5 rounded-lg bg-[#0A0D1B] border border-[#1E2545] flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-300">{concept.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono ml-2">
                      ({chapterTitle} · p. {concept.page})
                    </span>
                  </div>

                  {level && (
                    <button
                      type="button"
                      onClick={() => onPlayLevel(level)}
                      className="btn-pixel-dark px-2.5 py-1 rounded text-[11px] font-mono text-teal-300 hover:border-teal-500/60 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Play className="w-3 h-3 text-teal-400" />
                      <span>Play Level {level.levelNumber}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
