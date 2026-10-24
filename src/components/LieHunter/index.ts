/**
 * Lie Hunter Game Module Registration & Exports
 * Exports standard game registry metadata and drop-in component for future phases.
 */

import { FileSearch } from 'lucide-react';
import { LieHunterGame } from './LieHunterGame.tsx';
import {
  loadLieHunterRounds,
  GAME_ID,
  GAME_NAME,
  SUPPORTED_TYPES,
  INTRO_LINE,
  CONTROLS_HELP,
} from '../../services/lieHunterService.ts';

export const gameId = GAME_ID;
export const displayName = GAME_NAME;
export const icon = FileSearch;
export const supportedTypes = SUPPORTED_TYPES;
export const introLine = INTRO_LINE;
export const controlsHelp = CONTROLS_HELP;
export const generateContent = loadLieHunterRounds;
export const component = LieHunterGame;

export {
  LieHunterGame,
  loadLieHunterRounds,
  GAME_ID,
  GAME_NAME,
  SUPPORTED_TYPES,
  INTRO_LINE,
  CONTROLS_HELP,
};
