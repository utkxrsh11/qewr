/**
 * Stats and Activity Service
 * Manages game/type breakdown statistics and daily activity history in localStorage.
 */

import {
  StudyQuestStats,
  StudyQuestActivity,
  GameChoice,
  ConceptType,
  UnifiedGameAnswer,
  QuestionAnswerRecord,
  LieHunterAnswer,
  StepAnswer,
} from '../types/course.ts';

const STATS_KEY = 'studyquest_stats';
const ACTIVITY_KEY = 'studyquest_activity';

const DEFAULT_STATS: StudyQuestStats = {
  byGame: {
    runner: { played: 0, correct: 0, totalItems: 0 },
    lieHunter: { played: 0, correct: 0, totalItems: 0 },
    platformer: { played: 0, correct: 0, totalItems: 0 },
  },
  byType: {
    fact: { played: 0, correct: 0, totalItems: 0 },
    process: { played: 0, correct: 0, totalItems: 0 },
    detail: { played: 0, correct: 0, totalItems: 0 },
  },
  lastUpdated: new Date().toISOString(),
};

export function loadStats(): StudyQuestStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    return {
      byGame: {
        runner: parsed?.byGame?.runner || { played: 0, correct: 0, totalItems: 0 },
        lieHunter: parsed?.byGame?.lieHunter || { played: 0, correct: 0, totalItems: 0 },
        platformer: parsed?.byGame?.platformer || { played: 0, correct: 0, totalItems: 0 },
      },
      byType: {
        fact: parsed?.byType?.fact || { played: 0, correct: 0, totalItems: 0 },
        process: parsed?.byType?.process || { played: 0, correct: 0, totalItems: 0 },
        detail: parsed?.byType?.detail || { played: 0, correct: 0, totalItems: 0 },
      },
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[StatsService] Failed to load stats:', err);
    return { ...DEFAULT_STATS };
  }
}

export function saveStats(stats: StudyQuestStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (err) {
    console.warn('[StatsService] Failed to save stats:', err);
  }
}

export function loadActivity(): StudyQuestActivity {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return { history: {} };
    const parsed = JSON.parse(raw);
    return {
      history: parsed.history || {},
    };
  } catch (err) {
    console.warn('[StatsService] Failed to load activity:', err);
    return { history: {} };
  }
}

export function saveActivity(activity: StudyQuestActivity): void {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
  } catch (err) {
    console.warn('[StatsService] Failed to save activity:', err);
  }
}

/**
 * Returns formatted 'YYYY-MM-DD' for a date.
 */
export function getIsoDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Records answers from a completed level or revision session into stats and activity.
 */
export function recordSessionStatsAndActivity({
  answers,
  conceptTypesMap,
  xpEarned,
}: {
  answers: Array<QuestionAnswerRecord | LieHunterAnswer | StepAnswer | UnifiedGameAnswer>;
  conceptTypesMap: Record<string, ConceptType>;
  xpEarned: number;
}): void {
  const stats = loadStats();
  const activity = loadActivity();
  const todayKey = getIsoDateKey();

  let todayCorrect = 0;
  let todayTotal = 0;

  answers.forEach((ans: any) => {
    const gameId: GameChoice = ans.gameId || 'runner';
    const isCorrect = Boolean(ans.correct);
    const conceptType: ConceptType = conceptTypesMap[ans.conceptId] || 'fact';

    // Update byGame
    if (stats.byGame[gameId]) {
      stats.byGame[gameId].played += 1;
      stats.byGame[gameId].totalItems += 1;
      if (isCorrect) stats.byGame[gameId].correct += 1;
    }

    // Update byType
    if (stats.byType[conceptType]) {
      stats.byType[conceptType].played += 1;
      stats.byType[conceptType].totalItems += 1;
      if (isCorrect) stats.byType[conceptType].correct += 1;
    }

    todayTotal += 1;
    if (isCorrect) todayCorrect += 1;
  });

  stats.lastUpdated = new Date().toISOString();
  saveStats(stats);

  // Update Activity history
  const currentDay = activity.history[todayKey] || {
    date: todayKey,
    itemsAnswered: 0,
    correctCount: 0,
    xpEarned: 0,
    sessionsCount: 0,
  };

  activity.history[todayKey] = {
    date: todayKey,
    itemsAnswered: currentDay.itemsAnswered + todayTotal,
    correctCount: currentDay.correctCount + todayCorrect,
    xpEarned: currentDay.xpEarned + xpEarned,
    sessionsCount: currentDay.sessionsCount + 1,
  };

  // Keep up to 60 days of activity
  const keys = Object.keys(activity.history).sort();
  if (keys.length > 60) {
    const removeCount = keys.length - 60;
    for (let i = 0; i < removeCount; i++) {
      delete activity.history[keys[i]];
    }
  }

  saveActivity(activity);
}

/**
 * Returns the last 14 days of activity records (always 14 items, filling gaps with zeros).
 */
export function getLast14DaysActivity(): Array<{
  date: string;
  dayLabel: string;
  itemsAnswered: number;
  correctCount: number;
  xpEarned: number;
  sessionsCount: number;
}> {
  const activity = loadActivity();
  const result: Array<{
    date: string;
    dayLabel: string;
    itemsAnswered: number;
    correctCount: number;
    xpEarned: number;
    sessionsCount: number;
  }> = [];

  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = getIsoDateKey(d);
    const record = activity.history[key] || {
      date: key,
      itemsAnswered: 0,
      correctCount: 0,
      xpEarned: 0,
      sessionsCount: 0,
    };

    const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
    const monthDay = `${d.getMonth() + 1}/${d.getDate()}`;

    result.push({
      date: key,
      dayLabel: `${dayName} ${monthDay}`,
      itemsAnswered: record.itemsAnswered,
      correctCount: record.correctCount,
      xpEarned: record.xpEarned,
      sessionsCount: record.sessionsCount,
    });
  }

  return result;
}

export function clearStatsAndActivity(): void {
  try {
    localStorage.removeItem(STATS_KEY);
    localStorage.removeItem(ACTIVITY_KEY);
  } catch (e) {
    console.warn('Failed to clear stats/activity:', e);
  }
}
