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
import { intervalDays, strength, getNow } from './masteryModel.ts';
import { recordSessionStatsAndActivity, saveStats, saveActivity, clearStatsAndActivity, getIsoDateKey } from './statsService.ts';

const PROGRESS_STORAGE_KEY = 'studyquest_progress';

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

export function clearProgress(): void {
  try {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
    clearStatsAndActivity();
  } catch (err) {
    console.warn('Failed to clear studyquest_progress:', err);
  }
}

/**
 * Calculates XP earned from a level result:
 * - Revision session: 10 XP per correct answer + 30 XP completion bonus.
 * - Standard level: 10 XP per correct answer, + 50 XP bonus for >= 1 star, + 20 XP bonus for 3 stars.
 * - Practice mode: 0 XP.
 */
export function calculateXpEarned(result: {
  practiceMode: boolean;
  correctCount: number;
  stars: number;
  isRevision?: boolean;
}): number {
  if (result.practiceMode) return 0;

  if (result.isRevision) {
    return result.correctCount * 10 + 30;
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
export function calculateStars(accuracyPercent: number, status: 'completed' | 'out_of_lives'): number {
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
 * Updates progress with a completed level result and persists to localStorage.
 */
export function recordLevelResult(result: LevelResult): StudyQuestProgress {
  const current = loadProgress();

  if (result.practiceMode) {
    return current;
  }

  const nowMs = getNow();
  const nowIso = new Date(nowMs).toISOString();
  const xp = result.xpEarned;
  current.totalXp = Math.max(0, current.totalXp + xp);

  const isRevisionSession = Boolean(result.isRevision || result.level?.isRevision);

  // Update level progress (only for regular curriculum levels, not revision virtual levels)
  if (!isRevisionSession && !result.levelId.startsWith('rev-') && !result.levelId.startsWith('practice-')) {
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

  // Group session answers by conceptId to compute session concept accuracy
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

    // Update recent 6 answers array (1 for correct, 0 for wrong)
    const existingRecent = Array.isArray(existing.recent) ? [...existing.recent] : [];
    answersList.forEach((isCorrect) => {
      existingRecent.push(isCorrect ? 1 : 0);
    });
    const recent = existingRecent.slice(-6);

    // Update reviewStreak: >= 80% increments streak, < 80% resets to 0
    let reviewStreak = existing.reviewStreak || 0;
    if (sessionAccuracy >= 0.8) {
      reviewStreak += 1;
    } else {
      reviewStreak = 0;
    }

    // Calculate dueAt date from intervalDays
    const nextIntervalDays = intervalDays({ ...existing, reviewStreak });
    const nextDueMs = nowMs + nextIntervalDays * 86400 * 1000;
    const dueAt = new Date(nextDueMs).toISOString();

    const revisions = (existing.revisions || 0) + (isRevisionSession ? 1 : 0);

    // Identify last game played for this concept in this session
    const lastAnswerForConcept = [...result.answers].reverse().find((a: any) => a.conceptId === conceptId);
    const gameId: GameChoice = lastAnswerForConcept?.gameId || result.gameId || 'runner';
    const existingGames = Array.isArray(existing.gamesPlayed) ? existing.gamesPlayed : [];
    const gamesPlayed = Array.from(new Set([...existingGames, gameId]));

    current.concepts[conceptId] = {
      ...existing,
      answered: (existing.answered || 0) + sessionTotal,
      correct: (existing.correct || 0) + sessionCorrect,
      lastResult: answersList[answersList.length - 1] ? 'correct' : 'wrong',
      lastPlayed: nowIso,
      lastGame: gameId,
      gamesPlayed,
      recent,
      reviewStreak,
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
 * Exports all progress as a downloadable JSON blob.
 */
export function exportProgressJson(): void {
  try {
    const progress = loadProgress();
    const jsonStr = JSON.stringify(progress, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyquest-progress-${getIsoDateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export progress JSON:', err);
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
    byGame: {
      runner: { played: 14, correct: 12, totalItems: 14 },
      lieHunter: { played: 8, correct: 6, totalItems: 8 },
      platformer: { played: 6, correct: 4, totalItems: 6 },
    },
    byType: {
      fact: { played: 12, correct: 10, totalItems: 12 },
      process: { played: 10, correct: 7, totalItems: 10 },
      detail: { played: 6, correct: 5, totalItems: 6 },
    },
    lastUpdated: new Date().toISOString(),
  });

  // Seed 14 days activity
  const activityHistory: Record<string, any> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = getIsoDateKey(d);
    // Alternate some active and lighter days
    const active = i % 2 === 0 || i === 1 || i === 0;
    activityHistory[key] = {
      date: key,
      itemsAnswered: active ? 4 + (i % 5) * 2 : 0,
      correctCount: active ? 3 + (i % 4) * 2 : 0,
      xpEarned: active ? 60 + (i % 3) * 40 : 0,
      sessionsCount: active ? 1 + (i % 2) : 0,
    };
  }
  saveActivity({ history: activityHistory });

  return demo;
}
