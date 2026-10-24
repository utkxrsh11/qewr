import React, { useState, useMemo } from 'react';
import { Course, StudyQuestProgress, ConceptReviewCandidate } from '../../types/course.ts';
import { GAME_REGISTRY } from '../../services/gameRegistry.ts';
import {
  baseMastery,
  strength,
  stateOf,
  isDue,
  overdueDays,
  priority,
  reasonOf,
  getNow,
} from '../../services/masteryModel.ts';
import { selectGame } from '../../services/gameRegistry.ts';
import {
  Clock,
  Sparkles,
  Search,
  Filter,
  Table as TableIcon,
  LayoutGrid,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Crown,
} from 'lucide-react';

interface ReviseListProps {
  course: Course;
  progress: StudyQuestProgress;
  onReviseConcept: (conceptId: string) => void;
}

export const ReviseList: React.FC<ReviseListProps> = ({
  course,
  progress,
  onReviseConcept,
}) => {
  const [filter, setFilter] = useState<'all' | 'due' | 'weak' | 'mastered' | 'untouched'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  const now = getNow();

  // Build candidate list across entire course
  const allCandidates: ConceptReviewCandidate[] = useMemo(() => {
    const list: ConceptReviewCandidate[] = [];
    (course.chapters || []).forEach((ch) => {
      (ch.concepts || []).forEach((c) => {
        const p = progress.concepts[c.id];
        const s = strength(p, now);
        const st = stateOf(p, now);
        const due = isDue(p, now);
        const overdue = overdueDays(p, now);
        const prio = priority(p, now);
        const rsn = reasonOf(p, now);
        const avoidGames = p?.lastGame ? [p.lastGame] : [];
        const suggestedGame = selectGame(c, { avoidGames });

        list.push({
          concept: c,
          chapter: ch,
          progress: p,
          baseMastery: baseMastery(p),
          strength: s,
          state: st,
          isDue: due,
          overdueDays: overdue,
          priority: prio,
          reason: rsn,
          suggestedGame,
        });
      });
    });

    // Sort by priority descending
    return list.sort((a, b) => b.priority - a.priority);
  }, [course, progress, now]);

  // Filter & Search
  const filteredList = useMemo(() => {
    return allCandidates.filter((cand) => {
      if (filter === 'due' && !cand.isDue) return false;
      if (filter === 'weak' && cand.state !== 'weak' && cand.state !== 'shaky') return false;
      if (filter === 'mastered' && cand.state !== 'mastered') return false;
      if (filter === 'untouched' && cand.state !== 'untouched') return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = cand.concept.name.toLowerCase().includes(q);
        const matchesChapter = cand.chapter.title.toLowerCase().includes(q);
        return matchesName || matchesChapter;
      }

      return true;
    });
  }, [allCandidates, filter, search]);

  return (
    <div className="mb-6 rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-5 sm:p-6 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="font-pixel text-xs sm:text-sm text-white flex items-center gap-2">
            <span>Concept Revision Queue ({filteredList.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ranked by urgency: overdue spaced reviews and weak concepts appear first
          </p>
        </div>

        {/* View toggle (cards vs table) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center rounded-lg bg-[#161B33] border border-[#2B355E] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-[#232C52] text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Show as table"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'cards' ? 'bg-[#232C52] text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Show as cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-mono">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'due', label: 'Due for Review' },
              { id: 'weak', label: 'Weak & Shaky' },
              { id: 'mastered', label: 'Mastered' },
              { id: 'untouched', label: 'Untouched' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs transition-colors shrink-0 cursor-pointer ${
                filter === tab.id
                  ? 'bg-amber-500/20 text-[#F5C542] border border-amber-500/50 font-bold'
                  : 'bg-[#161B33] text-slate-400 hover:text-white border border-[#232C52]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search concepts..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#2B355E] bg-[#161B33] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#F5C542]"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {filteredList.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-[#232C52] rounded-xl text-slate-400 text-xs font-mono">
          No concepts match your filter.
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (Accessible & high-density) */
        <div className="overflow-x-auto rounded-xl border border-[#232C52]">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-[#232C52] bg-[#161B33] text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Concept</th>
                <th className="py-2.5 px-3">Chapter</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Strength</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Next Game</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D2545]">
              {filteredList.map((cand) => {
                const sPct = Math.round(cand.strength * 100);
                const gameEntry = GAME_REGISTRY[cand.suggestedGame];
                const GameIcon = gameEntry.icon;

                let statusBadge = 'bg-slate-800 text-slate-400 border-slate-700';
                if (cand.state === 'mastered') statusBadge = 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
                else if (cand.state === 'shaky') statusBadge = 'bg-amber-950/80 text-amber-300 border-amber-700';
                else if (cand.state === 'weak') statusBadge = 'bg-red-950/80 text-red-300 border-red-700';

                return (
                  <tr key={cand.concept.id} className="hover:bg-[#161B33]/60 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-white max-w-xs truncate">
                      <div className="flex items-center gap-1.5">
                        {cand.isDue && <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />}
                        <span title={cand.concept.name}>{cand.concept.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-[140px]">
                      {cand.chapter.title}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 uppercase text-[10px]">
                      {cand.concept.type}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white w-8">{sPct}%</span>
                        <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            style={{ width: `${sPct}%` }}
                            className={`h-full ${
                              sPct >= 80 ? 'bg-emerald-400' : sPct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                            }`}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${statusBadge}`}>
                        {cand.reason}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      <div className="flex items-center gap-1 text-[11px]">
                        <GameIcon className="w-3.5 h-3.5 text-[#F5C542]" />
                        <span>{gameEntry.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onReviseConcept(cand.concept.id)}
                        className="px-2.5 py-1 rounded bg-[#F5C542]/20 hover:bg-[#F5C542]/30 text-[#F5C542] border border-[#F5C542]/40 text-[10px] font-pixel transition-colors cursor-pointer"
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
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredList.map((cand) => {
            const sPct = Math.round(cand.strength * 100);
            const gameEntry = GAME_REGISTRY[cand.suggestedGame];
            const GameIcon = gameEntry.icon;

            return (
              <div
                key={cand.concept.id}
                className="p-3.5 rounded-xl border border-[#232C52] bg-[#161B33] flex flex-col justify-between hover:border-[#334077] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-bold text-sm text-white line-clamp-1" title={cand.concept.name}>
                      {cand.concept.name}
                    </span>
                    <span className="font-pixel text-[10px] text-amber-300 shrink-0">
                      {sPct}%
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mb-2 truncate">
                    {cand.chapter.title}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono mb-3">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {cand.reason}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <GameIcon className="w-3 h-3 text-[#F5C542]" />
                      {gameEntry.name}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onReviseConcept(cand.concept.id)}
                  className="w-full py-1.5 rounded-lg bg-[#F5C542]/20 hover:bg-[#F5C542]/30 text-[#F5C542] border border-[#F5C542]/40 text-[10px] font-pixel transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Start Revision</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
