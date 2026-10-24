/**
 * Progress Service
 * Tracks XP, level star records, and concept mastery stats in localStorage.
 */

import { StudyQuestProgress, LevelResult } from '../types/course.ts';

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
  } catch (err) {
    console.warn('Failed to clear studyquest_progress:', err);
  }
}

/**
 * Calculates XP earned from a level result:
 * 10 XP per correct answer, + 50 XP bonus for >= 1 star, + 20 XP bonus for 3 stars.
 * 0 XP in practice mode.
 */
export function calculateXpEarned(result: {
  practiceMode: boolean;
  correctCount: number;
  stars: number;
}): number {
  if (result.practiceMode) return 0;
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
    // Practice mode does not update XP, stars, or progress per specification
    return current;
  }

  const nowIso = new Date().toISOString();
  const xp = result.xpEarned;
  current.totalXp = Math.max(0, current.totalXp + xp);

  // Update level progress
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

  // Update concept stats
  result.answers.forEach((ans: any) => {
    const existingConcept = current.concepts[ans.conceptId] || {
      answered: 0,
      correct: 0,
      lastResult: ans.correct ? 'correct' : 'wrong',
      lastPlayed: nowIso,
    };

    const gameId: 'runner' | 'lieHunter' = ans.gameId || result.gameId || 'runner';
    const existingGames = Array.isArray(existingConcept.gamesPlayed) ? existingConcept.gamesPlayed : [];
    const gamesPlayed = Array.from(new Set([...existingGames, gameId]));

    current.concepts[ans.conceptId] = {
      ...existingConcept,
      answered: (existingConcept.answered || 0) + 1,
      correct: (existingConcept.correct || 0) + (ans.correct ? 1 : 0),
      lastResult: ans.correct ? 'correct' : 'wrong',
      lastPlayed: nowIso,
      lastGame: gameId,
      gamesPlayed,
    };
  });

  try {
    saveProgress(current);
  } catch (err) {
    console.warn('[ProgressService] Failed to write progress to storage:', err);
  }

  return current;
}

