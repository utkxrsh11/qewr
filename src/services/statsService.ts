/**
 * Stats and Activity Service
 * Manages game/type breakdown statistics and daily activity history in localStorage (Phase 6).
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
  ActivityDayRecord,
} from '../types/course.ts';

const STATS_KEY = 'studyquest_stats';
const ACTIVITY_KEY = 'studyquest_activity';

const DEFAULT_STATS: StudyQuestStats = {
  games: {
    runner: { answered: 0, correct: 0 },
    lieHunter: { answered: 0, correct: 0 },
    platformer: { answered: 0, correct: 0 },
  },
  types: {
    fact: { answered: 0, correct: 0 },
    process: { answered: 0, correct: 0 },
    detail: { answered: 0, correct: 0 },
  },
};

export function loadStats(): StudyQuestStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATS));
    const parsed = JSON.parse(raw);

    // Normalize either { games, types } or legacy { byGame, byType }
    const runner = parsed?.games?.runner || parsed?.byGame?.runner;
    const lieHunter = parsed?.games?.lieHunter || parsed?.byGame?.lieHunter;
    const platformer = parsed?.games?.platformer || parsed?.byGame?.platformer;

    const fact = parsed?.types?.fact || parsed?.byType?.fact;
    const processType = parsed?.types?.process || parsed?.byType?.process;
    const detail = parsed?.types?.detail || parsed?.byType?.detail;

    const games = {
      runner: {
        answered: Number(runner?.answered ?? runner?.totalItems ?? 0),
        correct: Number(runner?.correct ?? 0),
      },
      lieHunter: {
        answered: Number(lieHunter?.answered ?? lieHunter?.totalItems ?? 0),
        correct: Number(lieHunter?.correct ?? 0),
      },
      platformer: {
        answered: Number(platformer?.answered ?? platformer?.totalItems ?? 0),
        correct: Number(platformer?.correct ?? 0),
      },
    };

    const types = {
      fact: {
        answered: Number(fact?.answered ?? fact?.totalItems ?? 0),
        correct: Number(fact?.correct ?? 0),
      },
      process: {
        answered: Number(processType?.answered ?? processType?.totalItems ?? 0),
        correct: Number(processType?.correct ?? 0),
      },
      detail: {
        answered: Number(detail?.answered ?? detail?.totalItems ?? 0),
        correct: Number(detail?.correct ?? 0),
      },
    };

    return {
      games,
      types,
      byGame: games,
      byType: types,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[StatsService] Failed to load stats:', err);
    return JSON.parse(JSON.stringify(DEFAULT_STATS));
  }
}

export function saveStats(stats: StudyQuestStats): void {
  try {
    const toSave: StudyQuestStats = {
      games: stats.games,
      types: stats.types,
      byGame: stats.games,
      byType: stats.types,
      lastUpdated: stats.lastUpdated || new Date().toISOString(),
    };
    localStorage.setItem(STATS_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn('[StatsService] Failed to save stats:', err);
  }
}

export function loadActivity(): StudyQuestActivity {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return { days: {} };
    const parsed = JSON.parse(raw);
    const sourceDays = parsed.days || parsed.history || {};

    const normalizedDays: Record<string, ActivityDayRecord> = {};
    Object.keys(sourceDays).forEach((k) => {
      const d = sourceDays[k];
      normalizedDays[k] = {
        date: d.date || k,
        answered: Number(d.answered ?? d.itemsAnswered ?? 0),
        correct: Number(d.correct ?? d.correctCount ?? 0),
        xp: Number(d.xp ?? d.xpEarned ?? 0),
        sessions: Number(d.sessions ?? d.sessionsCount ?? 0),
      };
    });

    return {
      days: normalizedDays,
      history: normalizedDays,
    };
  } catch (err) {
    console.warn('[StatsService] Failed to load activity:', err);
    return { days: {} };
  }
}

export function saveActivity(activity: StudyQuestActivity): void {
  try {
    // Keep only the last 60 days
    const allDays = activity.days || activity.history || {};
    const sortedKeys = Object.keys(allDays).sort();
    const recentKeys = sortedKeys.slice(-60);

    const prunedDays: Record<string, ActivityDayRecord> = {};
    recentKeys.forEach((k) => {
      prunedDays[k] = allDays[k];
    });

    const payload = {
      days: prunedDays,
      history: prunedDays,
    };
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[StatsService] Failed to save activity:', err);
  }
}

/**
 * Returns formatted local 'YYYY-MM-DD' for a date.
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

    // Update games
    if (stats.games[gameId]) {
      stats.games[gameId].answered += 1;
      if (isCorrect) stats.games[gameId].correct += 1;
    }

    // Update types
    if (stats.types[conceptType]) {
      stats.types[conceptType].answered += 1;
      if (isCorrect) stats.types[conceptType].correct += 1;
    }

    todayTotal += 1;
    if (isCorrect) todayCorrect += 1;
  });

  stats.lastUpdated = new Date().toISOString();
  saveStats(stats);

  // Update activity days
  const currentDays = activity.days || {};
  const todayRecord: ActivityDayRecord = currentDays[todayKey] || {
    date: todayKey,
    answered: 0,
    correct: 0,
    xp: 0,
    sessions: 0,
  };

  todayRecord.answered += todayTotal;
  todayRecord.correct += todayCorrect;
  todayRecord.xp += xpEarned;
  todayRecord.sessions += 1;

  currentDays[todayKey] = todayRecord;
  saveActivity({ days: currentDays });
}

/**
 * Generates an insight line based on concept type accuracy:
 * Only show when both extremes have at least 5 items and differ by at least 15 points.
 */
export function generatePerformanceInsight(stats: StudyQuestStats): string | null {
  const typesList: Array<{ type: ConceptType; label: string; acc: number; count: number }> = [
    {
      type: 'fact',
      label: 'facts',
      count: stats.types.fact.answered,
      acc:
        stats.types.fact.answered > 0
          ? Math.round((stats.types.fact.correct / stats.types.fact.answered) * 100)
          : 0,
    },
    {
      type: 'process',
      label: 'processes',
      count: stats.types.process.answered,
      acc:
        stats.types.process.answered > 0
          ? Math.round((stats.types.process.correct / stats.types.process.answered) * 100)
          : 0,
    },
    {
      type: 'detail',
      label: 'details',
      count: stats.types.detail.answered,
      acc:
        stats.types.detail.answered > 0
          ? Math.round((stats.types.detail.correct / stats.types.detail.answered) * 100)
          : 0,
    },
  ];

  const eligible = typesList.filter((t) => t.count >= 5);
  if (eligible.length < 2) return null;

  eligible.sort((a, b) => b.acc - a.acc);
  const strongest = eligible[0];
  const weakest = eligible[eligible.length - 1];

  const diff = strongest.acc - weakest.acc;
  if (diff >= 15) {
    return `You're strongest at ${strongest.label} (${strongest.acc}%) and weakest at ${weakest.label} (${weakest.acc}%). Smart revision will practice ${weakest.label} more.`;
  }

  return null;
}

/**
 * Calculates day streak: consecutive calendar days with at least 1 finished level or revision session.
 * Gracefully returns 0 if no sessions or if today and yesterday had no sessions.
 */
export function calculateDayStreak(activity: StudyQuestActivity): number {
  const daysMap = activity.days || activity.history || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayKey = getIsoDateKey(today);
  const yesterday = new Date(today.getTime() - 86400 * 1000);
  const yesterdayKey = getIsoDateKey(yesterday);

  // If neither today nor yesterday had any session, streak is 0
  const todayRecord = daysMap[todayKey];
  const yesterdayRecord = daysMap[yesterdayKey];

  const hasToday = Boolean(todayRecord && (todayRecord.sessions > 0 || todayRecord.answered > 0));
  const hasYesterday = Boolean(yesterdayRecord && (yesterdayRecord.sessions > 0 || yesterdayRecord.answered > 0));

  if (!hasToday && !hasYesterday) {
    return 0;
  }

  // Count backwards
  let streak = 0;
  let checkDate = hasToday ? today : yesterday;

  while (true) {
    const k = getIsoDateKey(checkDate);
    const rec = daysMap[k];
    if (rec && (rec.sessions > 0 || rec.answered > 0)) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 86400 * 1000);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Returns formatted 14-day history array (today on the right).
 */
export function getLast14DaysActivity(): Array<{
  date: string;
  displayDate: string;
  itemsAnswered: number;
  correctCount: number;
  xpEarned: number;
  sessionsCount: number;
}> {
  const activity = loadActivity();
  const daysMap = activity.days || activity.history || {};
  const result: Array<{
    date: string;
    displayDate: string;
    itemsAnswered: number;
    correctCount: number;
    xpEarned: number;
    sessionsCount: number;
  }> = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 13; i >= 0; i--) {
    const targetDate = new Date(today.getTime() - i * 86400 * 1000);
    const key = getIsoDateKey(targetDate);
    const rec = daysMap[key] || {
      date: key,
      answered: 0,
      correct: 0,
      xp: 0,
      sessions: 0,
    };

    const dayName = targetDate.toLocaleDateString(undefined, { weekday: 'short' });
    const monthDay = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;

    result.push({
      date: key,
      displayDate: i === 0 ? 'Today' : `${dayName} ${monthDay}`,
      itemsAnswered: rec.answered,
      correctCount: rec.correct,
      xpEarned: rec.xp,
      sessionsCount: rec.sessions,
    });
  }

  return result;
}

export function clearStatsAndActivity(): void {
  try {
    localStorage.removeItem(STATS_KEY);
    localStorage.removeItem(ACTIVITY_KEY);
  } catch (err) {
    console.warn('[StatsService] Failed to clear stats/activity:', err);
  }
}
