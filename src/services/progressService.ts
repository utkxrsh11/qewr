/**
 * Progress Service
 * Tracks XP, level star records, and concept mastery stats in localStorage.
 * Enhanced in Phase 6 with spaced repetition tracking, revision sessions,
 * strength deltas, and stats/activity integration.
 */

import {
  StudyQuestProgress,
  LevelResult,
  GameChoice,
  ConceptProgress,
  StrengthDelta,
  Course,
  ConceptType,
} from '../types/course.ts';
import { recordAnswer } from './masteryStore.ts';
import { intervalDays, strength, getNow, calculateNextDueAt, readiness } from './masteryModel.ts';
import {
  recordSessionStatsAndActivity,
  saveStats,
  saveActivity,
  clearStatsAndActivity,
  getIsoDateKey,
} from './statsService.ts';
import { clearExamInfo } from './examService.ts';

const PROGRESS_STORAGE_KEY = 'studyquest_progress';
const BANNER_DISMISSED_KEY = 'studyquest_banner_dismissed';
const REVISION_SIZE_KEY = 'studyquest_revision_size';

const DEFAULT_PROGRESS: StudyQuestProgress = {
  totalXp: 0,
  levels: {},
  concepts: {},
};

export function loadProgress(): StudyQuestProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    return {
      totalXp: Number(parsed.totalXp) || 0,
      levels: parsed.levels || {},
      concepts: parsed.concepts || {},
    };
  } catch (err) {
    console.warn('Failed to load studyquest_progress:', err);
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: StudyQuestProgress): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn('Failed to save studyquest_progress:', err);
  }
}

/**
 * Clears progress, stats, activity, exam date, and banner dismissal.
 * Keeps the course and cached challenge content intact per Section 4.8 and 8.
 */
export function clearProgress(): void {
  try {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
    localStorage.removeItem(BANNER_DISMISSED_KEY);
    localStorage.removeItem(REVISION_SIZE_KEY);
    clearStatsAndActivity();
    clearExamInfo();
  } catch (err) {
    console.warn('Failed to clear studyquest_progress:', err);
  }
}

/**
 * Calculates XP earned from a level result:
 * - Revision session: 10 XP per first-try-correct item + 20 XP completion bonus when session accuracy >= 40%.
 * - Standard level: 10 XP per correct answer, + 50 XP bonus for >= 1 star, + 20 XP bonus for 3 stars.
 * - Practice mode: 0 XP.
 */
export function calculateXpEarned(result: {
  practiceMode: boolean;
  correctCount: number;
  stars: number;
  isRevision?: boolean;
  accuracyPercent?: number;
}): number {
  if (result.practiceMode) return 0;

  if (result.isRevision) {
    // Phase 6 Section 6: 10 XP per item + 20 XP completion bonus when session accuracy >= 40%
    const acc = result.accuracyPercent ?? (result.stars >= 1 ? 50 : 0);
    const bonus = acc >= 40 ? 20 : 0;
    return result.correctCount * 10 + bonus;
  }

  let xp = result.correctCount * 10;
  if (result.stars >= 1) {
    xp += 50;
  }
  if (result.stars === 3) {
    xp += 20;
  }
  return xp;
}

/**
 * Calculates stars earned (0 to 3):
 * 3 stars: 90% or more correct
 * 2 stars: 70% to 89%
 * 1 star: 40% to 69%
 * 0 stars: below 40% or out of lives
 */
export function calculateStars(
  accuracyPercent: number,
  status: 'completed' | 'out_of_lives'
): number {
  if (status === 'out_of_lives' || accuracyPercent < 40) {
    return 0;
  }
  if (accuracyPercent >= 90) {
    return 3;
  }
  if (accuracyPercent >= 70) {
    return 2;
  }
  return 1;
}

/**
 * Updates progress with a completed level or revision result and persists to localStorage.
 * Practice mode saves nothing.
 */
export function recordLevelResult(
  result: LevelResult,
  course?: Course
): StudyQuestProgress {
  const current = loadProgress();

  if (result.practiceMode) {
    return current;
  }

  const nowMs = getNow();
  const nowIso = new Date(nowMs).toISOString();
  const xp = result.xpEarned;
  current.totalXp = Math.max(0, current.totalXp + xp);

  const isRevisionSession = Boolean(result.isRevision || result.level?.isRevision);

  // Compute course readiness before session if course is available
  let readinessBefore = 0;
  if (course && isRevisionSession) {
    readinessBefore = readiness(course, current, nowMs).score;
  }

  // Update curriculum level progress (only for regular curriculum levels)
  if (
    !isRevisionSession &&
    !result.levelId.startsWith('rev-') &&
    !result.levelId.startsWith('practice-')
  ) {
    const existingLevel = current.levels[result.levelId] || {
      bestStars: 0,
      bestScore: 0,
      attempts: 0,
      lastPlayed: nowIso,
      completed: false,
    };

    current.levels[result.levelId] = {
      bestStars: Math.max(existingLevel.bestStars, result.stars),
      bestScore: Math.max(existingLevel.bestScore, result.score),
      attempts: existingLevel.attempts + 1,
      lastPlayed: nowIso,
      completed: existingLevel.completed || result.stars >= 1,
    };
  }

  // Pre-calculate before strengths for revision delta reporting
  const beforeStrengths = new Map<string, number>();
  if (isRevisionSession) {
    (result.level?.concepts || []).forEach((c) => {
      beforeStrengths.set(c.id, strength(current.concepts[c.id], nowMs));
    });
  }

  // Group session answers by conceptId
  const sessionConceptAnswers = new Map<string, boolean[]>();
  result.answers.forEach((ans: any) => {
    const list = sessionConceptAnswers.get(ans.conceptId) || [];
    list.push(Boolean(ans.correct));
    sessionConceptAnswers.set(ans.conceptId, list);
  });

  // Track concept types map for stats recording
  const conceptTypesMap: Record<string, ConceptType> = {};
  (result.level?.concepts || []).forEach((c) => {
    conceptTypesMap[c.id] = c.type;
  });

  // Update each concept in progress
  sessionConceptAnswers.forEach((answersList, conceptId) => {
    const existing = current.concepts[conceptId] || {
      answered: 0,
      correct: 0,
      lastResult: 'wrong',
      lastPlayed: nowIso,
    };

    const sessionCorrect = answersList.filter(Boolean).length;
    const sessionTotal = answersList.length;
    const sessionAccuracy = sessionTotal > 0 ? sessionCorrect / sessionTotal : 0;

    // Push this session's first-try results, keep the last 6
    const existingRecent = Array.isArray(existing.recent) ? [...existing.recent] : [];
    answersList.forEach((isCorrect) => {
      existingRecent.push(isCorrect ? 1 : 0);
    });
    const recent = existingRecent.slice(-6);

    // Section 2.3: session accuracy for that concept at least 80% = +1, otherwise 0
    let reviewStreak = existing.reviewStreak || 0;
    if (sessionAccuracy >= 0.8) {
      reviewStreak += 1;
    } else {
      reviewStreak = 0;
    }

    // Identify last game played
    const lastAnswerForConcept = [...result.answers]
      .reverse()
      .find((a: any) => a.conceptId === conceptId);
    const gameId: GameChoice = lastAnswerForConcept?.gameId || result.gameId || 'runner';
    const existingGames = Array.isArray(existing.gamesPlayed) ? existing.gamesPlayed : [];
    const gamesPlayed = Array.from(new Set([...existingGames, gameId]));

    const tempConcept: ConceptProgress = {
      ...existing,
      answered: (existing.answered || 0) + sessionTotal,
      correct: (existing.correct || 0) + sessionCorrect,
      recent,
      reviewStreak,
      lastPlayed: nowIso,
    };

    // dueAt after a session = lastPlayed + intervalDays
    const dueAt = calculateNextDueAt(tempConcept, nowIso);
    const revisions = (existing.revisions || 0) + (isRevisionSession ? 1 : 0);

    current.concepts[conceptId] = {
      ...tempConcept,
      lastResult: answersList[answersList.length - 1] ? 'correct' : 'wrong',
      lastGame: gameId,
      gamesPlayed,
      dueAt,
      revisions,
    };

    // Update centralized mastery store for legacy/World Map compatibility
    try {
      answersList.forEach((isCorrect) => {
        recordAnswer(conceptId, isCorrect, {
          wasFirstTry: isCorrect,
        });
      });
    } catch (mErr) {
      console.warn('[ProgressService] Failed to record mastery answer:', mErr);
    }
  });

  // Calculate strength deltas for revision results
  if (isRevisionSession) {
    const strengthChanges: StrengthDelta[] = [];
    (result.level?.concepts || []).forEach((c) => {
      const before = beforeStrengths.get(c.id) || 0;
      const updatedConcept = current.concepts[c.id];
      const after = strength(updatedConcept, nowMs);
      strengthChanges.push({
        conceptId: c.id,
        conceptName: c.name,
        before,
        after,
        delta: after - before,
        nextDueAt: updatedConcept?.dueAt || nowIso,
      });
    });
    result.strengthChanges = strengthChanges;

    // Attach overall course readiness before and after
    if (course) {
      const readinessAfter = readiness(course, current, nowMs).score;
      (result as any).readinessBefore = readinessBefore;
      (result as any).readinessAfter = readinessAfter;
    }
  }

  // Record stats and activity
  try {
    recordSessionStatsAndActivity({
      answers: result.answers,
      conceptTypesMap,
      xpEarned: xp,
    });
  } catch (sErr) {
    console.warn('[ProgressService] Failed to record session stats/activity:', sErr);
  }

  try {
    saveProgress(current);
  } catch (err) {
    console.warn('[ProgressService] Failed to write progress to storage:', err);
  }

  return current;
}

/**
 * Downloads studyquest-report.json with course title, date, readiness, coverage,
 * per-chapter counts, per-concept strength and state, and stats (Section 4.8).
 */
export function downloadProgressReport(course: Course, progress: StudyQuestProgress): void {
  try {
    const nowMs = getNow();
    const readinessInfo = readiness(course, progress, nowMs);

    const chaptersReport = (course.chapters || []).map((ch) => {
      const conceptsReport = (ch.concepts || []).map((c) => {
        const p = progress.concepts[c.id];
        return {
          id: c.id,
          name: c.name,
          type: c.type,
          page: c.page,
          answered: p?.answered || 0,
          correct: p?.correct || 0,
          strength: Math.round(strength(p, nowMs) * 100) / 100,
          state: (p?.answered || 0) > 0 ? (strength(p, nowMs) >= 0.8 ? 'mastered' : strength(p, nowMs) >= 0.5 ? 'shaky' : 'weak') : 'untouched',
          reviewStreak: p?.reviewStreak || 0,
          dueAt: p?.dueAt || null,
        };
      });

      return {
        chapterId: ch.id,
        title: ch.title,
        pageRange: `${ch.pageStart}-${ch.pageEnd}`,
        concepts: conceptsReport,
      };
    });

    const report = {
      courseTitle: course.courseTitle,
      sourceName: course.sourceName,
      generatedAt: new Date().toISOString(),
      readiness: readinessInfo.score,
      coverage: Math.round(readinessInfo.coverage * 100),
      counts: readinessInfo.counts,
      totalXp: progress.totalXp,
      chapters: chaptersReport,
    };

    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studyquest-report.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export progress report JSON:', err);
  }
}

/**
 * Seeds rich demo progress for testing and showcasing Phase 6 features.
 * Accessible when ?debug=1 is in URL.
 */
export function seedDemoProgress(course: Course): StudyQuestProgress {
  const now = Date.now();
  const demo: StudyQuestProgress = {
    totalXp: 1450,
    levels: {
      'ch1-L1': {
        bestStars: 3,
        bestScore: 240,
        attempts: 2,
        lastPlayed: new Date(now - 4 * 86400000).toISOString(),
        completed: true,
      },
      'ch1-L2': {
        bestStars: 2,
        bestScore: 180,
        attempts: 1,
        lastPlayed: new Date(now - 3 * 86400000).toISOString(),
        completed: true,
      },
      'ch2-L1': {
        bestStars: 2,
        bestScore: 190,
        attempts: 1,
        lastPlayed: new Date(now - 1 * 86400000).toISOString(),
        completed: true,
      },
    },
    concepts: {},
  };

  const allConcepts = course.chapters.flatMap((ch) => ch.concepts || []);
  allConcepts.forEach((concept, idx) => {
    if (idx === 0) {
      // Concept 1: Mastered & review due soon
      demo.concepts[concept.id] = {
        answered: 8,
        correct: 8,
        lastResult: 'correct',
        lastPlayed: new Date(now - 2 * 86400000).toISOString(),
        lastGame: 'runner',
        gamesPlayed: ['runner', 'platformer'],
        recent: [1, 1, 1, 1, 1, 1],
        reviewStreak: 3,
        dueAt: new Date(now + 5 * 86400000).toISOString(),
        revisions: 2,
      };
    } else if (idx === 1) {
      // Concept 2: Due for review today (overdue by 1 day)
      demo.concepts[concept.id] = {
        answered: 6,
        correct: 5,
        lastResult: 'correct',
        lastPlayed: new Date(now - 5 * 86400000).toISOString(),
        lastGame: 'lieHunter',
        gamesPlayed: ['lieHunter'],
        recent: [1, 0, 1, 1, 1, 1],
        reviewStreak: 1,
        dueAt: new Date(now - 1 * 86400000).toISOString(), // overdue!
        revisions: 1,
      };
    } else if (idx === 2) {
      // Concept 3: Weak / low accuracy & overdue
      demo.concepts[concept.id] = {
        answered: 5,
        correct: 2,
        lastResult: 'wrong',
        lastPlayed: new Date(now - 3 * 86400000).toISOString(),
        lastGame: 'platformer',
        gamesPlayed: ['platformer'],
        recent: [0, 1, 0, 0, 1],
        reviewStreak: 0,
        dueAt: new Date(now - 2 * 86400000).toISOString(), // overdue!
        revisions: 1,
      };
    } else if (idx === 3) {
      // Concept 4: Shaky
      demo.concepts[concept.id] = {
        answered: 4,
        correct: 3,
        lastResult: 'correct',
        lastPlayed: new Date(now - 1 * 86400000).toISOString(),
        lastGame: 'runner',
        gamesPlayed: ['runner'],
        recent: [1, 0, 1, 1],
        reviewStreak: 1,
        dueAt: new Date(now + 2 * 86400000).toISOString(),
        revisions: 0,
      };
    }
    // Remaining concepts remain untouched
  });

  saveProgress(demo);

  // Seed stats
  saveStats({
    games: {
      runner: { answered: 14, correct: 12 },
      lieHunter: { answered: 8, correct: 6 },
      platformer: { answered: 6, correct: 4 },
    },
    types: {
      fact: { answered: 12, correct: 10 },
      process: { answered: 10, correct: 7 },
      detail: { answered: 6, correct: 5 },
    },
    lastUpdated: new Date().toISOString(),
  });

  // Seed 14 days activity with a 5-day streak
  const activityDays: Record<string, any> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = getIsoDateKey(d);
    // 5-day streak: days 0, 1, 2, 3, 4 are active
    const inStreak = i <= 4;
    const active = inStreak || i === 7 || i === 9 || i === 11;
    activityDays[key] = {
      date: key,
      answered: active ? 4 + (i % 3) * 2 : 0,
      correct: active ? 3 + (i % 2) * 2 : 0,
      xp: active ? 50 + (i % 3) * 30 : 0,
      sessions: active ? 1 + (i % 2) : 0,
    };
  }
  saveActivity({ days: activityDays });

  return demo;
}
