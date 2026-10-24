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
  isRevision?: boolean;
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
// -----------------------------------------------------------------------------
// Phase 4 & 5 Types: Lie Hunter & Process Platformer Games
// -----------------------------------------------------------------------------

export type GameChoice = 'runner' | 'lieHunter' | 'platformer';

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

// -----------------------------------------------------------------------------
// Phase 5 Types: Process Platformer & Multi-Segment Sessions
// -----------------------------------------------------------------------------

export interface PlatformerStep {
  id: string; // e.g. "ch1-L1-r1-s1"
  label: string; // max 60 chars
  explanation: string; // max 200 chars
}

export interface PlatformerDecoy {
  id: string;
  label: string;
  whyNot: string;
}

export interface PlatformerRound {
  id: string; // e.g. "ch1-L1-r1"
  conceptId: string;
  kind: 'order' | 'challenge';
  title: string;
  instruction: string;
  steps: PlatformerStep[];
  decoy: PlatformerDecoy | null;
  page: number;
  sourceQuote: string;
}

export interface PlatformerContentData {
  levelId: string;
  conceptHash: string;
  rounds: PlatformerRound[];
}

export interface StepAnswer {
  itemId: string; // step id
  conceptId: string;
  gameId: 'platformer';
  correct: boolean; // true only if first choice was right AND no hint was used for that step
  hinted: boolean;
  attempts: number;
  chosenId: string; // id of first chosen platform / step
  correctId: string;
  timeMs: number;
}

export interface PlatformerRoundSummary {
  roundId: string;
  conceptId: string;
  kind: 'order' | 'challenge';
  mistakes: number;
  hintsUsed: number;
}

export interface UnifiedGameAnswer {
  itemId: string;
  conceptId: string;
  gameId: 'runner' | 'lieHunter' | 'platformer';
  correct: boolean;
  hinted?: boolean;
  attempts?: number;
  chosenId?: string;
  correctId?: string;
  questionId?: string;
  chosenIndex?: number;
  timeMs: number;
}

export interface LevelSegment {
  id: string;
  gameId: GameChoice;
  conceptIds: string[];
  concepts: Concept[];
  index: number;
  totalSegments: number;
}

export interface SegmentResultInfo {
  gameId: GameChoice;
  conceptNames: string[];
  itemsCorrect: number;
  itemsTotal: number;
  status: 'completed' | 'outOfLives' | 'notReached' | 'quit';
}

export interface StrengthDelta {
  conceptId: string;
  conceptName: string;
  before: number; // 0..1
  after: number; // 0..1
  delta: number; // after - before
  nextDueAt: string;
}

export interface LevelResult {
  levelId: string;
  gameId?: GameChoice;
  practiceMode: boolean;
  isRevision?: boolean;
  status: 'completed' | 'out_of_lives' | 'outOfLives' | 'quit';
  score: number;
  bestStreak: number;
  endStreak?: number;
  livesLeft: number;
  totalQuestions?: number;
  correctCount: number;
  accuracyPercent: number;
  stars: number; // 0, 1, 2, 3
  xpEarned: number;
  answers: Array<QuestionAnswerRecord | LieHunterAnswer | StepAnswer | UnifiedGameAnswer>;
  questions?: Question[];
  rounds?: LieHunterRound[];
  roundsSummary?: RoundMistakeSummary[];
  platformerRounds?: PlatformerRound[];
  platformerSummary?: PlatformerRoundSummary[];
  segments?: SegmentResultInfo[];
  strengthChanges?: StrengthDelta[];
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
  lastGame?: GameChoice;
  gamesPlayed?: string[];
  // Phase 6 Spaced Repetition additions
  recent?: number[]; // last 6 results (1 = correct, 0 = wrong), newest last
  reviewStreak?: number; // consecutive sessions >= 80% accuracy
  dueAt?: string; // ISO date string
  revisions?: number; // times appeared in Smart Revision
}

export interface StudyQuestProgress {
  totalXp: number;
  levels: Record<string, LevelProgress>;
  concepts: Record<string, ConceptProgress>;
}

// -----------------------------------------------------------------------------
// Phase 6 Spaced Repetition & Dashboard Types
// -----------------------------------------------------------------------------

export type MasteryState = 'untouched' | 'mastered' | 'shaky' | 'weak';

export interface ReadinessBand {
  label: 'Not ready' | 'In progress' | 'Looking good' | 'Exam ready!';
  color: 'red' | 'amber' | 'blue' | 'emerald';
  description: string;
}

export interface ConceptReviewCandidate {
  concept: Concept;
  chapter: Chapter;
  progress?: ConceptProgress;
  baseMastery: number;
  strength: number;
  state: MasteryState;
  isDue: boolean;
  overdueDays: number;
  priority: number;
  reason: string;
  suggestedGame: GameChoice;
}

export interface RevisionPlan {
  id: string; // e.g. "rev-1730000000"
  createdAt: string;
  candidates: ConceptReviewCandidate[];
  virtualLevel: Level;
  expectedSegments: number;
}

export interface GameStatRecord {
  played: number;
  correct: number;
  totalItems: number;
}

export interface StudyQuestStats {
  byGame: Record<GameChoice, GameStatRecord>;
  byType: Record<ConceptType, GameStatRecord>;
  lastUpdated: string;
}

export interface ActivityDayRecord {
  date: string; // YYYY-MM-DD
  itemsAnswered: number;
  correctCount: number;
  xpEarned: number;
  sessionsCount: number;
}

export interface StudyQuestActivity {
  history: Record<string, ActivityDayRecord>; // key: YYYY-MM-DD
}

export interface ExamInfo {
  examDate?: string; // YYYY-MM-DD
  targetReadiness?: number; // e.g. 85 (%)
}



