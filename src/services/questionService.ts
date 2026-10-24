/**
 * Question Service
 * Handles fetching, caching, intelligent sample lookup, and resilient zero-failure fallback
 * for level and concept questions.
 */

import { Concept, Level, Question, LevelQuestionsData } from '../types/course.ts';
import { computeLevelConceptsHash } from './levelBuilder.ts';
import { SAMPLE_LEVEL_QUESTIONS } from '../data/sampleQuestions.ts';
import { generateFallbackQuestions } from './fallbackQuestionGenerator.ts';

const CACHE_PREFIX = 'studyquest_questions_';

// Index all built-in sample questions by conceptId for instant zero-latency practice lookup
const SAMPLE_QUESTIONS_BY_CONCEPT = new Map<string, Question[]>();
Object.values(SAMPLE_LEVEL_QUESTIONS).forEach((questions) => {
  questions.forEach((q) => {
    const list = SAMPLE_QUESTIONS_BY_CONCEPT.get(q.conceptId) || [];
    list.push(q);
    SAMPLE_QUESTIONS_BY_CONCEPT.set(q.conceptId, list);
  });
});

export function getCachedQuestions(levelId: string, currentHash: string): Question[] | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${levelId}`);
    if (!raw) return null;
    const data: LevelQuestionsData = JSON.parse(raw);
    if (data && data.conceptHash === currentHash && Array.isArray(data.questions) && data.questions.length > 0) {
      return data.questions;
    }
  } catch (err) {
    console.warn(`Failed to read cached questions for ${levelId}:`, err);
  }
  return null;
}

export function saveCachedQuestions(levelId: string, conceptHash: string, questions: Question[]): void {
  try {
    const data: LevelQuestionsData = {
      levelId,
      conceptHash,
      questions,
    };
    localStorage.setItem(`${CACHE_PREFIX}${levelId}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`Failed to cache questions for ${levelId}:`, err);
  }
}

export function clearCachedQuestionsForLevel(levelId: string): void {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${levelId}`);
  } catch (err) {
    console.warn(`Failed to clear cached questions for ${levelId}:`, err);
  }
}

export function clearAllQuestionCaches(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn('Failed to clear all question caches:', err);
  }
}

/**
 * Checks if all requested concepts have authoritative sample questions available.
 */
function findSampleQuestionsForLevel(concepts: Concept[]): Question[] | null {
  if (!concepts || concepts.length === 0) return null;
  const collected: Question[] = [];
  for (const c of concepts) {
    const questions = SAMPLE_QUESTIONS_BY_CONCEPT.get(c.id);
    if (!questions || questions.length === 0) {
      return null; // Not all concepts are in sample dataset
    }
    collected.push(...questions);
  }
  return collected;
}

/**
 * Loads questions for a level, checking cache, sample question bank, server-side Gemini,
 * and resilient local procedural generation fallback.
 */
export async function loadLevelQuestions({
  level,
  courseTitle,
  isSampleCourse,
  forceRegenerate = false,
  signal,
}: {
  level: Level;
  courseTitle: string;
  isSampleCourse?: boolean;
  forceRegenerate?: boolean;
  signal?: AbortSignal;
}): Promise<Question[]> {
  const conceptHash = computeLevelConceptsHash(level.concepts);

  // 1. Check local cache if not forcing regeneration
  if (!forceRegenerate) {
    const cached = getCachedQuestions(level.id, conceptHash);
    if (cached) {
      console.log(`[QuestionService] Using cached questions for level ${level.id}`);
      return cached;
    }

    // 2. Exact match in built-in sample level registry
    if (SAMPLE_LEVEL_QUESTIONS[level.id]) {
      console.log(`[QuestionService] Using built-in sample questions for level ${level.id}`);
      saveCachedQuestions(level.id, conceptHash, SAMPLE_LEVEL_QUESTIONS[level.id]);
      return SAMPLE_LEVEL_QUESTIONS[level.id];
    }

    // 3. Concept-level match in sample questions (e.g. targeted concept practice: practice-ch1-c1)
    const matchingSampleQuestions = findSampleQuestionsForLevel(level.concepts);
    if (matchingSampleQuestions && matchingSampleQuestions.length > 0) {
      console.log(`[QuestionService] Using concept sample questions for level ${level.id}`);
      saveCachedQuestions(level.id, conceptHash, matchingSampleQuestions);
      return matchingSampleQuestions;
    }
  }

  // 4. Request server-side generation via Gemini with strict client-side timeout
  try {
    const fetchTimeoutController = new AbortController();
    const clientTimeoutId = setTimeout(() => {
      fetchTimeoutController.abort();
    }, 8500); // 8.5s maximum client wait

    // Listen to parent signal if provided
    if (signal) {
      signal.addEventListener('abort', () => fetchTimeoutController.abort());
    }

    const response = await fetch('/api/questions/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        levelId: level.id,
        courseTitle,
        concepts: level.concepts,
      }),
      signal: fetchTimeoutController.signal,
    });

    clearTimeout(clientTimeoutId);

    if (response.ok) {
      const result = await response.json();
      const questions: Question[] = result.questions || [];
      if (questions.length > 0) {
        saveCachedQuestions(level.id, conceptHash, questions);
        return questions;
      }
    }
  } catch (fetchErr: any) {
    if (signal?.aborted) {
      throw fetchErr; // User explicitly cancelled
    }
    console.warn('[QuestionService] Server generation encountered issue, engaging resilient fallback:', fetchErr?.message || fetchErr);
  }

  // 5. Zero-failure local procedural generation fallback
  // Generates complete, validated exam questions directly from concept definitions & quotes
  console.log(`[QuestionService] Generating robust procedural challenge for level ${level.id}`);
  const fallback = generateFallbackQuestions(level.concepts);
  saveCachedQuestions(level.id, conceptHash, fallback);
  return fallback;
}
