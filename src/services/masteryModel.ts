/**
 * Mastery and Spaced Repetition Model
 * One shared, pure, well-tested module used by World Map, Course Overview,
 * Dashboard, and Smart Revision.
 */

import { ConceptProgress, Course, MasteryState, ReadinessBand, StudyQuestProgress } from '../types/course.ts';

let mockNow: number | null = null;

/**
 * Returns current timestamp in ms. Supports deterministic testing / simulation.
 */
export function getNow(): number {
  return mockNow !== null ? mockNow : Date.now();
}

export function setMockNow(time: number | null): void {
  mockNow = time;
}

/**
 * Calculates base mastery in [0, 1].
 * Combines overall accuracy and the mean of the last up to 6 answers (weight 0.7 recent, 0.3 overall).
 */
export function baseMastery(c?: ConceptProgress): number {
  if (!c || !c.answered || c.answered <= 0) return 0;
  const overall = Math.min(1, Math.max(0, (c.correct || 0) / c.answered));
  if (c.recent && c.recent.length >= 3) {
    const sumRecent = c.recent.reduce((sum, val) => sum + val, 0);
    const meanRecent = sumRecent / c.recent.length;
    return Math.min(1, Math.max(0, 0.7 * meanRecent + 0.3 * overall));
  }
  return overall;
}

/**
 * Calculates decay factor in [0.2, 1.0] based on time elapsed since last played
 * and the concept's consecutive review streak.
 * Half-life increases as review streak grows: 7 * (1 + reviewStreak) days.
 */
export function decayFactor(c?: ConceptProgress, now: number = getNow()): number {
  if (!c || !c.answered || !c.lastPlayed) return 1;
  const streak = Math.max(0, c.reviewStreak || 0);
  const halfLifeDays = 7 * (1 + streak);
  const lastPlayedTime = new Date(c.lastPlayed).getTime();
  if (isNaN(lastPlayedTime)) return 1;

  const daysSince = Math.max(0, (now - lastPlayedTime) / (86400 * 1000));
  const decay = Math.pow(0.5, daysSince / halfLifeDays);
  // Floor decay at 0.2 so knowledge never completely vanishes
  return Math.min(1, Math.max(0.2, decay));
}

/**
 * Current knowledge strength in [0, 1].
 */
export function strength(c?: ConceptProgress, now: number = getNow()): number {
  if (!c || !c.answered || c.answered <= 0) return 0;
  return Math.min(1, Math.max(0, baseMastery(c) * decayFactor(c, now)));
}

/**
 * Mastery state classification.
 */
export function stateOf(c?: ConceptProgress, now: number = getNow()): MasteryState {
  if (!c || !c.answered || c.answered <= 0) return 'untouched';
  const s = strength(c, now);
  if (s >= 0.8) return 'mastered';
  if (s >= 0.5) return 'shaky';
  return 'weak';
}

/**
 * Spaced repetition interval (in days) based on consecutive successful review streak.
 */
export function intervalDays(c?: ConceptProgress): number {
  const streak = Math.max(0, c?.reviewStreak || 0);
  if (streak <= 0) return 1;
  if (streak === 1) return 3;
  if (streak === 2) return 7;
  if (streak === 3) return 14;
  return 30;
}

/**
 * Checks whether a concept is due for spaced repetition review.
 */
export function isDue(c?: ConceptProgress, now: number = getNow()): boolean {
  if (!c || !c.answered || c.answered <= 0) return false;
  if (!c.dueAt) return true; // practiced before Phase 6 without due date: due now
  const dueTime = new Date(c.dueAt).getTime();
  if (isNaN(dueTime)) return true;
  return dueTime <= now;
}

/**
 * Days overdue (0 if not due).
 */
export function overdueDays(c?: ConceptProgress, now: number = getNow()): number {
  if (!isDue(c, now) || !c?.dueAt) return 0;
  const dueTime = new Date(c.dueAt).getTime();
  if (isNaN(dueTime)) return 0;
  return Math.max(0, (now - dueTime) / (86400 * 1000));
}

/**
 * Priority scoring for Smart Revision candidate selection:
 * - Untouched concepts: 100 (ready for initial learning)
 * - Due / overdue concepts: 200 + (1 - strength) * 100 + min(overdueDays, 14) * 5 (highest urgency)
 * - Fresh concepts (not due): (1 - strength) * 50 (lower priority)
 */
export function priority(c?: ConceptProgress, now: number = getNow()): number {
  if (!c || !c.answered || c.answered <= 0) return 100;
  const s = strength(c, now);
  if (isDue(c, now)) {
    const overdue = overdueDays(c, now);
    return 200 + (1 - s) * 100 + Math.min(overdue, 14) * 5;
  }
  return (1 - s) * 50;
}

/**
 * Human-readable revision reason for UI display.
 */
export function reasonOf(c?: ConceptProgress, now: number = getNow()): string {
  if (!c || !c.answered || c.answered <= 0) return 'Untouched';
  if (isDue(c, now)) {
    const days = Math.floor(overdueDays(c, now));
    return days > 0 ? `Due (${days}d overdue)` : 'Due for review';
  }
  const st = stateOf(c, now);
  if (st === 'weak') return 'Low accuracy';
  if (st === 'shaky') return 'Needs practice';
  return 'Mastered';
}

/**
 * Calculates overall exam readiness score (0–100%) for the course.
 * Untouched concepts count as 0 strength.
 */
export function readiness(course: Course, progress: StudyQuestProgress, now: number = getNow()): number {
  if (!course || !course.chapters || course.chapters.length === 0) return 0;
  const allConcepts = course.chapters.flatMap((ch) => ch.concepts || []);
  if (allConcepts.length === 0) return 0;

  const totalStrength = allConcepts.reduce((acc, concept) => {
    const p = progress.concepts[concept.id];
    return acc + strength(p, now);
  }, 0);

  const mean = totalStrength / allConcepts.length;
  return Math.min(100, Math.max(0, Math.round(mean * 100)));
}

/**
 * Maps readiness percentage to a status band.
 */
export function readinessBand(readinessScore: number): ReadinessBand {
  if (readinessScore < 40) {
    return {
      label: 'Not ready',
      color: 'red',
      description: 'Focus on untouched concepts and weak areas',
    };
  }
  if (readinessScore < 70) {
    return {
      label: 'In progress',
      color: 'amber',
      description: 'Good progress, strengthen shaky concepts',
    };
  }
  if (readinessScore < 85) {
    return {
      label: 'Looking good',
      color: 'blue',
      description: 'On track! Keep up daily spaced reviews',
    };
  }
  return {
    label: 'Exam ready!',
    color: 'emerald',
    description: 'Excellent mastery across all concepts',
  };
}
