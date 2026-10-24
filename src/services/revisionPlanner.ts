/**
 * Revision Planner
 * Selects the highest-priority concepts needing review, applies chapter diversity,
 * rotates game formats via avoidGames, and constructs a virtual revision level.
 */

import {
  Course,
  StudyQuestProgress,
  ConceptReviewCandidate,
  RevisionPlan,
  Level,
  Concept,
  Chapter,
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

export interface PlanRevisionOptions {
  maxConcepts?: number; // default 6 (range 5 to 8)
  specificConceptIds?: string[];
}

/**
 * Builds an optimal Smart Revision plan for the student.
 */
export function buildRevisionPlan(
  course: Course,
  progress: StudyQuestProgress,
  options: PlanRevisionOptions = {}
): RevisionPlan | null {
  if (!course || !course.chapters || course.chapters.length === 0) return null;

  const maxCount = Math.min(8, Math.max(3, options.maxConcepts || 6));
  const now = getNow();

  // Map each concept to candidate with chapter reference
  const candidatePool: Array<{
    concept: Concept;
    chapter: Chapter;
    candidate: ConceptReviewCandidate;
  }> = [];

  course.chapters.forEach((chapter) => {
    (chapter.concepts || []).forEach((concept) => {
      const p = progress.concepts[concept.id];
      const pStrength = strength(p, now);
      const pState = stateOf(p, now);
      const pIsDue = isDue(p, now);
      const pOverdue = overdueDays(p, now);
      const pPriority = priority(p, now);
      const pReason = reasonOf(p, now);

      // Rotate game: avoid the game format played most recently if possible
      const avoidGames = p?.lastGame ? [p.lastGame] : [];
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
    });
  });

  if (candidatePool.length === 0) return null;

  // If specific concepts requested (e.g. from single-concept Revise button)
  if (options.specificConceptIds && options.specificConceptIds.length > 0) {
    const selected = candidatePool
      .filter((item) => options.specificConceptIds!.includes(item.concept.id))
      .map((item) => item.candidate);

    if (selected.length > 0) {
      return createRevisionPlanFromCandidates(selected);
    }
  }

  // Sort candidate pool by priority descending
  candidatePool.sort((a, b) => b.candidate.priority - a.candidate.priority);

  // Apply chapter diversity: max 3 concepts per chapter if multiple chapters exist
  const chapterCount = course.chapters.length;
  const maxPerChapter = chapterCount > 1 ? 3 : maxCount;

  const chapterCounts: Record<string, number> = {};
  const selectedCandidates: ConceptReviewCandidate[] = [];

  for (const item of candidatePool) {
    if (selectedCandidates.length >= maxCount) break;

    const count = chapterCounts[item.chapter.id] || 0;
    if (count < maxPerChapter) {
      selectedCandidates.push(item.candidate);
      chapterCounts[item.chapter.id] = count + 1;
    }
  }

  // If diversity filter kept us below 5 and more items are available, fill up to maxCount
  if (selectedCandidates.length < Math.min(5, candidatePool.length)) {
    for (const item of candidatePool) {
      if (selectedCandidates.length >= maxCount) break;
      if (!selectedCandidates.some((c) => c.concept.id === item.concept.id)) {
        selectedCandidates.push(item.candidate);
      }
    }
  }

  return createRevisionPlanFromCandidates(selectedCandidates);
}

function createRevisionPlanFromCandidates(
  candidates: ConceptReviewCandidate[]
): RevisionPlan {
  const timestamp = Date.now();
  const concepts = candidates.map((c) => c.concept);
  const minPage = Math.min(...concepts.map((c) => c.page || 1));
  const maxPage = Math.max(...concepts.map((c) => c.page || minPage));

  const virtualLevel: Level = {
    id: `rev-${timestamp}`,
    chapterId: 'revision',
    chapterTitle: 'Smart Revision',
    levelNumber: 1,
    concepts,
    pageStart: minPage,
    pageEnd: maxPage,
    isRevision: true,
  };

  return {
    id: `rev-${timestamp}`,
    createdAt: new Date(timestamp).toISOString(),
    candidates,
    virtualLevel,
    expectedSegments: new Set(candidates.map((c) => c.suggestedGame)).size,
  };
}
