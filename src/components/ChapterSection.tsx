import React, { useState } from 'react';
import { Chapter, Concept, Level, StudyQuestProgress } from '../types/course.ts';
import { ConceptCard } from './ConceptCard.tsx';
import { LevelStrip } from './LevelStrip.tsx';
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react';

interface ChapterSectionProps {
  chapter: Chapter;
  filteredConcepts: Concept[];
  index: number;
  chapterLevels?: Level[];
  progress?: StudyQuestProgress;
  onSelectLevel?: (level: Level) => void;
}

export const ChapterSection: React.FC<ChapterSectionProps> = ({
  chapter,
  filteredConcepts,
  index,
  chapterLevels = [],
  progress = { totalXp: 0, levels: {}, concepts: {} },
  onSelectLevel,
}) => {
  // Accordion expanded by default per specification
  const [isExpanded, setIsExpanded] = useState(true);

  if (filteredConcepts.length === 0) {
    return null; // When filtered out by search/badge filter
  }

  const pageRangeText =
    chapter.pageStart === chapter.pageEnd
      ? `Page ${chapter.pageStart}`
      : `Pages ${chapter.pageStart}–${chapter.pageEnd}`;

  return (
    <section
      className="mb-6 rounded-lg border-2 border-[#1F2642] bg-[#0E1224] overflow-hidden shadow-lg transition-colors"
      aria-labelledby={`chapter-heading-${chapter.id}`}
    >
      {/* Chapter Accordion Header */}
      <button
        type="button"
        id={`chapter-heading-${chapter.id}`}
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between text-left bg-[#13182E] hover:bg-[#181E38] transition-colors border-b border-[#1F2642] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542]"
        aria-expanded={isExpanded}
        aria-controls={`chapter-content-${chapter.id}`}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-2">
          {/* Retro toggle icon */}
          <div
            className="w-7 h-7 rounded bg-[#1C2344] border border-[#2F3A66] flex items-center justify-center text-[#F5C542] flex-shrink-0"
            aria-hidden="true"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-0.5">
              <span>Chapter {index + 1}</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#2DD4BF] font-medium">{pageRangeText}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white truncate leading-snug">
              {chapter.title}
            </h2>
          </div>
        </div>

        {/* Concept Count Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#1C2344] text-slate-300 border border-[#2B355E]">
            {filteredConcepts.length} {filteredConcepts.length === 1 ? 'concept' : 'concepts'}
          </span>
        </div>
      </button>

      {/* Chapter Content Grid */}
      {isExpanded && (
        <div
          id={`chapter-content-${chapter.id}`}
          className="p-4 sm:p-6 bg-[#0B0D19]/60"
        >
          {/* Level Challenges Strip */}
          {chapterLevels.length > 0 && onSelectLevel && (
            <LevelStrip
              levels={chapterLevels}
              progress={progress}
              onSelectLevel={onSelectLevel}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredConcepts.map((concept) => (
              <ConceptCard
                key={concept.id}
                concept={concept}
                conceptProgress={progress?.concepts?.[concept.id]}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
