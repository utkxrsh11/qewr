import React from 'react';
import { Concept, Chapter } from '../../types/course.ts';
import { ConceptMasteryRecord } from '../../services/masteryStore.ts';
import { Crown, AlertCircle, BookOpen, Sparkles, HelpCircle } from 'lucide-react';

interface ConceptNodeProps {
  concept: Concept;
  chapter: Chapter;
  stats: ConceptMasteryRecord;
  index: number;
  isSelected?: boolean;
  onSelect: (concept: Concept, chapter: Chapter) => void;
}

export const ConceptNode: React.FC<ConceptNodeProps> = ({
  concept,
  chapter,
  stats,
  index,
  isSelected = false,
  onSelect,
}) => {
  const isAttempted = stats.isAttempted && stats.totalAttempts > 0;
  const mastery = stats.mastery;

  // Visual styling variants based on mastery
  let theme = {
    border: 'border-slate-500 hover:border-slate-300',
    bg: 'bg-[#161B2E]',
    glow: '',
    textColor: 'text-slate-400',
    badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
    icon: <HelpCircle className="w-4 h-4 text-slate-400" aria-hidden="true" />,
    statusLabel: 'Unexplored',
    ring: 'focus-visible:ring-slate-400',
  };

  if (isAttempted) {
    if (mastery < 40) {
      theme = {
        border: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:border-red-400',
        bg: 'bg-gradient-to-b from-red-950/70 to-[#18111D]',
        glow: 'animate-pulse',
        textColor: 'text-red-400',
        badgeBg: 'bg-red-950/90 text-red-300 border-red-800',
        icon: <AlertCircle className="w-4 h-4 text-red-400" aria-hidden="true" />,
        statusLabel: `Struggling (${mastery}%)`,
        ring: 'focus-visible:ring-red-400',
      };
    } else if (mastery < 75) {
      theme = {
        border: 'border-amber-400 shadow-[0_0_15px_rgba(245,197,66,0.35)] hover:border-amber-300',
        bg: 'bg-gradient-to-b from-amber-950/60 to-[#18151D]',
        glow: '',
        textColor: 'text-amber-300',
        badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-800',
        icon: <BookOpen className="w-4 h-4 text-amber-300" aria-hidden="true" />,
        statusLabel: `Developing (${mastery}%)`,
        ring: 'focus-visible:ring-amber-400',
      };
    } else {
      theme = {
        border: 'border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.5)] hover:border-emerald-300',
        bg: 'bg-gradient-to-b from-emerald-950/70 to-[#101F1E]',
        glow: '',
        textColor: 'text-emerald-300',
        badgeBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-700',
        icon: <Crown className="w-4 h-4 text-emerald-300" aria-hidden="true" />,
        statusLabel: `Mastered (${mastery}%)`,
        ring: 'focus-visible:ring-emerald-400',
      };
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(concept, chapter);
    }
  };

  return (
    <div className="flex flex-col items-center group relative z-10 w-28 sm:w-32">
      {/* Node Button */}
      <button
        type="button"
        onClick={() => onSelect(concept, chapter)}
        onKeyDown={handleKeyDown}
        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-3 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
          theme.border
        } ${theme.bg} ${theme.ring} focus:outline-none ${
          isSelected
            ? 'scale-115 ring-3 ring-[#F5C542] shadow-[0_0_24px_rgba(245,197,66,0.6)] z-20'
            : 'hover:scale-108 hover:z-20'
        }`}
        aria-label={`Concept ${index + 1}: ${concept.name}. Status: ${theme.statusLabel}. Page ${concept.page}. Press to view details and practice.`}
      >
        {/* Sequence number badge in top corner */}
        <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[#0E1224] border border-[#2F395E] text-[10px] font-mono font-bold text-slate-300 flex items-center justify-center shadow">
          {index + 1}
        </span>

        {/* State Icon */}
        <div className="flex items-center justify-center">
          {theme.icon}
        </div>

        {/* Mastery Percentage or Status Tag */}
        <span className={`text-[10px] font-mono font-bold mt-1 ${theme.textColor}`}>
          {isAttempted ? `${mastery}%` : 'NEW'}
        </span>

        {/* Page tag pill */}
        <span className="absolute -bottom-2 -right-2 text-[9px] font-mono px-1.5 py-0.2 bg-[#0C101F] text-slate-400 rounded-sm border border-[#2B355A]">
          p.{concept.page}
        </span>
      </button>

      {/* Concept Name Label below node */}
      <div className="mt-2.5 text-center px-1">
        <p
          className={`text-xs font-medium leading-snug line-clamp-2 transition-colors ${
            isSelected ? 'text-[#F5C542] font-semibold' : 'text-slate-200 group-hover:text-white'
          }`}
          title={concept.name}
        >
          {concept.name}
        </p>
      </div>
    </div>
  );
};
