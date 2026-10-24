import React, { useState, useMemo } from 'react';
import { Course, ConceptType, Level, StudyQuestProgress } from '../types/course.ts';
import { ChapterSection } from './ChapterSection.tsx';
import { FilterBar } from './FilterBar.tsx';
import { buildLevels } from '../services/levelBuilder.ts';
import { isDue } from '../services/masteryModel.ts';
import { DueBanner } from './Revision/DueBanner.tsx';
import { Download, RotateCcw, BookMarked, Layers, Swords, SearchX, Play, Sparkles, Compass, BarChart2 } from 'lucide-react';

interface CourseOverviewViewProps {
  course: Course;
  progress?: StudyQuestProgress;
  onStartOver: () => void;
  onSelectLevel?: (level: Level) => void;
  onStartLearning?: () => void;
  onOpenWorldMap?: () => void;
  onOpenDashboard?: () => void;
  onStartRevision?: () => void;
}

export const CourseOverviewView: React.FC<CourseOverviewViewProps> = ({
  course,
  progress = { totalXp: 0, levels: {}, concepts: {} },
  onStartOver,
  onSelectLevel,
  onStartLearning,
  onOpenWorldMap,
  onOpenDashboard,
  onStartRevision,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ConceptType | 'all'>('all');
  const [showConfirmStartOver, setShowConfirmStartOver] = useState(false);

  // Compute playable levels dynamically at runtime
  const allLevels = useMemo(() => buildLevels(course), [course]);

  // Group levels by chapter
  const chapterLevelsMap = useMemo(() => {
    const map: Record<string, Level[]> = {};
    allLevels.forEach((lvl) => {
      if (!map[lvl.chapterId]) map[lvl.chapterId] = [];
      map[lvl.chapterId].push(lvl);
    });
    return map;
  }, [allLevels]);

  // Compute total concepts count
  const totalConceptsCount = useMemo(() => {
    return course.chapters.reduce((sum, ch) => sum + ch.concepts.length, 0);
  }, [course]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    let fact = 0;
    let process = 0;
    let detail = 0;

    course.chapters.forEach((ch) => {
      ch.concepts.forEach((c) => {
        if (c.type === 'fact') fact++;
        else if (c.type === 'process') process++;
        else if (c.type === 'detail') detail++;
      });
    });

    return {
      all: totalConceptsCount,
      fact,
      process,
      detail,
    };
  }, [course, totalConceptsCount]);

  // Compute concepts due for spaced repetition review
  const dueCount = useMemo(() => {
    return course.chapters
      .flatMap((ch) => ch.concepts || [])
      .filter((c) => isDue(progress.concepts[c.id])).length;
  }, [course, progress]);

  // Filter concepts per chapter based on search and selected type
  const filteredChapters = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return course.chapters.map((chapter) => {
      const matchingConcepts = chapter.concepts.filter((concept) => {
        // Type filter
        if (selectedType !== 'all' && concept.type !== selectedType) {
          return false;
        }

        // Search filter (filters concepts by name or summary text)
        if (term) {
          const matchesName = concept.name.toLowerCase().includes(term);
          const matchesSummary = concept.summary.toLowerCase().includes(term);
          const matchesSource = concept.sourceQuote.toLowerCase().includes(term);
          return matchesName || matchesSummary || matchesSource;
        }

        return true;
      });

      return {
        chapter,
        matchingConcepts,
      };
    });
  }, [course, searchTerm, selectedType]);

  const hasAnyMatches = useMemo(() => {
    return filteredChapters.some((item) => item.matchingConcepts.length > 0);
  }, [filteredChapters]);

  // Download course JSON handler
  const handleDownloadJson = () => {
    try {
      const dataStr = JSON.stringify(course, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'studyquest-course.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download course JSON:', err);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-10">
      {/* 1. Header with Course Title & Meta */}
      <header className="mb-8 p-5 sm:p-7 rounded-xl bg-[#12162B] border-2 border-[#232A47] shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-2">
              <span className="text-[#F5C542] font-semibold">COURSE OVERVIEW</span>
              <span aria-hidden="true">·</span>
              <span className="truncate max-w-xs">{course.sourceName}</span>
              <span aria-hidden="true">·</span>
              <span>{course.totalPages} {course.totalPages === 1 ? 'page' : 'pages'}</span>
            </div>

            <h1 className="font-pixel text-lg sm:text-2xl text-white tracking-tight leading-snug drop-shadow-sm mb-3">
              {course.courseTitle}
            </h1>

            {/* Metric counters */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs sm:text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E1224] border border-[#232B4C] text-slate-200">
                <BookMarked className="w-4 h-4 text-[#2DD4BF]" aria-hidden="true" />
                <span className="font-semibold text-white">{course.chapters.length}</span>
                <span className="text-slate-400">
                  {course.chapters.length === 1 ? 'Chapter' : 'Chapters'}
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E1224] border border-[#232B4C] text-slate-200">
                <Layers className="w-4 h-4 text-[#F5C542]" aria-hidden="true" />
                <span className="font-semibold text-white">{totalConceptsCount}</span>
                <span className="text-slate-400">
                  {totalConceptsCount === 1 ? 'Concept' : 'Concepts'}
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E1224] border border-[#232B4C] text-slate-200">
                <Swords className="w-4 h-4 text-[#2DD4BF]" aria-hidden="true" />
                <span className="font-semibold text-white">{allLevels.length}</span>
                <span className="text-slate-400">
                  {allLevels.length === 1 ? 'Level' : 'Levels'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Start Learning, Download Course JSON, Start Over */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap flex-shrink-0">
            <button
              type="button"
              onClick={onStartLearning}
              className="btn-pixel-gold px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
              aria-label="Start learning"
            >
              <Play className="w-3.5 h-3.5 fill-current text-black" aria-hidden="true" />
              <span>Start learning</span>
            </button>

            {onOpenDashboard && (
              <button
                type="button"
                onClick={onOpenDashboard}
                className="btn-pixel-gold px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                aria-label="Open Exam Dashboard"
              >
                <BarChart2 className="w-4 h-4 text-black" aria-hidden="true" />
                <span>Dashboard</span>
              </button>
            )}

            {onOpenWorldMap && (
              <button
                type="button"
                onClick={onOpenWorldMap}
                className="btn-pixel-teal px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                aria-label="Open Adventure World Map"
              >
                <Compass className="w-4 h-4 text-[#2DD4BF]" aria-hidden="true" />
                <span>World Map</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadJson}
              className="btn-pixel-teal px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer"
              aria-label="Download course JSON as studyquest-course.json"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Download course JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfirmStartOver(true)}
              className="btn-pixel-dark px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-red-400 border-[#2D365C] flex items-center gap-2 cursor-pointer"
              aria-label="Start over with a new document"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Start over</span>
            </button>
          </div>
        </div>
      </header>

      {/* Due for Review Banner */}
      <DueBanner
        dueCount={dueCount}
        onStartRevision={onStartRevision || onOpenDashboard || (() => {})}
      />

      {/* 4. Filter Bar */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        counts={categoryCounts}
      />

      {/* 5 & 6. Chapters & Concepts Accordions */}
      {hasAnyMatches ? (
        <div className="space-y-6">
          {filteredChapters.map(({ chapter, matchingConcepts }, index) => (
            <ChapterSection
              key={chapter.id}
              chapter={chapter}
              filteredConcepts={matchingConcepts}
              index={index}
              chapterLevels={chapterLevelsMap[chapter.id] || []}
              progress={progress}
              onSelectLevel={onSelectLevel}
            />
          ))}
        </div>
      ) : (
        /* 7. Friendly Empty State */
        <div className="p-12 rounded-xl bg-[#12162B] border-2 border-[#232A47] text-center flex flex-col items-center justify-center my-8">
          <div className="w-12 h-12 rounded-full bg-[#181E38] border border-[#2B355E] flex items-center justify-center text-slate-400 mb-3">
            <SearchX className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-white mb-1">
            No concepts match your search.
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Try adjusting your search query or selecting &quot;All&quot; in the type filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedType('all');
            }}
            className="btn-pixel-dark px-4 py-2 rounded-lg text-xs font-semibold text-[#2DD4BF]"
          >
            Reset search and filters
          </button>
        </div>
      )}

      {/* 8. Start Learning Primary Action Button */}
      <div className="mt-12 pt-6 border-t border-[#1C223D] flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-400">
          Ready to test your knowledge? Play through chapter challenge levels.
        </p>

        <button
          type="button"
          onClick={onStartLearning}
          className="btn-pixel-gold px-7 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-amber-500/20"
          title="Start first uncompleted challenge level"
        >
          <Play className="w-4 h-4 fill-current text-black" aria-hidden="true" />
          <span>Start learning</span>
        </button>
      </div>

      {/* Start Over Confirmation Modal */}
      {showConfirmStartOver && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-100"
        >
          <div className="w-full max-w-md bg-[#12162B] border-2 border-[#EF4444] rounded-xl p-6 shadow-2xl text-center">
            <h3
              id="confirm-modal-title"
              className="font-pixel text-sm text-[#EF4444] mb-3"
            >
              Start Over?
            </h3>
            <p className="text-sm text-slate-200 mb-6 leading-relaxed">
              This will clear your current course. Continue?
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmStartOver(false);
                  onStartOver();
                }}
                className="btn-pixel-red px-5 py-2.5 rounded-lg text-xs font-bold cursor-pointer"
              >
                Continue
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmStartOver(false)}
                className="btn-pixel-dark px-5 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Keep course
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
