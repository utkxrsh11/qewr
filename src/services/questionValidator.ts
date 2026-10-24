/**
 * Question Validator and Shuffler
 * Enforces Phase 2 question schema, auto-repairs page/sourceQuote from authoritative concept data,
 * and shuffles question order so concepts are interleaved while keeping easy before hard.
 */

import { Concept, Question, ValidationResult } from '../types/course.ts';

export function validateAndCleanQuestions(
  rawQuestions: any[],
  levelConcepts: Concept[]
): { isValid: boolean; errors: string[]; questions: Question[] } {
  const errors: string[] = [];
  const conceptMap = new Map<string, Concept>();
  levelConcepts.forEach((c) => conceptMap.set(c.id, c));

  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    return {
      isValid: false,
      errors: ['Questions must be a non-empty array.'],
      questions: [],
    };
  }

  const expectedTotal = levelConcepts.length * 3;
  if (rawQuestions.length !== expectedTotal) {
    errors.push(`Expected exactly ${expectedTotal} questions (3 per concept), but received ${rawQuestions.length}.`);
  }

  const seenIds = new Set<string>();
  const conceptQuestionCounts = new Map<string, number>();
  const validatedList: Question[] = [];

  rawQuestions.forEach((q: any, idx: number) => {
    const qRef = `Question #${idx + 1}${q?.id ? ` (${q.id})` : ''}`;

    if (!q || typeof q !== 'object') {
      errors.push(`${qRef} is not a valid JSON object.`);
      return;
    }

    if (typeof q.id !== 'string' || !q.id.trim()) {
      errors.push(`${qRef} is missing a valid string id.`);
    } else {
      if (seenIds.has(q.id)) {
        errors.push(`Duplicate question id "${q.id}" detected.`);
      }
      seenIds.add(q.id);
    }

    if (typeof q.conceptId !== 'string' || !conceptMap.has(q.conceptId)) {
      errors.push(`${qRef} has unknown or missing conceptId "${q.conceptId}".`);
      return;
    }

    const concept = conceptMap.get(q.conceptId)!;
    conceptQuestionCounts.set(q.conceptId, (conceptQuestionCounts.get(q.conceptId) || 0) + 1);

    if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
      errors.push(`${qRef} difficulty must be "easy", "medium", or "hard" (received: "${q.difficulty}").`);
    }

    const questionText = typeof q.question === 'string' ? q.question.trim() : '';
    if (!questionText) {
      errors.push(`${qRef} has empty question text.`);
    } else if (questionText.length > 250) {
      errors.push(`${qRef} question exceeds 200 characters limit (${questionText.length} chars).`);
    }

    if (!Array.isArray(q.options) || q.options.length !== 3) {
      errors.push(`${qRef} must have exactly 3 answer options.`);
    } else {
      const distinctOptions = new Set(q.options.map((o: any) => String(o || '').trim().toLowerCase()));
      if (distinctOptions.size !== 3) {
        errors.push(`${qRef} options must all be distinct from one another.`);
      }
      q.options.forEach((opt: any, optIdx: number) => {
        const optStr = String(opt || '').trim();
        if (!optStr) {
          errors.push(`${qRef} option #${optIdx + 1} is empty.`);
        } else if (optStr.length > 100) {
          errors.push(`${qRef} option #${optIdx + 1} exceeds length limit (${optStr.length} chars).`);
        }
      });
    }

    const correctIndex = Number(q.correctIndex);
    if (![0, 1, 2].includes(correctIndex)) {
      errors.push(`${qRef} correctIndex must be 0, 1, or 2 (received: ${q.correctIndex}).`);
    }

    const explanation = typeof q.explanation === 'string' ? q.explanation.trim() : '';
    if (!explanation) {
      errors.push(`${qRef} is missing an explanation.`);
    }

    // Overwrite page and sourceQuote from authoritative concept data per specification
    const fixedPage = concept.page;
    const fixedQuote = concept.sourceQuote;

    const cleanedQ: Question = {
      id: String(q.id || `q-${idx + 1}`).trim(),
      conceptId: concept.id,
      difficulty: q.difficulty === 'hard' || q.difficulty === 'medium' ? q.difficulty : 'easy',
      question: questionText,
      options: [
        String(q.options?.[0] || 'Option A').trim(),
        String(q.options?.[1] || 'Option B').trim(),
        String(q.options?.[2] || 'Option C').trim(),
      ],
      correctIndex: (correctIndex === 0 || correctIndex === 1 || correctIndex === 2 ? correctIndex : 0) as 0 | 1 | 2,
      explanation,
      page: fixedPage,
      sourceQuote: fixedQuote,
    };

    validatedList.push(cleanedQ);
  });

  return {
    isValid: errors.length === 0,
    errors,
    questions: validatedList,
  };
}

/**
 * Shuffles questions so concepts are mixed, but preserves easy -> medium -> hard progression for each concept.
 */
export function shuffleQuestionsWithProgression(questions: Question[]): Question[] {
  // Group by difficulty: tier 0 = easy, tier 1 = medium, tier 2 = hard
  const easy = questions.filter((q) => q.difficulty === 'easy');
  const medium = questions.filter((q) => q.difficulty === 'medium');
  const hard = questions.filter((q) => q.difficulty === 'hard');

  // Simple Fisher-Yates shuffle
  const shuffleArray = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const shuffledEasy = shuffleArray(easy);
  const shuffledMedium = shuffleArray(medium);
  const shuffledHard = shuffleArray(hard);

  // Return sequential tiers: all easy (interleaved concepts), then medium, then hard
  return [...shuffledEasy, ...shuffledMedium, ...shuffledHard];
}
