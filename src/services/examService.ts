/**
 * Exam Service
 * Manages optional exam target date and daily concept quota in localStorage (Phase 6).
 */

import { ExamInfo, Course, StudyQuestProgress } from '../types/course.ts';
import { stateOf, getNow } from './masteryModel.ts';

const EXAM_KEY = 'studyquest_exam';

export function loadExamInfo(): ExamInfo {
  try {
    const raw = localStorage.getItem(EXAM_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const dateStr = parsed.date || parsed.examDate;
    if (dateStr && isValidDateString(dateStr)) {
      return {
        date: dateStr,
        examDate: dateStr,
        targetReadiness: parsed.targetReadiness,
      };
    }
    return {};
  } catch (err) {
    console.warn('[ExamService] Failed to load exam info:', err);
    return {};
  }
}

export function saveExamInfo(info: ExamInfo): void {
  try {
    const dateStr = info.date || info.examDate;
    if (dateStr && isValidDateString(dateStr)) {
      localStorage.setItem(EXAM_KEY, JSON.stringify({ date: dateStr }));
    } else {
      localStorage.removeItem(EXAM_KEY);
    }
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

export function isValidDateString(dateStr?: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  // Match YYYY-MM-DD format
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return false;
  const dateObj = new Date(y, m - 1, d);
  return (
    dateObj.getFullYear() === y &&
    dateObj.getMonth() === m - 1 &&
    dateObj.getDate() === d
  );
}

/**
 * Returns whole calendar days left until exam.
 * Returns null if no exam date.
 * 0 if today. Negative if past.
 */
export function getDaysUntilExam(dateStr?: string): number | null {
  if (!dateStr || !isValidDateString(dateStr)) return null;

  const parts = dateStr.split('-');
  const examYear = parseInt(parts[0], 10);
  const examMonth = parseInt(parts[1], 10) - 1;
  const examDay = parseInt(parts[2], 10);

  const examDate = new Date(examYear, examMonth, examDay);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  examDate.setHours(0, 0, 0, 0);

  const diffMs = examDate.getTime() - today.getTime();
  return Math.round(diffMs / (86400 * 1000));
}

/**
 * Calculates daily concept target quota:
 * X = ceil((untouched + weak + shaky concepts) / daysLeft).
 */
export function calculateDailyQuota(
  course: Course,
  progress: StudyQuestProgress,
  examDateStr?: string
): {
  daysLeft: number | null;
  dailyQuota: number;
  status: 'future' | 'today' | 'past' | 'none';
  remainingConcepts: number;
} {
  const daysLeft = getDaysUntilExam(examDateStr);
  if (daysLeft === null) {
    return { daysLeft: null, dailyQuota: 0, status: 'none', remainingConcepts: 0 };
  }

  const now = getNow();
  let remainingConcepts = 0;
  (course.chapters || []).forEach((ch) => {
    (ch.concepts || []).forEach((c) => {
      const p = progress.concepts[c.id];
      const st = stateOf(p, now);
      if (st === 'untouched' || st === 'weak' || st === 'shaky') {
        remainingConcepts++;
      }
    });
  });

  if (daysLeft < 0) {
    return { daysLeft, dailyQuota: 0, status: 'past', remainingConcepts };
  }
  if (daysLeft === 0) {
    return { daysLeft: 0, dailyQuota: remainingConcepts, status: 'today', remainingConcepts };
  }

  const dailyQuota = Math.ceil(remainingConcepts / daysLeft);
  return {
    daysLeft,
    dailyQuota,
    status: 'future',
    remainingConcepts,
  };
}
