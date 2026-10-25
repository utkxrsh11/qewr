/**
 * QA Self-Check Suite (Phase 7)
 * Runs non-destructive unit and integration assertions across masteryModel,
 * revisionPlanner, storage migrations, design tokens, and sample dataset integrity.
 */

import {
  baseMastery,
  decayFactor,
  strength,
  stateOf,
  intervalDays,
  isDue,
  overdueDays,
  priority,
  readiness,
  readinessBand,
} from '../services/masteryModel.ts';
import { ConceptProgress, Course, StudyQuestProgress } from '../types/course.ts';
import { buildRevisionPlan } from '../services/revisionPlanner.ts';
import { SAMPLE_COURSE } from '../data/sampleCourse.ts';
import { TOKENS } from '../theme/designTokens.ts';
import { getStorageUsageKB } from '../services/storageManager.ts';

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface QARunSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestResult[];
}

export function runQaTestSuite(): QARunSummary {
  const startTime = performance.now();
  const results: TestResult[] = [];

  function test(suite: string, name: string, fn: () => void) {
    const t0 = performance.now();
    try {
      fn();
      results.push({
        suite,
        name,
        passed: true,
        durationMs: Math.round((performance.now() - t0) * 100) / 100,
      });
    } catch (err: any) {
      results.push({
        suite,
        name,
        passed: false,
        error: err?.message || String(err),
        durationMs: Math.round((performance.now() - t0) * 100) / 100,
      });
    }
  }

  function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(message);
  }

  // ---------------------------------------------------------------------------
  // 1. Mastery Model Suite
  // ---------------------------------------------------------------------------
  test('Mastery Model', 'baseMastery returns 0 when answered is 0', () => {
    const c: ConceptProgress = {
      answered: 0,
      correct: 0,
      lastResult: 'correct',
      lastPlayed: '2026-10-24T00:00:00Z',
    };
    assert(baseMastery(c) === 0, 'Should be 0 for unattempted concepts');
  });

  test('Mastery Model', 'baseMastery computes weighted recent score', () => {
    const c: ConceptProgress = {
      answered: 10,
      correct: 5, // overall 0.5
      recent: [1, 1, 1], // mean = 1.0
      lastResult: 'correct',
      lastPlayed: '2026-10-24T00:00:00Z',
    };
    // 0.7 * 1.0 + 0.3 * 0.5 = 0.85
    const val = baseMastery(c);
    assert(Math.abs(val - 0.85) < 0.001, `Expected 0.85 but got ${val}`);
  });

  test('Mastery Model', 'decayFactor respects grace period and floor', () => {
    const nowMs = new Date('2026-10-24T12:00:00Z').getTime();
    // Concept with baseMastery >= 0.8 has 3 days grace
    const cHigh: ConceptProgress = {
      answered: 10,
      correct: 10,
      lastPlayed: '2026-10-22T12:00:00Z', // 2 days ago
      lastResult: 'correct',
    };
    assert(decayFactor(cHigh, nowMs) === 1, 'Should not decay within 3-day grace');

    // Concept overdue by 5 days -> 1 - 0.04 * 5 = 0.80
    const cOverdue: ConceptProgress = {
      answered: 10,
      correct: 5,
      lastPlayed: '2026-10-18T12:00:00Z', // 6 days ago (1 day grace -> 5 overdue)
      lastResult: 'correct',
    };
    const factor = decayFactor(cOverdue, nowMs);
    assert(Math.abs(factor - 0.80) < 0.001, `Expected 0.80 but got ${factor}`);

    // Concept long overdue should never drop below 0.60 floor
    const cAncient: ConceptProgress = {
      answered: 10,
      correct: 5,
      lastPlayed: '2025-01-01T12:00:00Z',
      lastResult: 'wrong',
    };
    assert(decayFactor(cAncient, nowMs) === 0.6, 'Floor should be 0.6');
  });

  test('Mastery Model', 'stateOf classifies untouched, weak, shaky, mastered', () => {
    assert(
      stateOf({ answered: 0, correct: 0, lastResult: 'wrong', lastPlayed: '' }) === 'untouched',
      'Should be untouched'
    );
    assert(
      stateOf({
        answered: 4,
        correct: 1,
        lastResult: 'wrong',
        lastPlayed: new Date().toISOString(),
      }) === 'weak',
      'Should be weak'
    );
    assert(
      stateOf({
        answered: 4,
        correct: 3,
        lastResult: 'correct',
        lastPlayed: new Date().toISOString(),
      }) === 'shaky',
      'Should be shaky'
    );
    assert(
      stateOf({
        answered: 10,
        correct: 10,
        lastResult: 'correct',
        lastPlayed: new Date().toISOString(),
      }) === 'mastered',
      'Should be mastered'
    );
  });

  test('Mastery Model', 'readiness aggregates all concepts across course', () => {
    const mockCourse: Course = {
      courseTitle: 'Test',
      sourceName: 'test.pdf',
      totalPages: 1,
      createdAt: new Date().toISOString(),
      chapters: [
        {
          id: 'ch1',
          title: 'Ch 1',
          pageStart: 1,
          pageEnd: 1,
          concepts: [
            {
              id: 'c1',
              name: 'C1',
              summary: 'S1',
              type: 'fact',
              page: 1,
              sourceQuote: 'Quote 1',
            },
            {
              id: 'c2',
              name: 'C2',
              summary: 'S2',
              type: 'detail',
              page: 1,
              sourceQuote: 'Quote 2',
            },
          ],
        },
      ],
    };
    const mockProg: StudyQuestProgress = {
      totalXp: 100,
      levels: {},
      concepts: {
        c1: {
          answered: 5,
          correct: 5,
          lastPlayed: new Date().toISOString(),
          lastResult: 'correct',
        }, // strength = 1.0
        // c2 untouched -> strength = 0
      },
    };
    const summary = readiness(mockCourse, mockProg, Date.now());
    assert(summary.score === 50, `Expected 50% readiness score, got ${summary.score}`);
    assert(summary.coverage === 0.5, `Expected 0.5 coverage, got ${summary.coverage}`);
    assert(summary.counts.mastered === 1, 'Should have 1 mastered concept');
    assert(summary.counts.untouched === 1, 'Should have 1 untouched concept');
    assert(
      readinessBand(summary.score).label === 'Getting there',
      'Expected Getting there band'
    );
  });

  // ---------------------------------------------------------------------------
  // 2. Storage & Diagnostics Suite
  // ---------------------------------------------------------------------------
  test('Storage Manager', 'getStorageUsageKB returns valid metrics', () => {
    const stats = getStorageUsageKB();
    assert(typeof stats.usedKb === 'number', 'usedKb must be a number');
    assert(typeof stats.cacheKb === 'number', 'cacheKb must be a number');
    assert(stats.usedKb >= 0, 'usedKb must be non-negative');
  });

  // ---------------------------------------------------------------------------
  // 3. Revision Planner Suite
  // ---------------------------------------------------------------------------
  test('Revision Planner', 'buildRevisionPlan handles standard size and virtual levels', () => {
    const mockProg: StudyQuestProgress = {
      totalXp: 50,
      levels: {},
      concepts: {
        'ch1-c1': {
          answered: 2,
          correct: 0,
          lastPlayed: '2026-10-01T00:00:00Z',
          lastResult: 'wrong',
        },
        'ch1-c2': {
          answered: 4,
          correct: 2,
          lastPlayed: '2026-10-10T00:00:00Z',
          lastResult: 'correct',
        },
      },
    };
    const plan = buildRevisionPlan(SAMPLE_COURSE, mockProg, 'standard');
    assert(plan !== null, 'Plan must not be null');
    assert(plan!.candidates.length > 0, 'Plan should contain candidates');
    assert(plan!.virtualLevel.isRevision === true, 'Virtual level should have isRevision true');
    assert(plan!.expectedSegments > 0, 'Plan should have at least 1 expected segment');
  });

  // ---------------------------------------------------------------------------
  // 4. Design Tokens Integrity Suite
  // ---------------------------------------------------------------------------
  test('Design Tokens', 'tokens contain required palette and typography', () => {
    assert(Boolean(TOKENS.colors.gold), 'Gold token missing');
    assert(Boolean(TOKENS.colors.teal), 'Teal token missing');
    assert(Boolean(TOKENS.colors.surface), 'Surface token missing');
    assert(Boolean(TOKENS.colors.border), 'Border token missing');
    assert(TOKENS.spacing.md === 12, 'Spacing token scale mismatch');
    assert(TOKENS.radii.md === '8px', 'Radius token scale mismatch');
  });

  // ---------------------------------------------------------------------------
  // 5. Sample Dataset Integrity Suite
  // ---------------------------------------------------------------------------
  test('Sample Dataset', 'sample course has valid chapters and concepts', () => {
    assert(SAMPLE_COURSE.chapters.length >= 2, 'Should have at least 2 chapters');
    let totalConcepts = 0;
    SAMPLE_COURSE.chapters.forEach((ch) => {
      assert(ch.concepts.length > 0, `Chapter ${ch.id} has no concepts`);
      totalConcepts += ch.concepts.length;
      ch.concepts.forEach((c) => {
        assert(Boolean(c.id), 'Concept missing id');
        assert(Boolean(c.name), 'Concept missing name');
        assert(Boolean(c.summary), 'Concept missing summary');
        assert(c.page >= ch.pageStart && c.page <= ch.pageEnd, 'Concept page out of bounds');
      });
    });
    assert(totalConcepts === 6, 'Water cycle course must have 6 concepts');
  });

  const totalTime = Math.round((performance.now() - startTime) * 100) / 100;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    durationMs: totalTime,
    results,
  };
}
