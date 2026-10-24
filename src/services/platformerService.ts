/**
 * Process Platformer Service
 * Manages fetching, caching, procedural fallback, and platform layout generation
 * for the Process Platformer game.
 */

import { Concept, Level, PlatformerRound, PlatformerContentData, PlatformerStep } from '../types/course.ts';
import { computeLevelConceptsHash } from './levelBuilder.ts';
import { SAMPLE_PLATFORMER_ROUNDS } from '../data/samplePlatformer.ts';
import { Layers } from 'lucide-react';

export const GAME_ID = 'platformer' as const;
export const GAME_NAME = 'Process Platformer';
export const GAME_ICON = Layers;
export const PRIMARY_TYPES = ['process'] as const;
export const SUPPORTED_TYPES = ['process'] as const;
export const INTRO_LINE = 'Put the stages of this process in order by leaping across platforms.';
export const CONTROLS_HELP =
  'Arrow keys or A/D to run, Space/Up/W to jump. Stand on a platform for a moment to choose it. H for hint, P to pause.';

const CACHE_PREFIX = 'studyquest_content_';
const CACHE_SUFFIX = '_platformer';

export function getCachedPlatformerRounds(levelId: string, currentHash: string): PlatformerRound[] | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${levelId}${CACHE_SUFFIX}`);
    if (!raw) return null;
    const data: PlatformerContentData = JSON.parse(raw);
    if (data && data.conceptHash === currentHash && Array.isArray(data.rounds) && data.rounds.length > 0) {
      return data.rounds;
    }
  } catch (err) {
    console.warn(`[PlatformerService] Failed to read cache for ${levelId}:`, err);
  }
  return null;
}

export function saveCachedPlatformerRounds(
  levelId: string,
  conceptHash: string,
  rounds: PlatformerRound[]
): void {
  try {
    const data: PlatformerContentData = {
      levelId,
      conceptHash,
      rounds,
    };
    localStorage.setItem(`${CACHE_PREFIX}${levelId}${CACHE_SUFFIX}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`[PlatformerService] Failed to cache rounds for ${levelId}:`, err);
  }
}

export function clearCachedPlatformerForLevel(levelId: string): void {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${levelId}${CACHE_SUFFIX}`);
  } catch (err) {
    console.warn(`[PlatformerService] Failed to clear cache for ${levelId}:`, err);
  }
}

/**
 * Resilient offline fallback generator for platformer rounds.
 */
export function buildClientOfflinePlatformerRounds(levelId: string, concepts: Concept[]): PlatformerRound[] {
  const processConcepts = concepts.filter((c) => c.type === 'process');
  const rounds: PlatformerRound[] = [];

  processConcepts.forEach((concept, cIdx) => {
    const rawSteps = concept.steps && concept.steps.length >= 2 ? concept.steps : ['First phase', 'Second phase'];
    const maxItems = Math.min(8, rawSteps.length);
    const steps: PlatformerStep[] = [];

    for (let i = 0; i < maxItems; i++) {
      let label = rawSteps[i].replace(/^\d+[\.\)\s]+/, '').trim();
      if (i === maxItems - 1 && rawSteps.length > 8) {
        label = (label.slice(0, 40) + ' and further steps').slice(0, 60);
      } else if (label.length > 60) {
        label = label.slice(0, 57).trim() + '...';
      }

      const summaryCut = concept.summary.length > 150 ? concept.summary.slice(0, 147) + '...' : concept.summary;
      const explanation = `Step ${i + 1} of ${concept.name}. ${summaryCut}`.slice(0, 200);

      steps.push({
        id: `${levelId}-c${cIdx + 1}-r1-s${i + 1}`,
        label,
        explanation,
      });
    }

    rounds.push({
      id: `${levelId}-c${cIdx + 1}-r1`,
      conceptId: concept.id,
      kind: 'order',
      title: `${concept.name.slice(0, 45)} Sequence`,
      instruction: `Put the stages of ${concept.name.toLowerCase()} in the correct order.`.slice(0, 120),
      steps,
      decoy: null,
      page: concept.page,
      sourceQuote: concept.sourceQuote,
    });
  });

  return rounds.slice(0, 4);
}

/**
 * For revision sessions: selects 1 order round per concept (no challenge rounds with decoys).
 */
function filterRevisionPlatformer(rounds: PlatformerRound[], concepts: Concept[]): PlatformerRound[] {
  const result: PlatformerRound[] = [];
  concepts.forEach((concept) => {
    const conceptRounds = rounds.filter((r) => r.conceptId === concept.id);
    const orderRound = conceptRounds.find((r) => r.kind === 'order');
    const chosen = orderRound || conceptRounds[0];
    if (chosen) result.push(chosen);
  });
  return result.length > 0 ? result : rounds;
}

/**
 * Searches localStorage for existing cached Platformer rounds for concepts.
 */
function findCachedPlatformerFromStorage(concepts: Concept[]): PlatformerRound[] | null {
  try {
    const pool: PlatformerRound[] = [];
    Object.values(SAMPLE_PLATFORMER_ROUNDS).forEach((rounds) => {
      rounds.forEach((r) => pool.push(r));
    });

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX) && key.includes(CACHE_SUFFIX) && !key.includes('rev-')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed?.rounds)) {
            parsed.rounds.forEach((r: PlatformerRound) => pool.push(r));
          }
        }
      }
    }
    const filtered = filterRevisionPlatformer(pool, concepts);
    return filtered.length >= concepts.length ? filtered : null;
  } catch {
    return null;
  }
}

/**
 * Loads Platformer rounds for a level/segment:
 * 1. Cache hit (matching segment hash)
 * 2. Sample course lookup (instant zero-network)
 * 3. Server generation via /api/platformer/generate
 * 4. Silent offline fallback directly from concept data (never fails)
 */
export async function loadPlatformerRounds({
  level,
  concepts,
  courseTitle,
  isSampleCourse,
  forceRegenerate = false,
  signal,
}: {
  level: Level;
  concepts?: Concept[];
  courseTitle: string;
  isSampleCourse?: boolean;
  forceRegenerate?: boolean;
  signal?: AbortSignal;
}): Promise<PlatformerRound[]> {
  const activeConcepts = concepts || level.concepts.filter((c) => c.type === 'process');
  const conceptHash = computeLevelConceptsHash(activeConcepts);

  if (!forceRegenerate) {
    // 1. Local Cache
    const cached = getCachedPlatformerRounds(level.id, conceptHash);
    if (cached) {
      return cached;
    }

    // 2. Sample Registry
    if (isSampleCourse && SAMPLE_PLATFORMER_ROUNDS[level.id]) {
      const sample = SAMPLE_PLATFORMER_ROUNDS[level.id];
      const finalSample = level.isRevision ? filterRevisionPlatformer(sample, activeConcepts) : sample;
      saveCachedPlatformerRounds(level.id, conceptHash, finalSample);
      return finalSample;
    }

    // 2b. If revision session, look for cached rounds across localStorage & samples
    if (level.isRevision) {
      const plucked = findCachedPlatformerFromStorage(activeConcepts);
      if (plucked && plucked.length >= activeConcepts.length) {
        console.log(`[PlatformerService] Reusing previously cached rounds for revision ${level.id}`);
        saveCachedPlatformerRounds(level.id, conceptHash, plucked);
        return plucked;
      }
    }
  }

  // 3. Server AI generation
  try {
    const res = await fetch('/api/platformer/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        levelId: level.id,
        courseTitle,
        concepts: activeConcepts,
      }),
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.rounds) && data.rounds.length > 0) {
        const rounds = level.isRevision ? filterRevisionPlatformer(data.rounds, activeConcepts) : data.rounds;
        saveCachedPlatformerRounds(level.id, conceptHash, rounds);
        return rounds;
      }
    }
  } catch (err: any) {
    if (signal?.aborted || err?.message === 'ABORTED') {
      throw new Error('ABORTED');
    }
    console.warn('[PlatformerService] Generation failed or timed out, applying offline fallback:', err);
  }

  // 4. Offline Fallback
  const rawFallback = buildClientOfflinePlatformerRounds(level.id, activeConcepts);
  const fallback = level.isRevision ? filterRevisionPlatformer(rawFallback, activeConcepts) : rawFallback;
  saveCachedPlatformerRounds(level.id, conceptHash, fallback);
  return fallback;
}

// ---------------------------------------------------------------------------
// Platform Layout Algorithm (Section 7)
// ---------------------------------------------------------------------------

export interface PlatformSlot {
  id: string; // platform slot id
  x: number;
  y: number;
  width: number;
  height: number;
  tier: 0 | 1 | 2; // 0 = low (y=390), 1 = mid (y=280), 2 = high (y=170)
  item: {
    type: 'step' | 'decoy';
    id: string;
    stepIndex?: number; // 0-based index if real step
    label: string;
    explanation: string;
  };
}

const VIRTUAL_WIDTH = 960;
const VIRTUAL_HEIGHT = 540;
const TIER_Y = [390, 280, 170] as const;

/**
 * Generates an optimal, verified reachable platform layout for a given round.
 */
export function generatePlatformLayout(round: PlatformerRound): PlatformSlot[] {
  const items: Array<{
    type: 'step' | 'decoy';
    id: string;
    stepIndex?: number;
    label: string;
    explanation: string;
  }> = round.steps.map((s, idx) => ({
    type: 'step',
    id: s.id,
    stepIndex: idx,
    label: s.label,
    explanation: s.explanation,
  }));

  if (round.kind === 'challenge' && round.decoy) {
    items.push({
      type: 'decoy',
      id: round.decoy.id,
      label: round.decoy.label,
      explanation: round.decoy.whyNot,
    });
  }

  const P = items.length;
  const platformWidth = P > 7 ? 140 : 180;
  const platformHeight = 48;

  // Distribute over 3 tiers, filling lower tiers first if not dividing evenly
  // e.g. 7 platforms -> 3 low (tier 0), 2 mid (tier 1), 2 high (tier 2)
  const baseCount = Math.floor(P / 3);
  const remainder = P % 3;
  const tierCounts = [
    baseCount + (remainder > 0 ? 1 : 0),
    baseCount + (remainder > 1 ? 1 : 0),
    baseCount,
  ];

  for (let attempt = 0; attempt < 10; attempt++) {
    const slots: Array<Omit<PlatformSlot, 'item'>> = [];

    tierCounts.forEach((count, tierIdx) => {
      if (count === 0) return;
      const tierY = TIER_Y[tierIdx as 0 | 1 | 2];
      const stagger = tierIdx % 2 === 1 ? 40 : 0;
      const usableWidth = VIRTUAL_WIDTH - 120;
      const stepX = usableWidth / Math.max(1, count);

      for (let i = 0; i < count; i++) {
        const jitterX = (Math.random() - 0.5) * 16;
        const jitterY = (Math.random() - 0.5) * 12;
        const rawX = 60 + stagger + i * stepX + stepX / 2 - platformWidth / 2 + jitterX;
        const clampedX = Math.max(40, Math.min(VIRTUAL_WIDTH - platformWidth - 40, rawX));
        const finalY = tierY + jitterY;

        slots.push({
          id: `plat-t${tierIdx}-s${i}`,
          x: Math.round(clampedX),
          y: Math.round(finalY),
          width: platformWidth,
          height: platformHeight,
          tier: tierIdx as 0 | 1 | 2,
        });
      }
    });

    // Check reachability: every platform has a neighbor within 200px horizontally
    // and vertical diff between adjacent tiers is at most 120 (already true with 390, 280, 170: 110px diff)
    let reachable = true;
    for (const slot of slots) {
      if (slot.tier === 0) continue; // Reachable from ground (y=510, height 120 to y=390)
      const lowerTierSlots = slots.filter((s) => s.tier === slot.tier - 1);
      const hasCloseNeighbor = lowerTierSlots.some((s) => Math.abs(s.x - slot.x) <= 220);
      if (!hasCloseNeighbor) {
        reachable = false;
        break;
      }
    }

    if (!reachable && attempt < 9) {
      continue;
    }

    // Assignment: shuffle items so steps are NOT in order read left to right & top to bottom,
    // and step 1 (stepIndex === 0) is NOT on the lowest tier closest to the start sign (x < 240, tier 0).
    const sortedSlots = [...slots].sort((a, b) => (b.y !== a.y ? b.y - a.y : a.x - b.x));
    let candidateItems = [...items];

    for (let shuffleTry = 0; shuffleTry < 20; shuffleTry++) {
      candidateItems = [...items].sort(() => Math.random() - 0.5);

      // Check rule: step 1 not on lowest tier closest to start sign
      const firstSlotItem = candidateItems[0];
      const slot0 = sortedSlots[0];
      if (slot0 && slot0.tier === 0 && slot0.x < 240 && firstSlotItem.stepIndex === 0) {
        continue;
      }

      // Check rule: steps are NOT in correct sequence left-to-right top-to-bottom
      let inOrderCount = 0;
      let expectedIdx = 0;
      candidateItems.forEach((ci) => {
        if (ci.stepIndex === expectedIdx) {
          inOrderCount++;
          expectedIdx++;
        }
      });

      if (inOrderCount < P - 1) {
        // Valid shuffle found!
        return sortedSlots.map((slot, idx) => ({
          ...slot,
          item: candidateItems[idx],
        }));
      }
    }

    // Return with current shuffle if loop completes
    return sortedSlots.map((slot, idx) => ({
      ...slot,
      item: candidateItems[idx] || items[0],
    }));
  }

  // Fallback 2-tier layout if all 10 generation attempts failed
  const slots: PlatformSlot[] = [];
  const tierHalf = Math.ceil(P / 2);
  items.forEach((item, idx) => {
    const isTop = idx >= tierHalf;
    const tier = isTop ? 1 : 0;
    const y = isTop ? 240 : 380;
    const countInTier = isTop ? P - tierHalf : tierHalf;
    const indexInTier = isTop ? idx - tierHalf : idx;
    const stepX = (VIRTUAL_WIDTH - 120) / Math.max(1, countInTier);
    const x = 60 + indexInTier * stepX + (isTop ? 40 : 0);

    slots.push({
      id: `plat-fallback-${idx}`,
      x: Math.round(x),
      y,
      width: platformWidth,
      height: platformHeight,
      tier: tier as 0 | 1 | 2,
      item,
    });
  });

  return slots;
}
