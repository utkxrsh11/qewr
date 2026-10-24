/**
 * Course Validator
 * Validates course data against Phase 1 specifications.
 */

import { Course, ValidationResult } from '../types/course.ts';

export function validateCourse(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Course data must be a valid JSON object.'] };
  }

  // courseTitle is a non-empty string
  if (typeof data.courseTitle !== 'string' || !data.courseTitle.trim()) {
    errors.push('Course title ("courseTitle") must be a non-empty string.');
  }

  // totalPages validation
  const totalPages = Number(data.totalPages);
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    errors.push('Total pages ("totalPages") must be an integer greater than or equal to 1.');
  }

  // chapters is a non-empty array
  if (!Array.isArray(data.chapters) || data.chapters.length === 0) {
    errors.push('Chapters ("chapters") must be a non-empty array containing at least one chapter.');
    return { isValid: false, errors };
  }

  const seenIds = new Set<string>();

  data.chapters.forEach((chapter: any, chIndex: number) => {
    const chapterRef = `Chapter #${chIndex + 1}${chapter?.title ? ` ("${chapter.title}")` : ''}`;

    if (!chapter || typeof chapter !== 'object') {
      errors.push(`${chapterRef} is not a valid object.`);
      return;
    }

    if (typeof chapter.id !== 'string' || !chapter.id.trim()) {
      errors.push(`${chapterRef} is missing a valid string "id".`);
    } else {
      if (seenIds.has(chapter.id)) {
        errors.push(`Duplicate ID "${chapter.id}" detected in ${chapterRef}. All IDs must be unique.`);
      }
      seenIds.add(chapter.id);
    }

    if (typeof chapter.title !== 'string' || !chapter.title.trim()) {
      errors.push(`${chapterRef} is missing a non-empty "title".`);
    }

    const pageStart = Number(chapter.pageStart);
    const pageEnd = Number(chapter.pageEnd);

    if (!Number.isInteger(pageStart) || pageStart < 1) {
      errors.push(`${chapterRef}: "pageStart" must be an integer >= 1.`);
    }

    if (!Number.isInteger(pageEnd) || pageEnd < 1) {
      errors.push(`${chapterRef}: "pageEnd" must be an integer >= 1.`);
    }

    if (Number.isInteger(pageStart) && Number.isInteger(pageEnd) && pageStart > pageEnd) {
      errors.push(`${chapterRef}: "pageStart" (${pageStart}) cannot be greater than "pageEnd" (${pageEnd}).`);
    }

    // every chapter has a non-empty concepts array
    if (!Array.isArray(chapter.concepts) || chapter.concepts.length === 0) {
      errors.push(`${chapterRef} must have a non-empty "concepts" array.`);
      return;
    }

    chapter.concepts.forEach((concept: any, cIndex: number) => {
      const conceptRef = `Concept #${cIndex + 1}${concept?.name ? ` ("${concept.name}")` : ''} in ${chapterRef}`;

      if (!concept || typeof concept !== 'object') {
        errors.push(`${conceptRef} is not a valid object.`);
        return;
      }

      if (typeof concept.id !== 'string' || !concept.id.trim()) {
        errors.push(`${conceptRef} is missing a valid string "id".`);
      } else {
        if (seenIds.has(concept.id)) {
          errors.push(`Duplicate ID "${concept.id}" detected in ${conceptRef}. All IDs must be unique across the course.`);
        }
        seenIds.add(concept.id);
      }

      if (typeof concept.name !== 'string' || !concept.name.trim()) {
        errors.push(`${conceptRef} is missing a non-empty "name".`);
      }

      if (typeof concept.summary !== 'string' || !concept.summary.trim()) {
        errors.push(`${conceptRef} is missing a non-empty "summary".`);
      }

      if (!['fact', 'process', 'detail'].includes(concept.type)) {
        errors.push(`${conceptRef} "type" must be exactly one of "fact", "process", or "detail" (received: "${concept.type}").`);
      }

      const page = Number(concept.page);
      if (!Number.isInteger(page)) {
        errors.push(`${conceptRef}: "page" must be an integer.`);
      } else if (totalPages > 0 && (page < 1 || page > totalPages)) {
        errors.push(`${conceptRef}: "page" (${page}) must be between 1 and totalPages (${totalPages}).`);
      }

      if (typeof concept.sourceQuote !== 'string' || !concept.sourceQuote.trim()) {
        errors.push(`${conceptRef} is missing a non-empty "sourceQuote".`);
      }

      if (concept.type === 'process') {
        if (!Array.isArray(concept.steps) || concept.steps.length < 2) {
          errors.push(`${conceptRef} is of type "process" and must have a "steps" array with at least 2 items.`);
        } else {
          const invalidSteps = concept.steps.filter((s: any) => typeof s !== 'string' || !s.trim());
          if (invalidSteps.length > 0) {
            errors.push(`${conceptRef}: all items in "steps" must be non-empty strings.`);
          }
        }
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
