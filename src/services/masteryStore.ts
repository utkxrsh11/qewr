/**
 * Centralized Mastery Tracking System (masteryStore)
 * Persisted under versioned localStorage key 'mastery_v1'.
 *
 * Provides deterministic mastery scoring (0-100), weighted recent performance,
 * weak-concept / needs-review detection, and reactive subscription hooks.
 */

import { useState, useEffect } from 'react';
import { Course, Chapter, Concept } from '../types/course.ts';

export const MASTERY_STORAGE_KEY = 'mastery_v1';

export interface AnswerMetadata {
  timeMs?: number;
  questionId?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  wasFirstTry?: boolean;
}

export interface MasterySnapshot {
  timestamp: string;
  mastery: number;
  isCorrect: boolean;
  timeMs?: number;
}

export interface ConceptMasteryRecord {
  conceptId: string;
  mastery: number; // 0 to 100
  totalAttempts: number;
  correctAnswers: number;
  lastPracticed: string | null; // ISO date
  recentAnswers: boolean[]; // up to last 10 answers
  history: MasterySnapshot[]; // up to 20 snapshots
  highestMastery: number;
  isAttempted: boolean;
}

export interface MasteryStoreData {
  version: 1;
  concepts: Record<string, ConceptMasteryRecord>;
  lastUpdated: string;
}

export interface WeakConceptItem {
  concept: Concept;
  chapter: Chapter;
  mastery: number;
  reason: string;
  priority: number; // higher = more urgent
  isNew?: boolean;
}

const DEFAULT_STORE: MasteryStoreData = {
  version: 1,
  concepts: {},
  lastUpdated: new Date().toISOString(),
};

// Listeners for reactive updates
type MasteryListener = () => void;
const listeners = new Set<MasteryListener>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn('Error in mastery listener:', err);
    }
  });
}

/**
 * Loads and validates mastery data from localStorage.
 * Gracefully recovers if data is missing, corrupted, or invalid.
 */
export function loadMasteryData(): MasteryStoreData {
  try {
    const raw = localStorage.getItem(MASTERY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STORE, concepts: {} };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_STORE, concepts: {} };
    }

    const validatedConcepts: Record<string, ConceptMasteryRecord> = {};
    if (parsed.concepts && typeof parsed.concepts === 'object') {
      for (const [id, record] of Object.entries(parsed.concepts)) {
        if (!id || !record || typeof record !== 'object') continue;
        const r = record as any;
        const totalAttempts = Math.max(0, Number(r.totalAttempts) || 0);
        const correctAnswers = Math.max(0, Math.min(totalAttempts, Number(r.correctAnswers) || 0));
        const mastery = Math.max(0, Math.min(100, Number(r.mastery) || 0));
        const isAttempted = Boolean(r.isAttempted ?? totalAttempts > 0);

        validatedConcepts[id] = {
          conceptId: id,
          mastery,
          totalAttempts,
          correctAnswers,
          lastPracticed: typeof r.lastPracticed === 'string' ? r.lastPracticed : null,
          recentAnswers: Array.isArray(r.recentAnswers) ? r.recentAnswers.slice(-10) : [],
          history: Array.isArray(r.history) ? r.history.slice(-20) : [],
          highestMastery: Math.max(mastery, Number(r.highestMastery) || mastery),
          isAttempted,
        };
      }
    }

    return {
      version: 1,
      concepts: validatedConcepts,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('Failed to load mastery data from localStorage, recovering with default store:', err);
    return { ...DEFAULT_STORE, concepts: {} };
  }
}

/**
 * Saves validated mastery data to localStorage.
 */
export function saveMasteryData(data: MasteryStoreData): void {
  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save mastery data to localStorage:', err);
  }
}

/**
 * Calculates new mastery score:
 * - Deterministic bounded calculation [0, 100]
 * - First attempt: +50 for correct, 20 for wrong
 * - Subsequent: +12 base for correct (+3 if fast/bonus), -8 for incorrect
 * - Blended with recent 5-answer weighted accuracy (75% incremental, 25% recent accuracy anchor)
 */
function computeUpdatedMastery(
  currentRecord: ConceptMasteryRecord,
  isCorrect: boolean,
  metadata?: AnswerMetadata
): { newMastery: number; highestMastery: number } {
  const current = currentRecord.mastery;
  let newMastery: number;

  if (!currentRecord.isAttempted || currentRecord.totalAttempts === 0) {
    newMastery = isCorrect ? 50 : 20;
    if (metadata?.wasFirstTry && isCorrect) newMastery += 5;
  } else {
    // Incremental step
    let delta = isCorrect ? 12 : -8;
    // Bonus for fast response (< 3.5s) on correct
    if (isCorrect && metadata?.timeMs && metadata.timeMs < 3500) {
      delta += 3;
    }

    const incrementalScore = Math.max(0, Math.min(100, current + delta));

    // Recent weighted anchor (last 5 answers + current)
    const recentPlusOne = [...currentRecord.recentAnswers.slice(-4), isCorrect];
    const recentCorrect = recentPlusOne.filter(Boolean).length;
    const recentAccuracyAnchor = Math.round((recentCorrect / recentPlusOne.length) * 100);

    // Blend: 75% incremental, 25% recent performance anchor
    newMastery = Math.round(incrementalScore * 0.75 + recentAccuracyAnchor * 0.25);
    newMastery = Math.max(0, Math.min(100, newMastery));
  }

  const highestMastery = Math.max(currentRecord.highestMastery || 0, newMastery);
  return { newMastery, highestMastery };
}

/**
 * Records an answer for a concept. Call this once per finalized answer.
 */
export function recordAnswer(
  conceptId: string,
  isCorrect: boolean,
  metadata?: AnswerMetadata
): ConceptMasteryRecord {
  if (!conceptId || typeof conceptId !== 'string') {
    console.warn('recordAnswer called with invalid conceptId:', conceptId);
    return getConceptStats('unknown');
  }

  const store = loadMasteryData();
  const existing = store.concepts[conceptId] || {
    conceptId,
    mastery: 0,
    totalAttempts: 0,
    correctAnswers: 0,
    lastPracticed: null,
    recentAnswers: [],
    history: [],
    highestMastery: 0,
    isAttempted: false,
  };

  const { newMastery, highestMastery } = computeUpdatedMastery(existing, isCorrect, metadata);
  const now = new Date().toISOString();

  const updatedRecord: ConceptMasteryRecord = {
    conceptId,
    mastery: newMastery,
    totalAttempts: existing.totalAttempts + 1,
    correctAnswers: existing.correctAnswers + (isCorrect ? 1 : 0),
    lastPracticed: now,
    recentAnswers: [...existing.recentAnswers.slice(-9), isCorrect],
    history: [
      ...existing.history.slice(-19),
      {
        timestamp: now,
        mastery: newMastery,
        isCorrect,
        timeMs: metadata?.timeMs,
      },
    ],
    highestMastery,
    isAttempted: true,
  };

  store.concepts[conceptId] = updatedRecord;
  saveMasteryData(store);
  notifyListeners();
  return updatedRecord;
}

/**
 * Gets mastery score (0 to 100). Returns null if never attempted.
 */
export function getMastery(conceptId: string): number | null {
  const store = loadMasteryData();
  const record = store.concepts[conceptId];
  if (!record || !record.isAttempted) {
    return null;
  }
  return record.mastery;
}

/**
 * Gets complete concept stats.
 */
export function getConceptStats(conceptId: string): ConceptMasteryRecord {
  const store = loadMasteryData();
  return (
    store.concepts[conceptId] || {
      conceptId,
      mastery: 0,
      totalAttempts: 0,
      correctAnswers: 0,
      lastPracticed: null,
      recentAnswers: [],
      history: [],
      highestMastery: 0,
      isAttempted: false,
    }
  );
}

/**
 * Calculates chapter mastery (0 to 100).
 * Averages mastery across all concepts in the chapter (unattempted concepts count as 0).
 */
export function getChapterMastery(chapterId: string, course: Course): number {
  const chapter = course.chapters.find((c) => c.id === chapterId);
  if (!chapter || !chapter.concepts || chapter.concepts.length === 0) return 0;

  const store = loadMasteryData();
  let totalScore = 0;

  chapter.concepts.forEach((concept) => {
    const record = store.concepts[concept.id];
    if (record && record.isAttempted) {
      totalScore += record.mastery;
    }
  });

  return Math.round(totalScore / chapter.concepts.length);
}

/**
 * Calculates overall course mastery (0 to 100).
 * Averages mastery across all concepts in the whole course (unattempted concepts count as 0).
 */
export function getOverallMastery(course: Course): number {
  const allConcepts: Concept[] = [];
  course.chapters.forEach((ch) => {
    (ch.concepts || []).forEach((c) => allConcepts.push(c));
  });

  if (allConcepts.length === 0) return 0;

  const store = loadMasteryData();
  let totalScore = 0;

  allConcepts.forEach((c) => {
    const record = store.concepts[c.id];
    if (record && record.isAttempted) {
      totalScore += record.mastery;
    }
  });

  return Math.round(totalScore / allConcepts.length);
}

/**
 * Returns total concepts count and how many are mastered (mastery >= 75).
 */
export function getMasteryCounts(course: Course): {
  totalConcepts: number;
  masteredConcepts: number;
  attemptedConcepts: number;
} {
  const allConcepts: Concept[] = [];
  course.chapters.forEach((ch) => {
    (ch.concepts || []).forEach((c) => allConcepts.push(c));
  });

  const store = loadMasteryData();
  let mastered = 0;
  let attempted = 0;

  allConcepts.forEach((c) => {
    const record = store.concepts[c.id];
    if (record && record.isAttempted) {
      attempted++;
      if (record.mastery >= 75) {
        mastered++;
      }
    }
  });

  return {
    totalConcepts: allConcepts.length,
    masteredConcepts: mastered,
    attemptedConcepts: attempted,
  };
}

/**
 * Detects concepts needing review according to Section 4 rules:
 * 1. Attempted and mastery < 40
 * 2. Mastery fallen by >= 15 points recently
 * 3. Not practiced for >= 7 days and mastery < 75
 * Unseen concepts are NOT flagged.
 * Returns top 3 priority concepts.
 */
export function getWeakConcepts(course: Course): WeakConceptItem[] {
  const store = loadMasteryData();
  const flagged: WeakConceptItem[] = [];
  const nowMs = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  course.chapters.forEach((chapter) => {
    (chapter.concepts || []).forEach((concept) => {
      const record = store.concepts[concept.id];
      if (!record || !record.isAttempted) {
        return; // Unseen concepts do not get flagged for review
      }

      let reason = '';
      let priority = 0;

      // Condition 1: Mastery below 40
      if (record.mastery < 40) {
        reason = `Mastery is critically low (${record.mastery}%). Reinforce core understanding.`;
        priority = 100 - record.mastery; // Lower score = higher priority
      }

      // Condition 2: Fallen by >= 15 points
      const drop = (record.highestMastery || record.mastery) - record.mastery;
      if (drop >= 15 && (!priority || drop > priority)) {
        reason = `Mastery dropped by ${drop}% recently. Review to recover retention.`;
        priority = Math.max(priority, 50 + drop);
      }

      // Condition 3: Inactive >= 7 days and mastery < 75
      if (record.lastPracticed) {
        const practicedDate = new Date(record.lastPracticed).getTime();
        const daysInactive = Math.floor((nowMs - practicedDate) / (24 * 60 * 60 * 1000));
        if (daysInactive >= 7 && record.mastery < 75) {
          const inactiveReason = `Not practiced in ${daysInactive} days. Memory retention decays over time.`;
          if (!reason || daysInactive > 14) {
            reason = inactiveReason;
            priority = Math.max(priority, 40 + Math.min(30, daysInactive));
          }
        }
      }

      if (reason) {
        flagged.push({
          concept,
          chapter,
          mastery: record.mastery,
          reason,
          priority,
        });
      }
    });
  });

  // Sort descending by priority, pick top 3
  flagged.sort((a, b) => b.priority - a.priority);
  return flagged.slice(0, 3);
}

/**
 * Resets all mastery records back to initial state.
 */
export function resetMasteryProgress(): void {
  try {
    localStorage.removeItem(MASTERY_STORAGE_KEY);
    notifyListeners();
  } catch (err) {
    console.warn('Failed to reset mastery progress:', err);
  }
}

/**
 * Subscribe to mastery changes for reactive UI updates without page reloads.
 */
export function subscribeToMastery(listener: MasteryListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * React hook that subscribes to masteryStore changes.
 */
export function useMastery(): MasteryStoreData {
  const [data, setData] = useState<MasteryStoreData>(() => loadMasteryData());

  useEffect(() => {
    const unsubscribe = subscribeToMastery(() => {
      setData(loadMasteryData());
    });
    return unsubscribe;
  }, []);

  return data;
}
