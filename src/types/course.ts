/**
 * StudyQuest Course Data Types
 * Matches Phase 1 specification schema.
 */

export type ConceptType = 'fact' | 'process' | 'detail';

export interface Concept {
  id: string;
  name: string;
  summary: string;
  type: ConceptType;
  page: number;
  sourceQuote: string;
  steps?: string[]; // Required when type is 'process' (min 2 items)
}

export interface Chapter {
  id: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  concepts: Concept[];
}

export interface Course {
  courseTitle: string;
  sourceName: string;
  totalPages: number;
  createdAt: string; // ISO date string
  chapters: Chapter[];
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export type ProcessingStepId =
  | 'reading'
  | 'chapters'
  | 'extracting'
  | 'checking'
  | 'ready';

export interface ProcessingStep {
  id: ProcessingStepId;
  label: string;
}

// -----------------------------------------------------------------------------
// Phase 2 Types: Levels, Questions, Gameplay, and Progress
// -----------------------------------------------------------------------------

export interface Level {
  id: string; // e.g. "ch1-L1"
  chapterId: string;
  chapterTitle: string;
  levelNumber: number; // 1, 2, ...
  concepts: Concept[];
  pageStart: number;
  pageEnd: number;
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  conceptId: string;
  difficulty: QuestionDifficulty;
  question: string;
  options: [string, string, string];
  correctIndex: 0 | 1 | 2;
  explanation: string;
  page: number;
  sourceQuote: string;
}

export interface LevelQuestionsData {
  levelId: string;
  conceptHash: string;
  questions: Question[];
}

export interface QuestionAnswerRecord {
  questionId: string;
  conceptId: string;
  chosenIndex: number;
  correct: boolean;
  timeMs: number;
  gameId?: 'runner';
}

// -----------------------------------------------------------------------------
// Phase 4 Types: Lie Hunter Game
// -----------------------------------------------------------------------------

export type GameChoice = 'runner' | 'lieHunter';

export interface BaseStatement {
  id: string;
  text: string;
  basis: string;
}

export interface TrueStatement extends BaseStatement {
  isFalse: false;
}

export interface FalseStatement extends BaseStatement {
  isFalse: true;
  original: string;
  alteredPart: string;
  truePart: string;
  explanation: string;
}

export type Statement = TrueStatement | FalseStatement;

export interface LieHunterRound {
  id: string; // e.g. "ch1-L1-lh1"
  conceptId: string;
  difficulty: 'easy' | 'hard';
  statements: Statement[];
  page: number;
  sourceQuote: string;
}

export interface LieHunterContentData {
  levelId: string;
  conceptHash: string;
  rounds: LieHunterRound[];
}

export interface LieHunterAnswer {
  itemId: string; // round id
  conceptId: string;
  gameId: 'lieHunter';
  correct: boolean; // true only if FIRST accusation was the false statement and magnifier wasn't used
  hinted: boolean;
  attempts: number;
  chosenId: string; // id of the first accused statement
  correctId: string; // id of the false statement
  timeMs: number;
}

export interface RoundMistakeSummary {
  roundId: string;
  conceptId: string;
  difficulty: 'easy' | 'hard';
  mistakes: number;
  hinted: boolean;
}

export interface UnifiedGameAnswer {
  itemId: string;
  conceptId: string;
  gameId: 'runner' | 'lieHunter';
  correct: boolean;
  hinted?: boolean;
  attempts?: number;
  chosenId?: string;
  correctId?: string;
  questionId?: string;
  chosenIndex?: number;
  timeMs: number;
}

export interface LevelResult {
  levelId: string;
  gameId?: 'runner' | 'lieHunter';
  practiceMode: boolean;
  status: 'completed' | 'out_of_lives' | 'outOfLives' | 'quit';
  score: number;
  bestStreak: number;
  livesLeft: number;
  totalQuestions?: number;
  correctCount: number;
  accuracyPercent: number;
  stars: number; // 0, 1, 2, 3
  xpEarned: number;
  answers: Array<QuestionAnswerRecord | LieHunterAnswer | UnifiedGameAnswer>;
  questions?: Question[];
  rounds?: LieHunterRound[];
  roundsSummary?: RoundMistakeSummary[];
  level: Level;
}

export interface LevelProgress {
  bestStars: number;
  bestScore: number;
  attempts: number;
  lastPlayed: string;
  completed: boolean;
}

export interface ConceptProgress {
  answered: number;
  correct: number;
  lastResult: 'correct' | 'wrong';
  lastPlayed: string;
  lastGame?: 'runner' | 'lieHunter';
  gamesPlayed?: string[];
}

export interface StudyQuestProgress {
  totalXp: number;
  levels: Record<string, LevelProgress>;
  concepts: Record<string, ConceptProgress>;
}

