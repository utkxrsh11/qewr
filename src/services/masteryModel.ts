/**
 * Mastery and Spaced Repetition Model
 * One shared, pure, well-tested module used by World Map, Course Overview,
 * Dashboard, and Smart Revision (Section 2 of Phase 6).
 */

import {
  ConceptProgress,
  Course,
  MasteryState,
  ReadinessBand,
  ReadinessCounts,
  ReadinessResult,
  StudyQuestProgress,
} from '../types/course.ts';

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
 * Base mastery in [0, 1].
 * If c.answered is 0 return 0. overall = correct / answered.
 * If c.recent has 3 or more entries, return 0.7 * mean(recent) + 0.3 * overall,
 * otherwise return overall.
 */
export function baseMastery(c?: ConceptProgress): number {
  if (!c || !c.answered || c.answered <= 0) return 0;
  const overall = Math.min(1, Math.max(0, (c.correct || 0) / c.answered));
  if (Array.isArray(c.recent) && c.recent.length >= 3) {
    const sumRecent = c.recent.reduce((sum, val) => sum + (val ? 1 : 0), 0);
    const meanRecent = sumRecent / c.recent.length;
    return Math.min(1, Math.max(0, 0.7 * meanRecent + 0.3 * overall));
  }
  return overall;
}

/**
 * Decay factor in [0.6, 1.0].
 * daysSince = whole days since lastPlayed.
 * grace = 3 if baseMastery is at least 0.8, otherwise 1.
 * overdueDays = max(0, daysSince - grace).
 * Return max(0.6, 1 - 0.04 * overdueDays). Never below 0.6.
 */
export function decayFactor(c?: ConceptProgress, now: number = getNow()): number {
  if (!c || !c.answered || c.answered <= 0 || !c.lastPlayed) return 1;
  const lastPlayedTime = new Date(c.lastPlayed).getTime();
  if (isNaN(lastPlayedTime)) return 1;

  const daysSince = Math.max(0, Math.floor((now - lastPlayedTime) / (86400 * 1000)));
  const bMastery = baseMastery(c);
  const grace = bMastery >= 0.8 ? 3 : 1;
  const overdueDaysVal = Math.max(0, daysSince - grace);
  const factor = 1 - 0.04 * overdueDaysVal;
  return Math.min(1, Math.max(0.6, factor));
}

/**
 * Current knowledge strength in [0, 1].
 * baseMastery(c) * decayFactor(c, now). For untouched concepts return 0.
 */
export function strength(c?: ConceptProgress, now: number = getNow()): number {
  if (!c || !c.answered || c.answered <= 0) return 0;
  return Math.min(1, Math.max(0, baseMastery(c) * decayFactor(c, now)));
}

/**
 * Mastery state classification.
 * "untouched" if answered is 0; "mastered" if strength is at least 0.8;
 * "shaky" if at least 0.5; otherwise "weak".
 */
export function stateOf(c?: ConceptProgress, now: number = getNow()): MasteryState {
  if (!c || !c.answered || c.answered <= 0) return 'untouched';
  const s = strength(c, now);
  if (s >= 0.8) return 'mastered';
  if (s >= 0.5) return 'shaky';
  return 'weak';
}

/**
 * Interval days for spaced repetition review:
 * if baseMastery is below 0.5 return 1;
 * below 0.8 return 2;
 * otherwise return min(21, 3 * 2^reviewStreak).
 */
export function intervalDays(c?: ConceptProgress): number {
  const b = baseMastery(c);
  if (b < 0.5) return 1;
  if (b < 0.8) return 2;
  const streak = Math.max(0, c?.reviewStreak || 0);
  return Math.min(21, Math.round(3 * Math.pow(2, streak)));
}

/**
 * Calculates dueAt ISO date string after a session from lastPlayed + intervalDays.
 */
export function calculateNextDueAt(c?: ConceptProgress, lastPlayedIso?: string): string {
  const baseTime = lastPlayedIso ? new Date(lastPlayedIso).getTime() : getNow();
  const validBase = isNaN(baseTime) ? getNow() : baseTime;
  const days = intervalDays(c);
  return new Date(validBase + days * 86400 * 1000).toISOString();
}

/**
 * Checks whether a concept is due for review:
 * answered is greater than 0 AND now is at or after dueAt.
 * (If dueAt is missing from legacy data, computes from lastPlayed + intervalDays).
 */
export function isDue(c?: ConceptProgress, now: number = getNow()): boolean {
  if (!c || !c.answered || c.answered <= 0) return false;
  if (c.dueAt) {
    const dueTime = new Date(c.dueAt).getTime();
    if (!isNaN(dueTime)) {
      return now >= dueTime;
    }
  }
  if (c.lastPlayed) {
    const lpTime = new Date(c.lastPlayed).getTime();
    if (!isNaN(lpTime)) {
      const dueTime = lpTime + intervalDays(c) * 86400 * 1000;
      return now >= dueTime;
    }
  }
  return true;
}

/**
 * Whole days past dueAt (0 if not due).
 */
export function overdueDays(c?: ConceptProgress, now: number = getNow()): number {
  if (!isDue(c, now)) return 0;
  let dueTime = 0;
  if (c?.dueAt) {
    dueTime = new Date(c.dueAt).getTime();
  } else if (c?.lastPlayed) {
    const lp = new Date(c.lastPlayed).getTime();
    if (!isNaN(lp)) {
      dueTime = lp + intervalDays(c) * 86400 * 1000;
    }
  }
  if (!dueTime || isNaN(dueTime) || now < dueTime) return 0;
  return Math.max(0, Math.floor((now - dueTime) / (86400 * 1000)));
}

/**
 * Priority for Smart Revision candidate selection:
 * 0.5 * (1 - strength) + 0.3 * min(1, overdueDays / 7) + 0.2 * (state is "weak" ? 1 : state is "shaky" ? 0.5 : 0).
 * Higher means revise sooner.
 */
export function priority(c?: ConceptProgress, now: number = getNow()): number {
  if (!c || !c.answered || c.answered <= 0) return 0;
  const s = strength(c, now);
  const overdue = overdueDays(c, now);
  const st = stateOf(c, now);
  const stateWeight = st === 'weak' ? 1 : st === 'shaky' ? 0.5 : 0;
  return 0.5 * (1 - s) + 0.3 * Math.min(1, overdue / 7) + 0.2 * stateWeight;
}

/**
 * The main reason text for UI display:
 * "Weak: 1 of 3 correct recently", "Overdue by 4 days", "Shaky: needs another pass", or "Not started".
 */
export function reasonOf(c?: ConceptProgress, now: number = getNow()): string {
  if (!c || !c.answered || c.answered <= 0) return 'Not started';

  const overdue = overdueDays(c, now);
  if (overdue > 0) {
    return `Overdue by ${overdue} day${overdue === 1 ? '' : 's'}`;
  }
  if (isDue(c, now)) {
    return 'Due for review';
  }

  const st = stateOf(c, now);
  if (st === 'weak') {
    if (Array.isArray(c.recent) && c.recent.length > 0) {
      const correctRecent = c.recent.filter((r) => r === 1).length;
      return `Weak: ${correctRecent} of ${c.recent.length} correct recently`;
    }
    return `Weak: ${c.correct} of ${c.answered} correct`;
  }
  if (st === 'shaky') {
    return 'Shaky: needs another pass';
  }
  return 'Mastered';
}

/**
 * Calculates readiness for the course:
 * the mean of strength over ALL concepts of the course (untouched count as 0),
 * as a percentage rounded to a whole number. Also returns coverage and counts per state.
 */
export function readiness(
  course: Course,
  progress: StudyQuestProgress,
  now: number = getNow()
): ReadinessResult {
  if (!course || !course.chapters || course.chapters.length === 0) {
    const emptyCounts: ReadinessCounts = {
      mastered: 0,
      shaky: 0,
      weak: 0,
      untouched: 0,
      total: 0,
      due: 0,
    };
    return { score: 0, coverage: 0, counts: emptyCounts };
  }

  const allConcepts = course.chapters.flatMap((ch) => ch.concepts || []);
  const total = allConcepts.length;
  if (total === 0) {
    const emptyCounts: ReadinessCounts = {
      mastered: 0,
      shaky: 0,
      weak: 0,
      untouched: 0,
      total: 0,
      due: 0,
    };
    return { score: 0, coverage: 0, counts: emptyCounts };
  }

  let totalStrength = 0;
  let playedCount = 0;
  let mastered = 0;
  let shaky = 0;
  let weak = 0;
  let untouched = 0;
  let due = 0;

  allConcepts.forEach((concept) => {
    const p = progress.concepts[concept.id];
    if (p && p.answered > 0) {
      playedCount++;
      const s = strength(p, now);
      totalStrength += s;
      const st = stateOf(p, now);
      if (st === 'mastered') mastered++;
      else if (st === 'shaky') shaky++;
      else if (st === 'weak') weak++;

      if (isDue(p, now)) {
        due++;
      }
    } else {
      untouched++;
    }
  });

  const mean = totalStrength / total;
  const score = Math.min(100, Math.max(0, Math.round(mean * 100)));
  const coverage = total > 0 ? playedCount / total : 0;

  const counts: ReadinessCounts = {
    mastered,
    shaky,
    weak,
    untouched,
    total,
    due,
  };

  return {
    score,
    coverage,
    counts,
  };
}

/**
 * Maps readiness percentage to a status band:
 * below 40 "Just starting", 40 to 69 "Getting there", 70 to 89 "Almost exam ready", 90 and above "Exam ready".
 */
export function readinessBand(pct: number): ReadinessBand {
  if (pct < 40) {
    return {
      label: 'Just starting',
      color: 'red',
      description: 'Focus on untouched concepts and weak areas',
    };
  }
  if (pct < 70) {
    return {
      label: 'Getting there',
      color: 'amber',
      description: 'Good progress, strengthen shaky concepts',
    };
  }
  if (pct < 90) {
    return {
      label: 'Almost exam ready',
      color: 'blue',
      description: 'On track! Keep up daily spaced reviews',
    };
  }
  return {
    label: 'Exam ready',
    color: 'emerald',
    description: 'Excellent mastery across all concepts!',
  };
}
