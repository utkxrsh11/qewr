import React, { useState, useMemo } from 'react';
import { Course, StudyQuestProgress, RevisionSize, Concept, Level } from '../../types/course.ts';
import {
  readiness,
  readinessBand,
  getNow,
} from '../../services/masteryModel.ts';
import {
  loadStats,
  loadActivity,
  calculateDayStreak,
} from '../../services/statsService.ts';
import {
  loadExamInfo,
  saveExamInfo,
  calculateDailyQuota,
  clearExamInfo,
} from '../../services/examService.ts';
import { buildRevisionPlan } from '../../services/revisionPlanner.ts';
import { SummaryCards } from './SummaryCards.tsx';
import { SmartRevisionCard } from './SmartRevisionCard.tsx';
import { ChapterBars } from './ChapterBars.tsx';
import { PerformanceCharts } from './PerformanceCharts.tsx';
import { ActivityChart } from './ActivityChart.tsx';
import { ReviseList } from './ReviseList.tsx';
import { FooterActions } from './FooterActions.tsx';
import {
  ArrowLeft,
  Calendar,
  Compass,
  AlertTriangle,
  Play,
  X,
  Clock,
} from 'lucide-react';

interface DashboardViewProps {
  course: Course;
  progress: StudyQuestProgress;
  onBackToCourse: () => void;
  onOpenWorldMap: () => void;
  onStartSmartRevision: (size: RevisionSize, practiceMode: boolean) => void;
  onReviseConcept: (concept: Concept, chapterId: string) => void;
  onPlayLevel: (level: Level) => void;
  onStartLearning: () => void;
  onResetProgress: () => void;
  onSeedDemoProgress: () => void;
  onClearAllProgress?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  course,
  progress,
  onBackToCourse,
  onOpenWorldMap,
  onStartSmartRevision,
  onReviseConcept,
  onPlayLevel,
  onStartLearning,
  onResetProgress,
  onSeedDemoProgress,
  onClearAllProgress,
}) => {
  const [renderError, setRenderError] = useState<string | null>(null);

  // Revision size selection (default standard, restored from localStorage if available)
  const [revisionSize, setRevisionSize] = useState<RevisionSize>(() => {
    try {
      const saved = localStorage.getItem('studyquest_revision_size');
      if (saved === 'quick' || saved === 'standard' || saved === 'deep') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'standard';
  });

  // Exam date state
  const [examDate, setExamDate] = useState<string>(() => {
    const info = loadExamInfo();
    return info.date || info.examDate || '';
  });

  const isDebugMode = useMemo(() => {
    try {
      return window.location.search.includes('debug=1');
    } catch {
      return false;
    }
  }, []);

  try {
    const now = getNow();
    const stats = useMemo(() => loadStats(), [progress]);
    const activity = useMemo(() => loadActivity(), [progress]);
    const dayStreak = useMemo(() => calculateDayStreak(activity), [activity]);

    // Unified readiness and counts from masteryModel
    const readinessInfo = useMemo(() => readiness(course, progress, now), [course, progress, now]);
    const currentBand = useMemo(
      () => readinessBand(readinessInfo.score),
      [readinessInfo.score]
    );

    // Exam quota calculation
    const quotaInfo = useMemo(
      () => calculateDailyQuota(course, progress, examDate),
      [course, progress, examDate]
    );

    // Smart Revision plan preview
    const revisionPlan = useMemo(
      () => buildRevisionPlan(course, progress, revisionSize, now),
      [course, progress, revisionSize, now]
    );

    const hasPlayedAnything =
      readinessInfo.counts.total > 0 &&
      readinessInfo.counts.untouched < readinessInfo.counts.total;

    const handleExamDateChange = (newDate: string) => {
      setExamDate(newDate);
      saveExamInfo({ date: newDate });
    };

    const handleClearExamDate = () => {
      setExamDate('');
      clearExamInfo();
    };

    // Section 9: Friendly Empty State if user hasn't played anything yet
    if (!hasPlayedAnything) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-8 w-full animate-in fade-in duration-300 text-left">
          {/* Header row */}
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[#1E2545]">
            <div>
              <span className="font-pixel text-[10px] text-slate-400 tracking-wider uppercase">
                Student Dashboard
              </span>
              <h1 className="font-pixel text-base sm:text-lg text-white mt-1">
                {course.courseTitle}
              </h1>
              <p className="text-xs text-slate-400 font-mono">{course.sourceName}</p>
            </div>

            <button
              type="button"
              onClick={onBackToCourse}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#2B355E] bg-[#141A33] hover:bg-[#1C2548] text-slate-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              <span>Back to course</span>
            </button>
          </div>

          {/* Friendly prompt */}
          <div className="rounded-2xl border-2 border-[#242D52] bg-[#12162B] p-8 text-center max-w-lg mx-auto my-12 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4">
              <Compass className="w-7 h-7 text-[#F5C542]" />
            </div>

            <h2 className="font-pixel text-sm sm:text-base text-white mb-2">
              Play your first level to unlock your dashboard.
            </h2>
            <p className="text-xs text-slate-400 font-mono mb-6 leading-relaxed">
              Once you finish a challenge, your exam readiness, spaced repetition review schedule,
              and study analytics will show up here.
            </p>

            <button
              type="button"
              onClick={onStartLearning}
              className="btn-pixel-gold px-6 py-3 rounded-xl font-pixel text-xs text-black inline-flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Play className="w-4 h-4 text-black" />
              <span>Start learning</span>
            </button>
          </div>

          <FooterActions
            course={course}
            progress={progress}
            onResetProgress={onResetProgress}
            onSeedDemo={onSeedDemoProgress}
            onClearAllProgress={onClearAllProgress}
            isDebugMode={isDebugMode}
          />
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto px-4 py-6 w-full animate-in fade-in duration-300">
        {/* 4.1 HEADER ROW */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#1E2545] text-left">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[10px] text-slate-400 tracking-wider uppercase">
                Student Dashboard
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950/80 text-teal-300 border border-teal-500/30">
                Phase 6 Spaced Repetition
              </span>
            </div>
            <h1 className="font-pixel text-base sm:text-xl text-white mt-1">
              {course.courseTitle}
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{course.sourceName}</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Exam Date Field */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#2B355E] bg-[#12162B] text-xs font-mono text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-[#F5C542] shrink-0" />
              <label htmlFor="exam-date-input" className="text-slate-400 text-[11px] shrink-0">
                Exam date:
              </label>
              <input
                id="exam-date-input"
                type="date"
                value={examDate}
                onChange={(e) => handleExamDateChange(e.target.value)}
                className="bg-transparent border-0 text-white font-mono text-xs focus:outline-none cursor-pointer"
                aria-label="Exam date"
              />
              {examDate && (
                <button
                  type="button"
                  onClick={handleClearExamDate}
                  className="text-slate-400 hover:text-white ml-1 cursor-pointer"
                  title="Clear exam date"
                  aria-label="Clear exam date"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onBackToCourse}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#2B355E] bg-[#141A33] hover:bg-[#1C2548] text-slate-300 hover:text-white text-xs font-mono transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              <span>Back to course</span>
            </button>
          </div>
        </div>

        {/* Exam plan banner if exam date is configured */}
        {examDate && quotaInfo.status !== 'none' && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#141B34] border border-[#2B3D72] text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#F5C542] shrink-0" />
              {quotaInfo.status === 'future' && (
                <span>
                  <strong className="text-white">{quotaInfo.daysLeft} days left</strong> until your
                  exam. To finish before your exam: about{' '}
                  <strong className="text-[#F5C542]">{quotaInfo.dailyQuota} concepts per day</strong>.
                </span>
              )}
              {quotaInfo.status === 'today' && (
                <span className="text-amber-300 font-bold">
                  Exam day! Good luck on your test today!
                </span>
              )}
              {quotaInfo.status === 'past' && (
                <span className="text-red-300">
                  Exam date passed. You can clear or update it above.
                </span>
              )}
            </div>

            {(quotaInfo.status === 'past' || quotaInfo.status === 'today') && (
              <button
                type="button"
                onClick={handleClearExamDate}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer self-start sm:self-center"
              >
                Clear date
              </button>
            )}
          </div>
        )}

        {/* 4.2 SUMMARY CARDS */}
        <SummaryCards
          readinessScore={readinessInfo.score}
          readinessBand={currentBand}
          coverageRatio={readinessInfo.coverage}
          counts={readinessInfo.counts}
          totalXp={progress.totalXp}
          dayStreak={dayStreak}
        />

        {/* 4.3 SMART REVISION CARD (PRIMARY CALL TO ACTION) */}
        <SmartRevisionCard
          plan={revisionPlan}
          selectedSize={revisionSize}
          onSizeChange={(size) => setRevisionSize(size)}
          onStartRevision={(practice) => onStartSmartRevision(revisionSize, practice)}
          onGoToCourse={onBackToCourse}
          counts={readinessInfo.counts}
          totalConcepts={readinessInfo.counts.total}
        />

        {/* 4.4 CHAPTER BREAKDOWN */}
        <ChapterBars
          course={course}
          progress={progress}
          onSelectChapter={() => onOpenWorldMap()}
        />

        {/* 4.5 REVISE THESE (WEAK AND DUE CONCEPTS) */}
        <ReviseList
          course={course}
          progress={progress}
          onReviseConcept={(concept, chapterId) => onReviseConcept(concept, chapterId)}
          onPlayLevel={(lvl) => onPlayLevel(lvl)}
        />

        {/* 4.6 PERFORMANCE BY GAME AND BY TYPE */}
        <PerformanceCharts stats={stats} />

        {/* 4.7 RECENT ACTIVITY */}
        <ActivityChart />

        {/* 4.8 FOOTER ACTIONS */}
        <FooterActions
          course={course}
          progress={progress}
          onResetProgress={onResetProgress}
          onSeedDemo={onSeedDemoProgress}
          onClearAllProgress={onClearAllProgress}
          isDebugMode={isDebugMode}
        />
      </div>
    );
  } catch (err: any) {
    console.error('DASHBOARD_RENDER_FAILED:', err);
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-2xl border-2 border-red-500/50 bg-[#151222] text-center text-slate-200">
        <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="font-pixel text-sm text-white mb-2">We couldn't load your dashboard.</h2>
        <p className="text-xs font-mono text-slate-400 mb-6">
          Try reloading the page. Your course material and progress remain safe.
        </p>
        <button
          type="button"
          onClick={onBackToCourse}
          className="btn-pixel-gold px-5 py-2.5 rounded-lg text-xs font-bold text-black cursor-pointer"
        >
          Back to course
        </button>
      </div>
    );
  }
};
