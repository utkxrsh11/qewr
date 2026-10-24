/**
 * Exam Service
 * Manages exam target date, days remaining, and daily concept quota in localStorage.
 */

import { ExamInfo, Course, StudyQuestProgress } from '../types/course.ts';
import { isDue, strength } from './masteryModel.ts';

const EXAM_KEY = 'studyquest_exam';

const DEFAULT_EXAM_INFO: ExamInfo = {
  examDate: undefined,
  targetReadiness: 85,
};

export function loadExamInfo(): ExamInfo {
  try {
    const raw = localStorage.getItem(EXAM_KEY);
    if (!raw) return { ...DEFAULT_EXAM_INFO };
    const parsed = JSON.parse(raw);
    return {
      examDate: parsed.examDate || undefined,
      targetReadiness: Number(parsed.targetReadiness) || 85,
    };
  } catch (err) {
    console.warn('[ExamService] Failed to load exam info:', err);
    return { ...DEFAULT_EXAM_INFO };
  }
}

export function saveExamInfo(info: ExamInfo): void {
  try {
    localStorage.setItem(EXAM_KEY, JSON.stringify(info));
  } catch (err) {
    console.warn('[ExamService] Failed to save exam info:', err);
  }
}

export function clearExamInfo(): void {
  try {
    localStorage.removeItem(EXAM_KEY);
  } catch (err) {
    console.warn('[ExamService] Failed to clear exam info:', err);
  }
}

/**
 * Returns number of calendar days left until exam.
 * Returns null if no exam date is set.
 * Returns negative number if exam date is in the past.
 */
export function getDaysUntilExam(examDateStr?: string): number | null {
  if (!examDateStr) return null;
  const examDate = new Date(examDateStr);
  if (isNaN(examDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  examDate.setHours(0, 0, 0, 0);

  const diffMs = examDate.getTime() - today.getTime();
  return Math.round(diffMs / (86400 * 1000));
}

/**
 * Calculates recommended daily revision quota to achieve target readiness before the exam date.
 */
export function calculateDailyQuota({
  course,
  progress,
  examDate,
  targetReadiness = 85,
}: {
  course: Course;
  progress: StudyQuestProgress;
  examDate?: string;
  targetReadiness?: number;
}): {
  daysLeft: number | null;
  conceptsNeedingWork: number;
  dailyQuota: number;
  status: 'no_exam' | 'on_track' | 'urgent' | 'passed';
} {
  const daysLeft = getDaysUntilExam(examDate);
  const allConcepts = course.chapters.flatMap((c) => c.concepts || []);

  // Concepts needing review or practice (strength < 0.8 or due)
  const conceptsNeedingWork = allConcepts.filter((concept) => {
    const p = progress.concepts[concept.id];
    if (!p || p.answered === 0) return true; // untouched
    if (isDue(p)) return true;
    if (strength(p) < (targetReadiness / 100)) return true;
    return false;
  }).length;

  if (daysLeft === null) {
    return {
      daysLeft: null,
      conceptsNeedingWork,
      dailyQuota: Math.min(conceptsNeedingWork, 5),
      status: 'no_exam',
    };
  }

  if (daysLeft < 0) {
    return {
      daysLeft,
      conceptsNeedingWork,
      dailyQuota: conceptsNeedingWork,
      status: 'passed',
    };
  }

  if (daysLeft === 0) {
    return {
      daysLeft: 0,
      conceptsNeedingWork,
      dailyQuota: conceptsNeedingWork,
      status: 'urgent',
    };
  }

  const quota = Math.max(1, Math.ceil(conceptsNeedingWork / daysLeft));
  return {
    daysLeft,
    conceptsNeedingWork,
    dailyQuota: quota,
    status: quota > 10 ? 'urgent' : 'on_track',
  };
}
