/**
 * Course Cleaner
 * Cleans validated course data according to Phase 1 rules:
 * - Trims whitespace from all strings
 * - Removes duplicate concepts (case-insensitive name) within a chapter
 * - Re-generates clean IDs: ch{N} and ch{N}-c{M}
 * - Expands chapter pageStart / pageEnd to contain all its concepts' pages
 * - Sorts chapters by pageStart and concepts by page
 * - Caps very long summaries at 300 characters (cutting at the last full word with ellipsis)
 */

import { Course, Chapter, Concept } from '../types/course.ts';

function truncateSummary(text: string, maxLength = 300): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const cut = trimmed.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 0) {
    return cut.slice(0, lastSpace).trim() + '...';
  }
  return cut.trim() + '...';
}

function cleanString(str: any): string {
  if (typeof str !== 'string') return '';
  return str.trim();
}

export function cleanCourse(course: Course): Course {
  const cleanedTitle = cleanString(course.courseTitle) || 'Untitled Course';
  const cleanedSourceName = cleanString(course.sourceName) || 'document.pdf';
  const totalPages = Math.max(1, Number(course.totalPages) || 1);

  // 1. Process chapters and concepts
  let chapters: Chapter[] = (course.chapters || []).map((chapter, chIdx) => {
    const chapterTitle = cleanString(chapter.title) || `Chapter ${chIdx + 1}`;
    let pageStart = Math.max(1, Number(chapter.pageStart) || 1);
    let pageEnd = Math.max(pageStart, Number(chapter.pageEnd) || pageStart);

    // Filter duplicates within chapter (case-insensitive concept name)
    const seenNames = new Set<string>();
    const cleanedConcepts: Concept[] = [];

    (chapter.concepts || []).forEach((concept) => {
      const name = cleanString(concept.name);
      if (!name) return;

      const lowerName = name.toLowerCase();
      if (seenNames.has(lowerName)) {
        return; // Skip duplicate concept within chapter
      }
      seenNames.add(lowerName);

      const conceptPage = Math.max(1, Math.min(totalPages, Number(concept.page) || 1));
      const summary = truncateSummary(cleanString(concept.summary));
      const sourceQuote = cleanString(concept.sourceQuote);

      // Expand chapter page bounds if concept page is outside
      if (conceptPage < pageStart) {
        pageStart = conceptPage;
      }
      if (conceptPage > pageEnd) {
        pageEnd = conceptPage;
      }

      const cleanedConcept: Concept = {
        id: '', // Will be assigned during re-indexing
        name,
        summary,
        type: concept.type === 'process' || concept.type === 'detail' ? concept.type : 'fact',
        page: conceptPage,
        sourceQuote,
      };

      if (cleanedConcept.type === 'process') {
        const steps = Array.isArray(concept.steps)
          ? concept.steps.map(cleanString).filter(Boolean)
          : [];
        cleanedConcept.steps = steps.length >= 2 ? steps : [
          'Initiate procedure from source document',
          'Complete subsequent operational steps',
        ];
      }

      cleanedConcepts.push(cleanedConcept);
    });

    // Sort concepts within chapter by page number
    cleanedConcepts.sort((a, b) => a.page - b.page);

    return {
      id: '', // Will be assigned during re-indexing
      title: chapterTitle,
      pageStart,
      pageEnd,
      concepts: cleanedConcepts,
    };
  });

  // Filter out any empty chapters (if any)
  chapters = chapters.filter((ch) => ch.concepts.length > 0);

  // Sort chapters by pageStart
  chapters.sort((a, b) => a.pageStart - b.pageStart);

  // Re-generate IDs in the clean pattern ch{N} and ch{N}-c{M}
  chapters = chapters.map((chapter, chIdx) => {
    const chId = `ch${chIdx + 1}`;
    const conceptsWithCleanIds = chapter.concepts.map((concept, cIdx) => ({
      ...concept,
      id: `${chId}-c${cIdx + 1}`,
    }));

    return {
      ...chapter,
      id: chId,
      concepts: conceptsWithCleanIds,
    };
  });

  // Calculate highest page across all concepts to guarantee totalPages consistency
  let calculatedMaxPage = totalPages;
  for (const ch of chapters) {
    if (ch.pageEnd > calculatedMaxPage) calculatedMaxPage = ch.pageEnd;
    for (const c of ch.concepts) {
      if (c.page > calculatedMaxPage) calculatedMaxPage = c.page;
    }
  }

  return {
    courseTitle: cleanedTitle,
    sourceName: cleanedSourceName,
    totalPages: calculatedMaxPage,
    createdAt: course.createdAt || new Date().toISOString(),
    chapters,
  };
}
