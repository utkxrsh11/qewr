/**
 * Revision Planner
 * Selects the optimal candidates, applies chapter variety, rotates game formats
 * via avoidGames, and builds a virtual revision level (Phase 6 Section 5).
 */

import {
  Course,
  StudyQuestProgress,
  ConceptReviewCandidate,
  RevisionPlan,
  RevisionSize,
  Level,
  Concept,
  Chapter,
  GameChoice,
} from '../types/course.ts';
import {
  baseMastery,
  strength,
  stateOf,
  isDue,
  overdueDays,
  priority,
  reasonOf,
  getNow,
} from './masteryModel.ts';
import { selectGame } from './gameRegistry.ts';
import { buildLevels } from './levelBuilder.ts';

export const REVISION_SIZES: Record<
  RevisionSize,
  { count: number; label: string; minutes: number }
> = {
  quick: { count: 4, label: 'Quick', minutes: 3 },
  standard: { count: 6, label: 'Standard', minutes: 6 },
  deep: { count: 9, label: 'Deep', minutes: 10 },
};

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * Builds an optimal Smart Revision plan according to Section 5 rules.
 */
export function buildRevisionPlan(
  course: Course,
  progress: StudyQuestProgress,
  sizeChoice: RevisionSize = 'standard',
  now: number = getNow()
): (RevisionPlan & { concepts: Concept[]; reasons: Record<string, string>; gameByConcept: Record<string, GameChoice> }) | null {
  if (!course || !course.chapters || course.chapters.length === 0) return null;

  const targetSize = REVISION_SIZES[sizeChoice]?.count || 6;
  const allLevels = buildLevels(course);

  // 1. Candidate pool: all concepts with answered > 0
  const candidatePool: Array<{
    concept: Concept;
    chapter: Chapter;
    candidate: ConceptReviewCandidate;
  }> = [];

  course.chapters.forEach((chapter) => {
    (chapter.concepts || []).forEach((concept) => {
      const p = progress.concepts[concept.id];
      if (p && p.answered > 0) {
        const pStrength = strength(p, now);
        const pState = stateOf(p, now);
        const pIsDue = isDue(p, now);
        const pOverdue = overdueDays(p, now);
        const pPriority = priority(p, now);
        const pReason = reasonOf(p, now);

        // Game choice: avoid the game format played last time if possible
        const avoidGames = p.lastGame ? [p.lastGame] : [];
        const suggestedGame = selectGame(concept, { avoidGames });

        const candidate: ConceptReviewCandidate = {
          concept,
          chapter,
          progress: p,
          baseMastery: baseMastery(p),
          strength: pStrength,
          state: pState,
          isDue: pIsDue,
          overdueDays: pOverdue,
          priority: pPriority,
          reason: pReason,
          suggestedGame,
        };

        candidatePool.push({ concept, chapter, candidate });
      }
    });
  });

  // Sort candidate pool by priority descending (ties: older lastPlayed first)
  candidatePool.sort((a, b) => {
    if (b.candidate.priority !== a.candidate.priority) {
      return b.candidate.priority - a.candidate.priority;
    }
    const aTime = a.candidate.progress?.lastPlayed
      ? new Date(a.candidate.progress.lastPlayed).getTime()
      : 0;
    const bTime = b.candidate.progress?.lastPlayed
      ? new Date(b.candidate.progress.lastPlayed).getTime()
      : 0;
    return aTime - bTime;
  });

  // Rule 2 & 3: Take up to 70% of requested size from candidates
  // Only concepts whose state is not "mastered" OR that are due.
  // If not enough, fill with lowest-strength mastered ones.
  const maxCandidates = Math.max(2, Math.round(targetSize * 0.7));
  const chapterCount = course.chapters.length;
  const maxPerChapter = chapterCount > 1 ? Math.max(1, Math.floor(targetSize * 0.6)) : targetSize;

  const urgentCandidates = candidatePool.filter(
    (c) => c.candidate.state !== 'mastered' || c.candidate.isDue
  );
  const masteredCandidates = candidatePool
    .filter((c) => c.candidate.state === 'mastered' && !c.candidate.isDue)
    .sort((a, b) => a.candidate.strength - b.candidate.strength);

  const pickedCandidates: Array<{
    concept: Concept;
    chapter: Chapter;
    candidate: ConceptReviewCandidate;
  }> = [];
  const chapterCounts: Record<string, number> = {};

  const tryAdd = (item: { concept: Concept; chapter: Chapter; candidate: ConceptReviewCandidate }): boolean => {
    if (pickedCandidates.length >= maxCandidates) return false;
    const currentChapterCount = chapterCounts[item.chapter.id] || 0;
    if (currentChapterCount < maxPerChapter) {
      pickedCandidates.push(item);
      chapterCounts[item.chapter.id] = currentChapterCount + 1;
      return true;
    }
    return false;
  };

  // Add urgent candidates first with chapter variety
  for (const item of urgentCandidates) {
    tryAdd(item);
  }

  // If still below maxCandidates and mastered candidates exist, fill with lowest-strength mastered
  if (pickedCandidates.length < maxCandidates) {
    for (const item of masteredCandidates) {
      tryAdd(item);
    }
  }

  // If chapter cap left us short, relax chapter cap for remaining urgent items
  if (pickedCandidates.length < maxCandidates) {
    for (const item of urgentCandidates) {
      if (pickedCandidates.length >= maxCandidates) break;
      if (!pickedCandidates.some((p) => p.concept.id === item.concept.id)) {
        pickedCandidates.push(item);
      }
    }
  }

  // Rule 4: Untouched concepts if coverage < 100% (up to 30% of size, at most 2 concepts)
  const allCourseConcepts = course.chapters.flatMap((ch) => ch.concepts || []);
  const playedConceptIds = new Set(candidatePool.map((c) => c.concept.id));
  const isCoverageBelow100 = playedConceptIds.size < allCourseConcepts.length;

  const pickedUntouched: ConceptReviewCandidate[] = [];
  if (isCoverageBelow100) {
    const maxUntouched = Math.min(2, Math.max(1, Math.round(targetSize * 0.3)));

    // Taken in course order from earliest level not completed yet
    const uncompletedLevels = allLevels.filter((lvl) => !progress.levels[lvl.id]?.completed);
    const searchLevels = uncompletedLevels.length > 0 ? uncompletedLevels : allLevels;

    for (const lvl of searchLevels) {
      for (const concept of lvl.concepts) {
        if (pickedUntouched.length >= maxUntouched) break;
        if (!playedConceptIds.has(concept.id) && !pickedUntouched.some((u) => u.concept.id === concept.id)) {
          const matchingChapter =
            course.chapters.find((ch) => ch.id === lvl.chapterId) || course.chapters[0];
          const suggestedGame = selectGame(concept); // untouched concepts use normal selectGame

          pickedUntouched.push({
            concept,
            chapter: matchingChapter,
            baseMastery: 0,
            strength: 0,
            state: 'untouched',
            isDue: false,
            overdueDays: 0,
            priority: 0,
            reason: 'New material',
            suggestedGame,
            isNew: true,
          });
        }
      }
      if (pickedUntouched.length >= maxUntouched) break;
    }
  }

  const finalCandidates: ConceptReviewCandidate[] = [
    ...pickedCandidates.map((p) => p.candidate),
    ...pickedUntouched,
  ];

  // Rule 5: If fewer than 2 concepts in total, return null (empty state)
  if (finalCandidates.length < 2) {
    return null;
  }

  return assembleRevisionPlan(finalCandidates, sizeChoice);
}

/**
 * Builds a 1-concept revision session: the given concept + up to 2 other low-strength concepts
 * from the same chapter. Supports both (concept, chapterId, progress) and (concept, chapter, course, progress).
 */
export function buildRevisionPlanForConcept(
  concept: Concept,
  chapterOrId: Chapter | string,
  progressOrCourse: StudyQuestProgress | Course,
  progressIfCourse?: StudyQuestProgress,
  now: number = getNow()
): (RevisionPlan & { concepts: Concept[]; reasons: Record<string, string>; gameByConcept: Record<string, GameChoice> }) {
  let progress: StudyQuestProgress;
  let chapter: Chapter;

  if ('chapters' in progressOrCourse) {
    const course = progressOrCourse as Course;
    progress = progressIfCourse || { totalXp: 0, levels: {}, concepts: {} };
    if (typeof chapterOrId === 'string') {
      chapter = course.chapters.find((ch) => ch.id === chapterOrId) || {
        id: chapterOrId,
        title: 'Chapter',
        concepts: [concept],
        pageStart: concept.page || 1,
        pageEnd: concept.page || 1,
      };
    } else {
      chapter = chapterOrId;
    }
  } else {
    progress = progressOrCourse as StudyQuestProgress;
    if (typeof chapterOrId === 'string') {
      chapter = {
        id: chapterOrId,
        title: 'Chapter',
        concepts: [concept],
        pageStart: concept.page || 1,
        pageEnd: concept.page || 1,
      };
    } else {
      chapter = chapterOrId;
    }
  }

  const p = progress.concepts[concept.id];
  const avoidGames = p?.lastGame ? [p.lastGame] : [];
  const primarySuggested = selectGame(concept, { avoidGames });

  const primaryCandidate: ConceptReviewCandidate = {
    concept,
    chapter,
    progress: p,
    baseMastery: baseMastery(p),
    strength: strength(p, now),
    state: stateOf(p, now),
    isDue: isDue(p, now),
    overdueDays: overdueDays(p, now),
    priority: priority(p, now),
    reason: reasonOf(p, now),
    suggestedGame: primarySuggested,
  };

  // Find up to 2 other low-strength concepts from the same chapter
  const otherChapterCandidates: ConceptReviewCandidate[] = [];
  (chapter.concepts || []).forEach((c) => {
    if (c.id === concept.id) return;
    const cp = progress.concepts[c.id];
    const cAvoid = cp?.lastGame ? [cp.lastGame] : [];
    otherChapterCandidates.push({
      concept: c,
      chapter,
      progress: cp,
      baseMastery: baseMastery(cp),
      strength: strength(cp, now),
      state: stateOf(cp, now),
      isDue: isDue(cp, now),
      overdueDays: overdueDays(cp, now),
      priority: priority(cp, now),
      reason: reasonOf(cp, now),
      suggestedGame: selectGame(c, { avoidGames: cAvoid }),
    });
  });

  // Sort other chapter concepts by priority descending
  otherChapterCandidates.sort((a, b) => b.priority - a.priority);
  const companionCandidates = otherChapterCandidates.slice(0, 2);

  const candidates = [primaryCandidate, ...companionCandidates];
  return assembleRevisionPlan(candidates, 'quick');
}

function assembleRevisionPlan(
  candidates: ConceptReviewCandidate[],
  size: RevisionSize | 'custom'
): RevisionPlan & { concepts: Concept[]; reasons: Record<string, string>; gameByConcept: Record<string, GameChoice> } {
  // Sort concepts by lowest strength inside each segment later
  const sortedIds = candidates.map((c) => c.concept.id).sort();
  const hashKey = simpleHash(sortedIds.join('-'));

  const concepts = candidates.map((c) => c.concept);
  const minPage = Math.min(...concepts.map((c) => c.page || 1));
  const maxPage = Math.max(...concepts.map((c) => c.page || minPage));

  const reasons: Record<string, string> = {};
  const gameByConcept: Record<string, GameChoice> = {};

  candidates.forEach((c) => {
    reasons[c.concept.id] = c.reason;
    gameByConcept[c.concept.id] = c.suggestedGame;
  });

  const virtualLevel: Level = {
    id: `rev-${hashKey}`,
    chapterId: 'smart-revision',
    chapterTitle: 'Smart Revision',
    levelNumber: 1,
    concepts,
    pageStart: minPage,
    pageEnd: maxPage,
    isRevision: true,
  };

  return {
    id: `rev-${hashKey}`,
    createdAt: new Date().toISOString(),
    candidates,
    virtualLevel,
    expectedSegments: new Set(candidates.map((c) => c.suggestedGame)).size,
    size,
    concepts,
    reasons,
    gameByConcept,
  };
}
