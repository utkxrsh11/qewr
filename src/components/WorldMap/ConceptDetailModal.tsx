import React, { useEffect, useRef } from 'react';
import { Concept, Chapter } from '../../types/course.ts';
import { ConceptMasteryRecord } from '../../services/masteryStore.ts';
import {
  X,
  Play,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface ConceptDetailModalProps {
  concept: Concept;
  chapter: Chapter;
  stats: ConceptMasteryRecord;
  onClose: () => void;
  onPractice: (concept: Concept, chapter: Chapter) => void;
}

export const ConceptDetailModal: React.FC<ConceptDetailModalProps> = ({
  concept,
  chapter,
  stats,
  onClose,
  onPractice,
}) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const isAttempted = stats.isAttempted && stats.totalAttempts > 0;
  const mastery = stats.mastery;

  // Format relative last practiced time
  const formatLastPracticed = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const accuracyPercent =
    stats.totalAttempts > 0
      ? Math.round((stats.correctAnswers / stats.totalAttempts) * 100)
      : 0;

  // Mastery bar color and state description
  let barColor = 'bg-slate-600';
  let statusBadge = (
    <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
      Unexplored
    </span>
  );

  if (isAttempted) {
    if (mastery < 40) {
      barColor = 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]';
      statusBadge = (
        <span className="px-2 py-0.5 rounded text-xs font-mono bg-red-950 text-red-300 border border-red-800 font-bold">
          Struggling ({mastery}%)
        </span>
      );
    } else if (mastery < 75) {
      barColor = 'bg-amber-400 shadow-[0_0_10px_rgba(245,197,66,0.6)]';
      statusBadge = (
        <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-950 text-amber-300 border border-amber-800 font-bold">
          Developing ({mastery}%)
        </span>
      );
    } else {
      barColor = 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]';
      statusBadge = (
        <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
          Mastered ({mastery}%)
        </span>
      );
    }
  }

  // Type badge styling
  const typeBadgeStyles = {
    fact: 'bg-blue-950/80 text-blue-300 border-blue-800',
    process: 'bg-purple-950/80 text-purple-300 border-purple-800',
    detail: 'bg-amber-950/80 text-amber-300 border-amber-800',
  }[concept.type] || 'bg-slate-800 text-slate-300 border-slate-700';

  // Keyboard escape listener and autofocus
  useEffect(() => {
    closeBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="concept-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0F1326] border-2 border-[#2B355A] shadow-2xl p-5 sm:p-7 flex flex-col gap-5 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-4 border-b border-[#1E2644] pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <span className="text-teal-400 uppercase tracking-wider">{chapter.title}</span>
              <span>·</span>
              <span className="text-slate-400">Page {concept.page}</span>
            </div>
            <h2 id="concept-modal-title" className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {concept.name}
            </h2>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1C2340] border border-transparent hover:border-[#2E3A63] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542] cursor-pointer"
            aria-label="Close details"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Badges strip */}
        <div className="flex items-center gap-2 flex-wrap">
          {statusBadge}
          <span className={`px-2 py-0.5 rounded text-xs font-mono border capitalize ${typeBadgeStyles}`}>
            {concept.type}
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-mono bg-[#141A33] text-slate-300 border border-[#2B355E]">
            ID: {concept.id}
          </span>
        </div>

        {/* Mastery Progress Bar */}
        <div className="p-4 rounded-xl bg-[#0A0D1B] border border-[#1C2340]">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#F5C542]" aria-hidden="true" />
              Concept Mastery Score
            </span>
            <span className="font-bold text-white text-sm">
              {isAttempted ? `${mastery} / 100` : 'Not Attempted'}
            </span>
          </div>

          <div className="w-full h-3 bg-[#161B30] rounded-full overflow-hidden border border-[#262E4E]">
            <div
              className={`h-full transition-all duration-500 rounded-full ${barColor}`}
              style={{ width: `${isAttempted ? Math.max(5, mastery) : 0}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1.5">
            <span>0%</span>
            <span>40% (Threshold)</span>
            <span>75% (Mastery)</span>
            <span>100%</span>
          </div>
        </div>

        {/* Summary */}
        <div className="p-3.5 rounded-xl bg-[#131830] border border-[#232B4C]">
          <h3 className="text-xs font-mono text-teal-400 uppercase tracking-wide mb-1.5">
            Concept Summary
          </h3>
          <p className="text-sm text-slate-200 leading-relaxed">
            {concept.summary}
          </p>
        </div>

        {/* Source Quote from PDF */}
        <div className="p-3.5 rounded-xl bg-[#0C1021] border border-[#1A223E]">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mb-1">
            <FileText className="w-3.5 h-3.5 text-[#F5C542]" aria-hidden="true" />
            <span>EXCERPT FROM PDF (PAGE {concept.page})</span>
          </div>
          <blockquote className="text-xs text-slate-300 italic border-l-2 border-[#F5C542] pl-3 py-0.5">
            "{concept.sourceQuote}"
          </blockquote>
        </div>

        {/* Historical Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-lg bg-[#0E1224] border border-[#1E2747] text-center">
            <div className="text-[10px] font-mono text-slate-400 mb-0.5">Attempts</div>
            <div className="text-sm font-bold font-mono text-white">{stats.totalAttempts}</div>
          </div>

          <div className="p-3 rounded-lg bg-[#0E1224] border border-[#1E2747] text-center">
            <div className="text-[10px] font-mono text-slate-400 mb-0.5">Accuracy</div>
            <div className="text-sm font-bold font-mono text-emerald-400">
              {stats.totalAttempts > 0 ? `${accuracyPercent}%` : '—'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0E1224] border border-[#1E2747] text-center">
            <div className="text-[10px] font-mono text-slate-400 mb-0.5">Peak Score</div>
            <div className="text-sm font-bold font-mono text-[#F5C542]">
              {stats.highestMastery > 0 ? `${stats.highestMastery}%` : '—'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0E1224] border border-[#1E2747] text-center">
            <div className="text-[10px] font-mono text-slate-400 mb-0.5">Last Seen</div>
            <div className="text-xs font-semibold text-slate-300 truncate">
              {formatLastPracticed(stats.lastPracticed)}
            </div>
          </div>
        </div>

        {/* Action Button: Practice This Concept */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#1E2644]">
          <button
            type="button"
            onClick={onClose}
            className="btn-pixel-dark px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => onPractice(concept, chapter)}
            className="btn-pixel-gold px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <Play className="w-4 h-4 fill-current text-black" aria-hidden="true" />
            <span>Practice This Concept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
