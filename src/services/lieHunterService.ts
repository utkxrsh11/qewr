/**
 * Lie Hunter Service
 * Manages fetching, validation, caching, shuffling, and game registration metadata
 * for the Lie Hunter game.
 */

import { Concept, Level, LieHunterRound, LieHunterContentData } from '../types/course.ts';
import { computeLevelConceptsHash } from './levelBuilder.ts';
import { SAMPLE_LIE_HUNTER_BOARDS } from '../data/sampleLieHunter.ts';
import { FileSearch } from 'lucide-react';

export const GAME_ID = 'lieHunter' as const;
export const GAME_NAME = 'Lie Hunter';
export const GAME_ICON = FileSearch;
export const SUPPORTED_TYPES = ['fact', 'process', 'detail'] as const;
export const INTRO_LINE = 'Spot the false statement on the evidence board.';
export const CONTROLS_HELP =
  'Select a card (click, tap, or keys 1 to 4), then press Accuse (Enter). H uses the Magnifier. P pauses.';

const CACHE_PREFIX = 'studyquest_content_';
const CACHE_SUFFIX = '_lieHunter';

/**
 * Gets cached Lie Hunter rounds if valid and concept hash matches.
 */
export function getCachedLieHunterRounds(levelId: string, currentHash: string): LieHunterRound[] | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${levelId}${CACHE_SUFFIX}`);
    if (!raw) return null;
    const data: LieHunterContentData = JSON.parse(raw);
    if (data && data.conceptHash === currentHash && Array.isArray(data.rounds) && data.rounds.length > 0) {
      return data.rounds;
    }
  } catch (err) {
    console.warn(`[LieHunter] Failed to read cache for ${levelId}:`, err);
  }
  return null;
}

/**
 * Saves validated Lie Hunter rounds to localStorage.
 */
export function saveCachedLieHunterRounds(
  levelId: string,
  conceptHash: string,
  rounds: LieHunterRound[]
): void {
  try {
    const data: LieHunterContentData = {
      levelId,
      conceptHash,
      rounds,
    };
    localStorage.setItem(`${CACHE_PREFIX}${levelId}${CACHE_SUFFIX}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`[LieHunter] Failed to cache rounds for ${levelId}:`, err);
  }
}

/**
 * Clears the Lie Hunter cache for a level.
 */
export function clearCachedLieHunterForLevel(levelId: string): void {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${levelId}${CACHE_SUFFIX}`);
  } catch (err) {
    console.warn(`[LieHunter] Failed to clear cache for ${levelId}:`, err);
  }
}

/**
 * Shuffles statement order inside every round so the false statement lands at a random position,
 * ensuring across the whole level the false statement is not at the same position in more than
 * 2 consecutive rounds.
 */
export function shuffleLieHunterStatements(rounds: LieHunterRound[]): LieHunterRound[] {
  let prevSlot = -1;
  let streak = 0;

  return rounds.map((round) => {
    const copy = [...round.statements];
    let candidate = [...copy];
    let falseIndex = -1;

    for (let attempts = 0; attempts < 25; attempts++) {
      candidate = [...copy].sort(() => Math.random() - 0.5);
      falseIndex = candidate.findIndex((s) => s.isFalse);
      if (falseIndex !== prevSlot || streak < 2) {
        break;
      }
    }

    if (falseIndex === prevSlot) {
      streak++;
    } else {
      prevSlot = falseIndex;
      streak = 1;
    }

    return {
      ...round,
      statements: candidate,
    };
  });
}

/**
 * Procedural fallback boards for offline / resilient play.
 */
function generateProceduralClientBoards(levelId: string, concepts: Concept[]): LieHunterRound[] {
  const easyRounds: LieHunterRound[] = [];
  const hardRounds: LieHunterRound[] = [];

  concepts.forEach((concept) => {
    const steps = concept.steps && concept.steps.length >= 2 ? concept.steps : null;
    const page = concept.page;
    const sourceQuote = concept.sourceQuote;

    // Easy round
    const easyRoundId = `${levelId}-lh${easyRounds.length + hardRounds.length + 1}`;
    easyRounds.push({
      id: easyRoundId,
      conceptId: concept.id,
      difficulty: 'easy',
      page,
      sourceQuote,
      statements: [
        {
          id: `${easyRoundId}-s1`,
          text: `${concept.name} is a key concept introduced on page ${page}.`,
          isFalse: false,
          basis: concept.name,
        },
        {
          id: `${easyRoundId}-s2`,
          text: concept.summary.length <= 150 ? concept.summary : concept.summary.slice(0, 145) + '.',
          isFalse: false,
          basis: concept.summary.split(' ').slice(0, 5).join(' '),
        },
        {
          id: `${easyRoundId}-s3`,
          text: steps ? steps[0] : `Course records indicate that ${concept.sourceQuote.slice(0, 100)}.`,
          isFalse: false,
          basis: steps ? steps[0] : concept.sourceQuote.split(' ').slice(0, 5).join(' '),
        },
        {
          id: `${easyRoundId}-s4`,
          text: `${concept.name} has been proven completely fictional in modern course study.`,
          isFalse: true,
          original: `${concept.name} is an active, verified mechanism documented in the study material.`,
          alteredPart: 'proven completely fictional in modern course study',
          truePart: 'an active, verified mechanism documented in the study material',
          explanation: `${concept.name} is an authentic, documented scientific concept.`,
          basis: concept.name,
        },
      ],
    });

    // Hard round
    const hardRoundId = `${levelId}-lh${easyRounds.length + hardRounds.length + 2}`;
    hardRounds.push({
      id: hardRoundId,
      conceptId: concept.id,
      difficulty: 'hard',
      page,
      sourceQuote,
      statements: [
        {
          id: `${hardRoundId}-s1`,
          text: steps && steps.length > 1 ? steps[1] : `Key principles of ${concept.name} are outlined on page ${page}.`,
          isFalse: false,
          basis: steps && steps.length > 1 ? steps[1] : concept.name,
        },
        {
          id: `${hardRoundId}-s2`,
          text: `The text states: "${sourceQuote.slice(0, 120)}".`,
          isFalse: false,
          basis: sourceQuote.split(' ').slice(0, 6).join(' '),
        },
        {
          id: `${hardRoundId}-s3`,
          text: steps && steps.length > 2 ? steps[2] : `System properties remain compliant with rules documented on page ${page}.`,
          isFalse: false,
          basis: steps && steps.length > 2 ? steps[2] : concept.name,
        },
        {
          id: `${hardRoundId}-s4`,
          text: `Under standard operations, this mechanism reverses and runs backward.`,
          isFalse: true,
          original: `Under standard operations, this mechanism proceeds in the forward direction.`,
          alteredPart: 'reverses and runs backward',
          truePart: 'proceeds in the forward direction',
          explanation: `The documented mechanism proceeds in the established sequence rather than reversing.`,
          basis: concept.name,
        },
      ],
    });
  });

  return shuffleLieHunterStatements([...easyRounds, ...hardRounds]);
}

/**
 * Loads Lie Hunter rounds for a level:
 * 1. Checks cache (matches hash)
 * 2. Checks sample registry (instant offline play for sample course)
 * 3. Server-side Gemini request with strict client timeout
 * 4. Resilient procedural fallback
 */
export async function loadLieHunterRounds({
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
}): Promise<LieHunterRound[]> {
  const conceptHash = computeLevelConceptsHash(level.concepts);

  // 1. Check local cache
  if (!forceRegenerate) {
    const cached = getCachedLieHunterRounds(level.id, conceptHash);
    if (cached) {
      console.log(`[LieHunter] Using cached rounds for level ${level.id}`);
      return shuffleLieHunterStatements(cached);
    }

    // 2. Exact match in sample course
    if (SAMPLE_LIE_HUNTER_BOARDS[level.id]) {
      console.log(`[LieHunter] Using sample boards for level ${level.id}`);
      const rounds = SAMPLE_LIE_HUNTER_BOARDS[level.id];
      saveCachedLieHunterRounds(level.id, conceptHash, rounds);
      return shuffleLieHunterStatements(rounds);
    }
  }

  // 3. Request server-side generation via Gemini
  try {
    const fetchController = new AbortController();
    const timeoutId = setTimeout(() => {
      fetchController.abort();
    }, 85000); // 85s client timeout (under 90s server timeout)

    if (signal) {
      signal.addEventListener('abort', () => fetchController.abort());
    }

    const response = await fetch('/api/lie-hunter/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        levelId: level.id,
        courseTitle,
        concepts: level.concepts,
      }),
      signal: fetchController.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const rounds: LieHunterRound[] = data.rounds || [];
      if (rounds.length > 0) {
        saveCachedLieHunterRounds(level.id, conceptHash, rounds);
        return shuffleLieHunterStatements(rounds);
      }
    } else {
      const errJson = await response.json().catch(() => ({}));
      console.warn(`[LieHunter] Generation failed with HTTP ${response.status}:`, errJson);
    }
  } catch (err: any) {
    if (signal?.aborted) {
      throw err; // User cancelled
    }
    console.error('LIEHUNTER_GENERATION_FAILED', err?.message || err);
  }

  // 4. Procedural fallback to guarantee zero failures
  console.log(`[LieHunter] Using procedural fallback boards for level ${level.id}`);
  const fallback = generateProceduralClientBoards(level.id, level.concepts);
  saveCachedLieHunterRounds(level.id, conceptHash, fallback);
  return fallback;
}
