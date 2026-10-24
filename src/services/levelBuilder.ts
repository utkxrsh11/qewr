/**
 * Level Builder
 * Partitions chapters into balanced levels of 2 to 4 concepts according to Phase 2 rules.
 */

import { Course, Chapter, Concept, Level } from '../types/course.ts';

/**
 * Computes optimal bucket sizes for N concepts:
 * - Each bucket between 2 and 4 concepts (unless total N == 1)
 * - Split as evenly as possible
 * - Never leaves a 1-concept leftover
 * - Never exceeds 4 concepts per level
 */
export function partitionConceptCounts(n: number): number[] {
  if (n <= 0) return [];
  if (n <= 4) return [n];

  // Desired average target is 3 concepts per level
  let k = Math.round(n / 3);

  // Ensure maximum size does not exceed 4
  while (Math.ceil(n / k) > 4) {
    k++;
  }

  // Ensure minimum size is at least 2 (unless k == 1)
  while (Math.floor(n / k) < 2 && k > 1) {
    k--;
  }

  const base = Math.floor(n / k);
  const remainder = n % k;
  const counts: number[] = [];

  for (let i = 0; i < k; i++) {
    counts.push(i < remainder ? base + 1 : base);
  }

  return counts;
}

/**
 * Builds all playable levels for a course at runtime.
 */
export function buildLevels(course: Course): Level[] {
  const allLevels: Level[] = [];

  (course.chapters || []).forEach((chapter, chIdx) => {
    const concepts = chapter.concepts || [];
    if (concepts.length === 0) return;

    const counts = partitionConceptCounts(concepts.length);
    let offset = 0;

    counts.forEach((count, levelIdx) => {
      const levelConcepts = concepts.slice(offset, offset + count);
      offset += count;

      const pageStart = Math.min(...levelConcepts.map((c) => c.page));
      const pageEnd = Math.max(...levelConcepts.map((c) => c.page));

      allLevels.push({
        id: `${chapter.id}-L${levelIdx + 1}`,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        levelNumber: levelIdx + 1,
        concepts: levelConcepts,
        pageStart,
        pageEnd,
      });
    });
  });

  return allLevels;
}

/**
 * Computes a lightweight stable hash of a level's concepts for question caching.
 */
export function computeLevelConceptsHash(concepts: Concept[]): string {
  const str = concepts
    .map((c) => `${c.id}:${c.name}:${c.summary.slice(0, 30)}:${c.page}`)
    .join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `h_${Math.abs(hash).toString(36)}`;
}
