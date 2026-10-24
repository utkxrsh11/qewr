import React, { useState, useMemo } from 'react';
import { Course, StudyQuestProgress, ExamInfo } from '../../types/course.ts';
import {
  readiness,
  readinessBand,
  stateOf,
  isDue,
  getNow,
} from '../../services/masteryModel.ts';
import { loadStats } from '../../services/statsService.ts';
import {
  loadExamInfo,
  saveExamInfo,
  calculateDailyQuota,
} from '../../services/examService.ts';
import { buildRevisionPlan } from '../../services/revisionPlanner.ts';
import { SummaryCards } from './SummaryCards.tsx';
import { SmartRevisionCard } from './SmartRevisionCard.tsx';
import { ChapterBars } from './ChapterBars.tsx';
import { PerformanceCharts } from './PerformanceCharts.tsx';
import { ActivityChart } from './ActivityChart.tsx';
import { ReviseList } from './ReviseList.tsx';
import { FooterActions } from './FooterActions.tsx';
import { ExamCountdownModal } from './ExamCountdownModal.tsx';
import { ArrowLeft, Compass, Sparkles } from 'lucide-react';

interface DashboardViewProps {
  course: Course;
  progress: StudyQuestProgress;
  onBackToCourse: () => void;
  onOpenWorldMap: () => void;
  onStartSmartRevision: (specificConceptId?: string) => void;
  onResetProgress: () => void;
  onSeedDemoProgress: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  course,
  progress,
  onBackToCourse,
  onOpenWorldMap,
  onStartSmartRevision,
  onResetProgress,
  onSeedDemoProgress,
}) => {
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [examInfo, setExamInfo] = useState<ExamInfo>(() => loadExamInfo());
  const stats = useMemo(() => loadStats(), [progress]);

  const now = getNow();

  // Readiness score and band
  const readinessScore = useMemo(() => readiness(course, progress, now), [course, progress, now]);
  const currentBand = useMemo(() => readinessBand(readinessScore), [readinessScore]);

  // Concept counts
  const counts = useMemo(() => {
    let mastered = 0;
    let shaky = 0;
    let weak = 0;
    let untouched = 0;
    let due = 0;

    (course.chapters || []).forEach((ch) => {
      (ch.concepts || []).forEach((c) => {
        const p = progress.concepts[c.id];
        const st = stateOf(p, now);
        if (st === 'mastered') mastered++;
        else if (st === 'shaky') shaky++;
        else if (st === 'weak') weak++;
        else untouched++;

        if (isDue(p, now)) {
          due++;
        }
      });
    });

    const total = mastered + shaky + weak + untouched;
    return { total, mastered, shaky, weak, untouched, due };
  }, [course, progress, now]);

  // Level statistics
  const totalLevels = useMemo(() => {
    return (course.chapters || []).reduce((acc, ch) => acc + (ch.concepts ? Math.ceil(ch.concepts.length / 2) : 1), 0);
  }, [course]);

  const levelsCompleted = useMemo(() => {
    return Object.values(progress.levels || {}).filter((lvl) => lvl.completed).length;
  }, [progress]);

  // Exam Quota
  const examQuota = useMemo(() => {
    return calculateDailyQuota({
      course,
      progress,
      examDate: examInfo.examDate,
      targetReadiness: examInfo.targetReadiness || 85,
    });
  }, [course, progress, examInfo]);

  // Smart Revision Preview Plan
  const revisionPlan = useMemo(() => {
    return buildRevisionPlan(course, progress);
  }, [course, progress]);

  // Save updated exam target
  const handleSaveExam = (updated: ExamInfo) => {
    saveExamInfo(updated);
    setExamInfo(updated);
    setExamModalOpen(false);
  };

  const isDebugMode = typeof window !== 'undefined' && window.location.search.includes('debug=1');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 w-full animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-pixel text-[11px] text-[#F5C542] tracking-wider uppercase">
              StudyQuest Analytics
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-mono text-slate-400">{course.courseTitle}</span>
          </div>
          <h1 className="font-pixel text-lg sm:text-2xl text-white">
            Exam Readiness Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onOpenWorldMap}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2B355E] bg-[#141A33] hover:bg-[#1D2548] text-slate-300 font-mono text-xs transition-colors cursor-pointer"
          >
            <Compass className="w-4 h-4 text-[#2DD4BF]" />
            <span>World Map</span>
          </button>
          <button
            type="button"
            onClick={onBackToCourse}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2B355E] bg-[#141A33] hover:bg-[#1D2548] text-slate-300 font-mono text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Course Overview</span>
          </button>
        </div>
      </div>

      {/* 1. Summary Cards (Readiness, Breakdown, Due, Exam Quota) */}
      <SummaryCards
        readinessScore={readinessScore}
        readinessBand={currentBand}
        counts={counts}
        totalXp={progress.totalXp}
        levelsCompleted={levelsCompleted}
        totalLevels={totalLevels}
        examQuota={examQuota}
        examInfo={examInfo}
        onOpenExamModal={() => setExamModalOpen(true)}
        onStartRevision={() => onStartSmartRevision()}
      />

      {/* 2. High-Impact Smart Revision Card */}
      <SmartRevisionCard
        plan={revisionPlan}
        dueCount={counts.due}
        onStartRevision={() => onStartSmartRevision()}
      />

      {/* 3. Chapter Mastery Breakdown Bars */}
      <ChapterBars course={course} progress={progress} />

      {/* 4. Accuracy by Game & Concept Type Charts */}
      <PerformanceCharts stats={stats} />

      {/* 5. 14-Day Study Activity Chart */}
      <ActivityChart />

      {/* 6. Ranked Concept Revision Queue (Table & Card toggle) */}
      <ReviseList
        course={course}
        progress={progress}
        onReviseConcept={(conceptId) => onStartSmartRevision(conceptId)}
      />

      {/* 7. Footer Actions (Export JSON, Reset, Debug Seed) */}
      <FooterActions
        onResetProgress={onResetProgress}
        onSeedDemo={onSeedDemoProgress}
        isDebugMode={isDebugMode}
      />

      {/* Exam Target Planner Modal */}
      {examModalOpen && (
        <ExamCountdownModal
          currentInfo={examInfo}
          onSave={handleSaveExam}
          onClose={() => setExamModalOpen(false)}
        />
      )}
    </div>
  );
};
