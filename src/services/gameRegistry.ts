/**
 * Game Registry & Selection Engine
 * Unified registry defining all playable games and automatic concept-to-game routing.
 */

import React from 'react';
import { GameChoice, Concept, Level, Course, ConceptType } from '../types/course.ts';
import { Gamepad2, FileSearch, Layers, LucideIcon } from 'lucide-react';

import { ConceptRunnerGame } from '../components/ConceptRunnerGame.tsx';
import { loadLevelQuestions } from './questionService.ts';

import { LieHunterGame } from '../components/LieHunter/LieHunterGame.tsx';
import { loadLieHunterRounds } from './lieHunterService.ts';

import { ProcessPlatformerGame } from '../components/ProcessPlatformer/ProcessPlatformerGame.tsx';
import { loadPlatformerRounds } from './platformerService.ts';

export interface GameRegistryEntry {
  id: GameChoice;
  name: string;
  icon: LucideIcon;
  primaryTypes: ConceptType[];
  supportedTypes: ConceptType[];
  enabled: boolean;
  introLine: string;
  controlsHelp: string;
  contentProp: 'questions' | 'rounds';
  generateContent: (params: {
    concepts: Concept[];
    course: Course;
    level: Level;
    forceRegenerate?: boolean;
    signal?: AbortSignal;
  }) => Promise<any>;
  Component: React.ComponentType<any>;
}

export const GAME_REGISTRY: Record<GameChoice, GameRegistryEntry> = {
  runner: {
    id: 'runner',
    name: 'Concept Runner',
    icon: Gamepad2,
    primaryTypes: ['fact'],
    supportedTypes: ['fact', 'process', 'detail'],
    enabled: true,
    introLine: 'Switch lanes to sprint through gates matching the key facts.',
    controlsHelp: 'Up/Down arrows or W/S to change lanes. 1-3 keys also select lanes directly. P pauses.',
    contentProp: 'questions',
    generateContent: async ({ level, course, concepts, forceRegenerate, signal }) => {
      return loadLevelQuestions({
        level: {
          ...level,
          concepts,
        },
        courseTitle: course.courseTitle,
        isSampleCourse: course.sourceName === 'earth_science_water_cycle.pdf',
        forceRegenerate,
        signal,
      });
    },
    Component: ConceptRunnerGame,
  },
  lieHunter: {
    id: 'lieHunter',
    name: 'Lie Hunter',
    icon: FileSearch,
    primaryTypes: ['detail'],
    supportedTypes: ['fact', 'process', 'detail'],
    enabled: true,
    introLine: 'Spot the false statement on the evidence board.',
    controlsHelp: 'Select a card (click, tap, or keys 1 to 4), then press Accuse (Enter). H uses the Magnifier. P pauses.',
    contentProp: 'rounds',
    generateContent: async ({ level, course, concepts, forceRegenerate, signal }) => {
      return loadLieHunterRounds({
        level: {
          ...level,
          concepts,
        },
        courseTitle: course.courseTitle,
        isSampleCourse: course.sourceName === 'earth_science_water_cycle.pdf',
        forceRegenerate,
        signal,
      });
    },
    Component: LieHunterGame,
  },
  platformer: {
    id: 'platformer',
    name: 'Process Platformer',
    icon: Layers,
    primaryTypes: ['process'],
    supportedTypes: ['process'],
    enabled: true,
    introLine: 'Put the stages of this process in order by leaping across platforms.',
    controlsHelp: 'Arrow keys or A/D to run, Space/Up to jump. Stand on a platform to choose it. H for hint, P to pause.',
    contentProp: 'rounds',
    generateContent: async ({ level, course, concepts, forceRegenerate, signal }) => {
      return loadPlatformerRounds({
        level: {
          ...level,
          concepts,
        },
        concepts,
        courseTitle: course.courseTitle,
        isSampleCourse: course.sourceName === 'earth_science_water_cycle.pdf',
        forceRegenerate,
        signal,
      });
    },
    Component: ProcessPlatformerGame,
  },
};

export interface SelectGameOptions {
  preferGame?: GameChoice;
  avoidGames?: GameChoice[];
  forceGame?: GameChoice | 'auto';
}

/**
 * Selects the optimal game for a concept according to Section 2 rules:
 * 1. Return enabled game whose primaryTypes include concept's type
 * 2. If a "process" concept has fewer than 2 steps, return Concept Runner
 * 3. If chosen game disabled, return first enabled game whose supportedTypes include type, and finally Concept Runner
 * 4. Accept optional { preferGame, avoidGames }
 * 5. If forceGame specified (via ?debug=1), use it if it supports the type
 * 6. Never throw!
 */
export function selectGame(concept: Concept, options?: SelectGameOptions): GameChoice {
  try {
    if (!concept) return 'runner';

    // Rule 2: If a "process" concept has fewer than 2 steps, return Concept Runner
    if (concept.type === 'process' && (!concept.steps || concept.steps.length < 2)) {
      return 'runner';
    }

    // Force option (?debug=1 hook)
    if (options?.forceGame && options.forceGame !== 'auto') {
      const forcedEntry = GAME_REGISTRY[options.forceGame];
      if (forcedEntry && forcedEntry.enabled && forcedEntry.supportedTypes.includes(concept.type)) {
        return options.forceGame;
      }
    }

    // Rule 4: preferGame hook
    if (options?.preferGame) {
      const preferEntry = GAME_REGISTRY[options.preferGame];
      if (preferEntry && preferEntry.enabled && preferEntry.supportedTypes.includes(concept.type)) {
        return options.preferGame;
      }
    }

    const avoid = new Set(options?.avoidGames || []);

    // Rule 1: Find enabled game whose primaryTypes include concept's type
    const entries = Object.values(GAME_REGISTRY);
    const primaryMatch = entries.find(
      (g) => g.enabled && !avoid.has(g.id) && g.primaryTypes.includes(concept.type)
    );

    if (primaryMatch) {
      return primaryMatch.id;
    }

    // Rule 3: Fallback to any enabled game whose supportedTypes include the type
    const supportedMatch = entries.find(
      (g) => g.enabled && !avoid.has(g.id) && g.supportedTypes.includes(concept.type)
    );

    if (supportedMatch) {
      return supportedMatch.id;
    }

    // Final fallback: Concept Runner
    return 'runner';
  } catch (err) {
    console.warn('[selectGame] Error occurred, falling back to runner safely:', err);
    return 'runner';
  }
}
