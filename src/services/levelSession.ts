/**
 * Level Session Module
 * Manages partitioning levels into sequential game segments, parallel content loading,
 * cross-segment shared lives/streak state, and unified result merging.
 * Enhanced in Phase 6 with Virtual Level support, cache reuse, and lighter revision sessions.
 */

import {
  Level,
  Course,
  Concept,
  GameChoice,
  LevelSegment,
  LevelResult,
  SegmentResultInfo,
  Question,
  LieHunterRound,
  PlatformerRound,
} from '../types/course.ts';
import { selectGame, GAME_REGISTRY, SelectGameOptions } from './gameRegistry.ts';
import {
  clearCachedQuestionsForLevel,
  getCachedQuestions,
  saveCachedQuestions,
} from './questionService.ts';
import {
  clearCachedLieHunterForLevel,
  getCachedLieHunterRounds,
  saveCachedLieHunterRounds,
} from './lieHunterService.ts';
import {
  clearCachedPlatformerForLevel,
  getCachedPlatformerRounds,
  saveCachedPlatformerRounds,
} from './platformerService.ts';
import { calculateStars, calculateXpEarned, loadProgress } from './progressService.ts';
import { strength } from './masteryModel.ts';
import { computeLevelConceptsHash } from './levelBuilder.ts';
import { SAMPLE_LEVEL_QUESTIONS } from '../data/sampleQuestions.ts';
import { SAMPLE_LIE_HUNTER_BOARDS } from '../data/sampleLieHunter.ts';
import { SAMPLE_PLATFORMER_ROUNDS } from '../data/samplePlatformer.ts';

/**
 * Groups a level's concepts into sequential segments by chosen game.
 * If isRevision is true, segments are ordered by lowest concept strength (weakest first).
 * Otherwise, segments are ordered by the page of the first concept in each segment.
 */
export function buildLevelSegments(level: Level, options?: SelectGameOptions): LevelSegment[] {
  const concepts = level.concepts || [];
  if (concepts.length === 0) return [];

  const progress = loadProgress();

  // Group concepts by game
  const gameGroups = new Map<GameChoice, Concept[]>();

  concepts.forEach((concept) => {
    const chosenGame = selectGame(concept, options);
    const existing = gameGroups.get(chosenGame) || [];
    existing.push(concept);
    gameGroups.set(chosenGame, existing);
  });

  // Convert to segments
  const segments: Array<{
    gameId: GameChoice;
    concepts: Concept[];
    firstPage: number;
    minStrength: number;
  }> = [];

  gameGroups.forEach((groupConcepts, gameId) => {
    const firstPage = Math.min(...groupConcepts.map((c) => c.page));
    const minStrength = Math.min(
      ...groupConcepts.map((c) => strength(progress.concepts[c.id]))
    );
    segments.push({
      gameId,
      concepts: groupConcepts,
      firstPage,
      minStrength,
    });
  });

  if (level.isRevision) {
    // Phase 6 Section 5: Order segments by the lowest strength inside each segment (weakest first)
    segments.sort((a, b) => a.minStrength - b.minStrength);
  } else {
    // Normal level: sort by firstPage ascending
    segments.sort((a, b) => a.firstPage - b.firstPage);
  }

  const totalSegments = segments.length;

  return segments.map((seg, idx) => ({
    id: `${level.id}-seg${idx + 1}-${seg.gameId}`,
    gameId: seg.gameId,
    conceptIds: seg.concepts.map((c) => c.id),
    concepts: seg.concepts,
    index: idx,
    totalSegments,
  }));
}

export interface SegmentContentResult {
  gameId: GameChoice;
  segmentId: string;
  conceptIds: string[];
  content: any;
  error?: {
    message: string;
    technical?: string;
  };
}

export interface LevelContentData {
  segments: SegmentContentResult[];
  hasFailure: boolean;
  failedGameIds: GameChoice[];
}

/**
 * Clears ALL game caches for a level, or all level caches across all levels if levelId is omitted.
 */
export function clearAllLevelCaches(levelId?: string): void {
  if (levelId) {
    clearCachedQuestionsForLevel(levelId);
    clearCachedLieHunterForLevel(levelId);
    clearCachedPlatformerForLevel(levelId);
  } else {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('studyquest_content_') ||
            key.startsWith('studyquest_questions_') ||
            key.startsWith('studyquest_liehunter_') ||
            key.startsWith('studyquest_platformer_'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }
}

/**
 * Scans localStorage and sample data to assemble revision content from previous levels.
 */
function tryAssembleRevisionContentFromCache({
  gameId,
  concepts,
  isSampleCourse,
}: {
  gameId: GameChoice;
  concepts: Concept[];
  isSampleCourse: boolean;
}): any | null {
  const conceptIds = new Set(concepts.map((c) => c.id));

  if (gameId === 'runner') {
    const collectedQuestionsByConcept = new Map<string, Question[]>();

    // 1. Check all sample questions if sample course
    if (isSampleCourse) {
      Object.values(SAMPLE_LEVEL_QUESTIONS).forEach((questionsList) => {
        questionsList.forEach((q) => {
          if (conceptIds.has(q.conceptId)) {
            const list = collectedQuestionsByConcept.get(q.conceptId) || [];
            list.push(q);
            collectedQuestionsByConcept.set(q.conceptId, list);
          }
        });
      });
    }

    // 2. Check localStorage for studyquest_questions_*
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('studyquest_questions_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const data = JSON.parse(raw);
            if (Array.isArray(data.questions)) {
              data.questions.forEach((q: Question) => {
                if (conceptIds.has(q.conceptId)) {
                  const list = collectedQuestionsByConcept.get(q.conceptId) || [];
                  if (!list.some((existing) => existing.id === q.id)) {
                    list.push(q);
                  }
                  collectedQuestionsByConcept.set(q.conceptId, list);
                }
              });
            }
          }
        }
      }
    } catch {
      // Storage access failed
    }

    // Section 5: For Concept Runner: 2 questions per concept (one medium and one hard)
    const assembledQuestions: Question[] = [];
    let hasAll = true;

    for (const c of concepts) {
      const available = collectedQuestionsByConcept.get(c.id) || [];
      if (available.length === 0) {
        hasAll = false;
        break;
      }
      const mediumQ = available.find((q) => q.difficulty === 'medium');
      const hardQ = available.find((q) => q.difficulty === 'hard');

      const picked: Question[] = [];
      if (mediumQ) picked.push(mediumQ);
      if (hardQ && hardQ.id !== mediumQ?.id) picked.push(hardQ);

      // If missing medium or hard, take any other available
      for (const q of available) {
        if (picked.length >= 2) break;
        if (!picked.some((p) => p.id === q.id)) picked.push(q);
      }

      if (picked.length === 0) {
        hasAll = false;
        break;
      }
      assembledQuestions.push(...picked);
    }

    if (hasAll && assembledQuestions.length >= concepts.length) {
      return assembledQuestions;
    }
    return null;
  }

  if (gameId === 'lieHunter') {
    const collectedRoundsByConcept = new Map<string, LieHunterRound[]>();

    if (isSampleCourse) {
      Object.values(SAMPLE_LIE_HUNTER_BOARDS).forEach((roundsList) => {
        roundsList.forEach((r) => {
          if (conceptIds.has(r.conceptId)) {
            const list = collectedRoundsByConcept.get(r.conceptId) || [];
            list.push(r);
            collectedRoundsByConcept.set(r.conceptId, list);
          }
        });
      });
    }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('studyquest_content_') && key.endsWith('_lieHunter')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const data = JSON.parse(raw);
            if (Array.isArray(data.rounds)) {
              data.rounds.forEach((r: LieHunterRound) => {
                if (conceptIds.has(r.conceptId)) {
                  const list = collectedRoundsByConcept.get(r.conceptId) || [];
                  if (!list.some((existing) => existing.id === r.id)) {
                    list.push(r);
                  }
                  collectedRoundsByConcept.set(r.conceptId, list);
                }
              });
            }
          }
        }
      }
    } catch {
      // Storage access failed
    }

    // Section 5: Lie Hunter: 1 board per concept (the hard one)
    const assembledRounds: LieHunterRound[] = [];
    let hasAll = true;

    for (const c of concepts) {
      const available = collectedRoundsByConcept.get(c.id) || [];
      if (available.length === 0) {
        hasAll = false;
        break;
      }
      const hardRound = available.find((r) => r.difficulty === 'hard') || available[0];
      assembledRounds.push(hardRound);
    }

    if (hasAll && assembledRounds.length === concepts.length) {
      return assembledRounds;
    }
    return null;
  }

  if (gameId === 'platformer') {
    const collectedRoundsByConcept = new Map<string, PlatformerRound[]>();

    if (isSampleCourse) {
      Object.values(SAMPLE_PLATFORMER_ROUNDS).forEach((roundsList) => {
        roundsList.forEach((r) => {
          if (conceptIds.has(r.conceptId)) {
            const list = collectedRoundsByConcept.get(r.conceptId) || [];
            list.push(r);
            collectedRoundsByConcept.set(r.conceptId, list);
          }
        });
      });
    }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('studyquest_content_') && key.endsWith('_platformer')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const data = JSON.parse(raw);
            if (Array.isArray(data.rounds)) {
              data.rounds.forEach((r: PlatformerRound) => {
                if (conceptIds.has(r.conceptId)) {
                  const list = collectedRoundsByConcept.get(r.conceptId) || [];
                  if (!list.some((existing) => existing.id === r.id)) {
                    list.push(r);
                  }
                  collectedRoundsByConcept.set(r.conceptId, list);
                }
              });
            }
          }
        }
      }
    } catch {
      // Storage access failed
    }

    // Section 5: Process Platformer: 1 order round per concept, no challenge rounds
    const assembledRounds: PlatformerRound[] = [];
    let hasAll = true;

    for (const c of concepts) {
      const available = collectedRoundsByConcept.get(c.id) || [];
      const orderRound = available.find((r) => r.kind === 'order');
      if (!orderRound) {
        hasAll = false;
        break;
      }
      assembledRounds.push(orderRound);
    }

    if (hasAll && assembledRounds.length === concepts.length) {
      return assembledRounds;
    }
    return null;
  }

  return null;
}

/**
 * Generates content for all segments of a level in parallel with per-segment progress reporting.
 * For revisions, reuses cached content from previous levels before calling Gemini.
 */
export async function generateLevelContent({
  level,
  course,
  segments,
  forceRegenerate = false,
  onSegmentStatus,
  signal,
}: {
  level: Level;
  course: Course;
  segments: LevelSegment[];
  forceRegenerate?: boolean;
  onSegmentStatus?: (gameId: GameChoice, status: 'preparing' | 'done' | 'failed') => void;
  signal?: AbortSignal;
}): Promise<LevelContentData> {
  const isSample = course.sourceName === 'earth_science_water_cycle.pdf';

  // Initialize status for each segment
  segments.forEach((seg) => {
    onSegmentStatus?.(seg.gameId, 'preparing');
  });

  const promises = segments.map(async (seg) => {
    const entry = GAME_REGISTRY[seg.gameId];
    const conceptHash = computeLevelConceptsHash(seg.concepts);

    try {
      // If this is a revision level, check for previously cached revision or re-use from prior levels
      if (level.isRevision && !forceRegenerate) {
        // 1. Direct cached revision check
        let cachedRevisionContent: any = null;
        if (seg.gameId === 'runner') {
          cachedRevisionContent = getCachedQuestions(level.id, conceptHash);
        } else if (seg.gameId === 'lieHunter') {
          cachedRevisionContent = getCachedLieHunterRounds(level.id, conceptHash);
        } else if (seg.gameId === 'platformer') {
          cachedRevisionContent = getCachedPlatformerRounds(level.id, conceptHash);
        }

        if (cachedRevisionContent) {
          onSegmentStatus?.(seg.gameId, 'done');
          return {
            gameId: seg.gameId,
            segmentId: seg.id,
            conceptIds: seg.conceptIds,
            content: cachedRevisionContent,
          } as SegmentContentResult;
        }

        // 2. REUSE BEFORE GENERATING: pick lighter items from earlier levels / sample pools
        const assembled = tryAssembleRevisionContentFromCache({
          gameId: seg.gameId,
          concepts: seg.concepts,
          isSampleCourse: isSample,
        });

        if (assembled) {
          // Cache the assembled revision content so "Play again" does not re-search
          if (seg.gameId === 'runner') {
            saveCachedQuestions(level.id, conceptHash, assembled);
          } else if (seg.gameId === 'lieHunter') {
            saveCachedLieHunterRounds(level.id, conceptHash, assembled);
          } else if (seg.gameId === 'platformer') {
            saveCachedPlatformerRounds(level.id, conceptHash, assembled);
          }

          onSegmentStatus?.(seg.gameId, 'done');
          return {
            gameId: seg.gameId,
            segmentId: seg.id,
            conceptIds: seg.conceptIds,
            content: assembled,
          } as SegmentContentResult;
        }
      }

      // Normal generation via game registry
      const content = await entry.generateContent({
        level,
        course,
        concepts: seg.concepts,
        forceRegenerate,
        signal,
      });

      onSegmentStatus?.(seg.gameId, 'done');
      return {
        gameId: seg.gameId,
        segmentId: seg.id,
        conceptIds: seg.conceptIds,
        content,
      } as SegmentContentResult;
    } catch (err: any) {
      if (signal?.aborted || err?.message === 'ABORTED') {
        throw new Error('ABORTED');
      }
      console.error(`[LevelSession] Segment generation failed for ${seg.gameId}:`, err);
      onSegmentStatus?.(seg.gameId, 'failed');

      return {
        gameId: seg.gameId,
        segmentId: seg.id,
        conceptIds: seg.conceptIds,
        content: null,
        error: {
          message: `Could not load challenges for ${entry.name}.`,
          technical: String(err?.message || err),
        },
      } as SegmentContentResult;
    }
  });

  const results = await Promise.all(promises);
  const failedResults = results.filter((r) => !r.content || r.error);

  return {
    segments: results,
    hasFailure: failedResults.length > 0,
    failedGameIds: failedResults.map((r) => r.gameId),
  };
}

/**
 * Merges multiple segment results into ONE combined LevelResult per Section 8.
 */
export function mergeSegmentResults({
  level,
  practiceMode,
  segments,
  segmentResults,
  overallStatus,
}: {
  level: Level;
  practiceMode: boolean;
  segments: LevelSegment[];
  segmentResults: LevelResult[];
  overallStatus: 'completed' | 'outOfLives' | 'quit';
}): LevelResult {
  let totalScore = 0;
  let maxStreak = 0;
  let lastEndStreak = 0;
  let finalLives = 3;

  const allAnswers: any[] = [];
  const allQuestions: Question[] = [];
  const allRounds: LieHunterRound[] = [];
  const allPlatformerRounds: PlatformerRound[] = [];

  const segmentInfos: SegmentResultInfo[] = [];

  segments.forEach((seg, idx) => {
    const res = segmentResults[idx];
    const conceptNames = seg.concepts.map((c) => c.name);

    if (!res) {
      segmentInfos.push({
        gameId: seg.gameId,
        conceptNames,
        itemsCorrect: 0,
        itemsTotal: 0,
        status: 'notReached',
      });
      return;
    }

    totalScore += res.score || 0;
    maxStreak = Math.max(maxStreak, res.bestStreak || 0);
    lastEndStreak = res.endStreak !== undefined ? res.endStreak : res.bestStreak || 0;
    finalLives = res.livesLeft !== undefined ? res.livesLeft : finalLives;

    if (Array.isArray(res.answers)) {
      allAnswers.push(...res.answers);
    }
    if (Array.isArray(res.questions)) {
      allQuestions.push(...res.questions);
    }
    if (Array.isArray(res.rounds)) {
      allRounds.push(...res.rounds);
    }
    if (Array.isArray(res.platformerRounds)) {
      allPlatformerRounds.push(...res.platformerRounds);
    }

    const correct = res.correctCount || 0;
    const total =
      res.totalQuestions ||
      res.answers?.length ||
      (res.questions ? res.questions.length : 0) ||
      (res.rounds ? res.rounds.length : 0) ||
      1;

    let segStatus: 'completed' | 'outOfLives' | 'notReached' | 'quit' = 'completed';
    if (res.status === 'outOfLives' || res.status === 'out_of_lives') {
      segStatus = 'outOfLives';
    } else if (res.status === 'quit') {
      segStatus = 'quit';
    }

    segmentInfos.push({
      gameId: seg.gameId,
      conceptNames,
      itemsCorrect: correct,
      itemsTotal: total,
      status: segStatus,
    });
  });

  const totalAnswers = allAnswers.length;
  const correctCount = allAnswers.filter((a) => a.correct).length;
  const accuracyPercent = totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0;

  const stars = calculateStars(
    accuracyPercent,
    overallStatus === 'outOfLives' ? 'out_of_lives' : 'completed'
  );

  const xpEarned = calculateXpEarned({
    practiceMode,
    correctCount,
    stars,
    isRevision: level.isRevision,
  });

  return {
    levelId: level.id,
    practiceMode,
    isRevision: level.isRevision,
    status: overallStatus,
    score: totalScore,
    bestStreak: maxStreak,
    endStreak: lastEndStreak,
    livesLeft: finalLives,
    totalQuestions: totalAnswers,
    correctCount,
    accuracyPercent,
    stars,
    xpEarned,
    answers: allAnswers,
    questions: allQuestions,
    rounds: allRounds,
    platformerRounds: allPlatformerRounds,
    segments: segmentInfos,
    level,
  };
}
