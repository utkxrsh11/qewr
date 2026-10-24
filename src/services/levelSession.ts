/**
 * Level Session Module
 * Manages partitioning levels into sequential game segments, parallel content loading,
 * cross-segment shared lives/streak state, and unified result merging.
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
import { clearCachedQuestionsForLevel } from './questionService.ts';
import { clearCachedLieHunterForLevel } from './lieHunterService.ts';
import { clearCachedPlatformerForLevel } from './platformerService.ts';
import { calculateStars, calculateXpEarned } from './progressService.ts';

/**
 * Groups a level's concepts into sequential segments by chosen game,
 * ordered by the page of the first concept in each segment.
 */
export function buildLevelSegments(level: Level, options?: SelectGameOptions): LevelSegment[] {
  const concepts = level.concepts || [];
  if (concepts.length === 0) return [];

  // Group concepts by game
  const gameGroups = new Map<GameChoice, Concept[]>();

  concepts.forEach((concept) => {
    const chosenGame = selectGame(concept, options);
    const existing = gameGroups.get(chosenGame) || [];
    existing.push(concept);
    gameGroups.set(chosenGame, existing);
  });

  // Convert to segments and sort by earliest page of concept
  const segments: Array<{
    gameId: GameChoice;
    concepts: Concept[];
    firstPage: number;
  }> = [];

  gameGroups.forEach((groupConcepts, gameId) => {
    const firstPage = Math.min(...groupConcepts.map((c) => c.page));
    segments.push({
      gameId,
      concepts: groupConcepts,
      firstPage,
    });
  });

  // Sort by firstPage ascending
  segments.sort((a, b) => a.firstPage - b.firstPage);

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
 * Clears ALL game caches for a level.
 */
export function clearAllLevelCaches(levelId: string): void {
  clearCachedQuestionsForLevel(levelId);
  clearCachedLieHunterForLevel(levelId);
  clearCachedPlatformerForLevel(levelId);
}

/**
 * Generates content for all segments of a level in parallel with per-segment progress reporting.
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
  // Initialize status for each segment
  segments.forEach((seg) => {
    onSegmentStatus?.(seg.gameId, 'preparing');
  });

  const promises = segments.map(async (seg) => {
    const entry = GAME_REGISTRY[seg.gameId];
    try {
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

    if (res) {
      totalScore += res.score || 0;
      maxStreak = Math.max(maxStreak, res.bestStreak || 0);
      lastEndStreak = res.endStreak ?? 0;
      finalLives = res.livesLeft;

      if (res.answers) {
        allAnswers.push(...res.answers);
      }
      if (res.questions) {
        allQuestions.push(...res.questions);
      }
      if (res.rounds) {
        allRounds.push(...res.rounds);
      }
      if (res.platformerRounds) {
        allPlatformerRounds.push(...res.platformerRounds);
      }

      const itemsCorrect = (res.answers || []).filter((a: any) => a.correct).length;
      const itemsTotal = (res.answers || []).length;

      segmentInfos.push({
        gameId: seg.gameId,
        conceptNames,
        itemsCorrect,
        itemsTotal,
        status: res.status === 'outOfLives' || res.status === 'out_of_lives' ? 'outOfLives' : 'completed',
      });
    } else {
      // Unplayed segment after out of lives
      segmentInfos.push({
        gameId: seg.gameId,
        conceptNames,
        itemsCorrect: 0,
        itemsTotal: 0,
        status: 'notReached',
      });
    }
  });

  const firstTryCorrectCount = allAnswers.filter((a: any) => a.correct).length;
  const totalItemsCount = Math.max(1, allAnswers.length);
  const accuracyPercent = Math.round((firstTryCorrectCount / totalItemsCount) * 100);
  const finalResultStatus = overallStatus === 'outOfLives' ? 'out_of_lives' : 'completed';
  const stars = calculateStars(accuracyPercent, finalResultStatus);
  const xpEarned = calculateXpEarned({
    practiceMode,
    correctCount: firstTryCorrectCount,
    stars,
  });

  return {
    levelId: level.id,
    practiceMode,
    status: overallStatus === 'outOfLives' ? 'outOfLives' : overallStatus === 'quit' ? 'quit' : 'completed',
    score: totalScore,
    bestStreak: maxStreak,
    endStreak: lastEndStreak,
    livesLeft: finalLives,
    totalQuestions: totalItemsCount,
    correctCount: firstTryCorrectCount,
    accuracyPercent,
    stars,
    xpEarned,
    answers: allAnswers,
    questions: allQuestions.length > 0 ? allQuestions : undefined,
    rounds: allRounds.length > 0 ? allRounds : undefined,
    platformerRounds: allPlatformerRounds.length > 0 ? allPlatformerRounds : undefined,
    segments: segmentInfos,
    level,
  };
}
