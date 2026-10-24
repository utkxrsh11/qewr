/**
 * StudyQuest App (Phase 1 & Phase 2)
 * Full playable loop:
 * Course Overview -> choose a level -> Learn Card -> Concept Runner game -> Result screen -> back to course.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Course,
  Level,
  Question,
  LevelResult,
  StudyQuestProgress,
  Chapter,
  Concept,
  LieHunterRound,
  GameChoice,
} from './types/course.ts';
import { UploadView } from './components/UploadView.tsx';
import { ProcessingView } from './components/ProcessingView.tsx';
import { CourseOverviewView } from './components/CourseOverviewView.tsx';
import { WorldMapView } from './components/WorldMap/WorldMapView.tsx';
import { LearnCardView } from './components/LearnCardView.tsx';
import { QuestionLoadingView } from './components/QuestionLoadingView.tsx';
import { GameView } from './components/GameView.tsx';
import { ResultView } from './components/ResultView.tsx';
import {
  loadCourseFromStorage,
  saveCourseToStorage,
  clearCourseFromStorage,
} from './services/storage.ts';
import { startExtractionStream } from './services/courseApi.ts';
import { buildLevels } from './services/levelBuilder.ts';
import { loadLevelQuestions, clearAllQuestionCaches } from './services/questionService.ts';
import { loadLieHunterRounds, shuffleLieHunterStatements } from './services/lieHunterService.ts';
import { getInitialGameChoice } from './components/GameChoiceSelector.tsx';
import { loadProgress, recordLevelResult, clearProgress } from './services/progressService.ts';
import { shuffleQuestionsWithProgression } from './services/questionValidator.ts';
import { generateFallbackQuestions } from './services/fallbackQuestionGenerator.ts';
import { Sparkles, Coins, Compass } from 'lucide-react';

type AppView =
  | 'upload'
  | 'processing'
  | 'course'
  | 'world-map'
  | 'learn-card'
  | 'loading-questions'
  | 'game'
  | 'result';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('upload');
  const [course, setCourse] = useState<Course | null>(null);

  // Phase 1: PDF Processing State
  const [processingStepLabel, setProcessingStepLabel] = useState('Reading your PDF...');
  const [processingStepIndex, setProcessingStepIndex] = useState(0);
  const [processingError, setProcessingError] = useState<{
    message: string;
    technical?: string;
  } | null>(null);

  // Phase 2 & 4: Gameplay State
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [currentGameChoice, setCurrentGameChoice] = useState<GameChoice>('runner');
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [currentRounds, setCurrentRounds] = useState<LieHunterRound[]>([]);
  const [practiceMode, setPracticeMode] = useState(false);
  const [levelResult, setLevelResult] = useState<LevelResult | null>(null);
  const [progress, setProgress] = useState<StudyQuestProgress>(loadProgress());
  const [questionLoadError, setQuestionLoadError] = useState<{
    message: string;
    technical?: string;
  } | null>(null);


  // Keep last extraction payload to enable "Try again"
  const lastExtractionPayloadRef = useRef<{
    pdfBase64?: string;
    text?: string;
    fileName?: string;
  } | null>(null);

  // Extraction AbortController
  const extractionAbortRef = useRef<AbortController | null>(null);
  // Question generation AbortController
  const questionGenAbortRef = useRef<AbortController | null>(null);

  // Compute all levels from course at runtime
  const allLevels = useMemo(() => {
    return course ? buildLevels(course) : [];
  }, [course]);

  // Is current course the sample water cycle course?
  const isSampleCourse = useMemo(() => {
    return course?.sourceName === 'earth_science_water_cycle.pdf';
  }, [course]);

  // On mount: check localStorage for saved course
  useEffect(() => {
    const saved = loadCourseFromStorage();
    if (saved) {
      setCourse(saved);
      setCurrentView('course');
    }
    setProgress(loadProgress());
  }, []);

  // ---------------------------------------------------------------------------
  // Phase 1 Handlers: Extraction Flow
  // ---------------------------------------------------------------------------

  const handleStartExtraction = (payload: {
    pdfBase64?: string;
    text?: string;
    fileName?: string;
  }) => {
    lastExtractionPayloadRef.current = payload;
    setProcessingError(null);
    setProcessingStepLabel('Reading your PDF...');
    setProcessingStepIndex(0);
    setCurrentView('processing');

    const controller = new AbortController();
    extractionAbortRef.current = controller;

    startExtractionStream(
      payload,
      {
        onProgress: (step, stepIndex) => {
          setProcessingStepLabel(step);
          setProcessingStepIndex(stepIndex);
        },
        onComplete: (extractedCourse) => {
          setCourse(extractedCourse);
          saveCourseToStorage(extractedCourse);
          // Clear old progress & caches for a new course
          clearProgress();
          clearAllQuestionCaches();
          setProgress({ totalXp: 0, levels: {}, concepts: {} });
          setCurrentView('course');
        },
        onError: (userMessage, technical) => {
          setProcessingError({
            message: userMessage,
            technical,
          });
        },
      },
      controller.signal
    );
  };

  const handleCancelExtraction = () => {
    if (extractionAbortRef.current) {
      extractionAbortRef.current.abort();
      extractionAbortRef.current = null;
    }
    setProcessingError(null);
    setCurrentView('upload');
  };

  const handleRetryExtraction = () => {
    if (lastExtractionPayloadRef.current) {
      handleStartExtraction(lastExtractionPayloadRef.current);
    } else {
      setCurrentView('upload');
    }
  };

  const handleLoadSample = (sample: Course) => {
    setCourse(sample);
    saveCourseToStorage(sample);
    clearProgress();
    clearAllQuestionCaches();
    setProgress({ totalXp: 0, levels: {}, concepts: {} });
    setCurrentView('course');
  };

  const handleStartOver = () => {
    clearCourseFromStorage();
    clearProgress();
    clearAllQuestionCaches();
    setCourse(null);
    setCurrentLevel(null);
    setCurrentQuestions([]);
    setLevelResult(null);
    setProgress({ totalXp: 0, levels: {}, concepts: {} });
    setCurrentView('upload');
  };

  // ---------------------------------------------------------------------------
  // Phase 2 Handlers: Level & Game Play Flow
  // ---------------------------------------------------------------------------

  // Select a level to view its Learn Card
  const handleSelectLevel = (level: Level) => {
    setCurrentLevel(level);
    setCurrentView('learn-card');
  };

  // Main "Start learning" button: starts first uncompleted level
  const handleStartLearning = () => {
    if (allLevels.length === 0) return;
    const firstUncompleted =
      allLevels.find((lvl) => !progress.levels[lvl.id]?.completed) || allLevels[0];
    handleSelectLevel(firstUncompleted);
  };

  // Start question or round loading and jump to the game
  const handleStartGame = async (
    isPractice: boolean,
    forceRegenerate = false,
    targetLevel?: Level,
    selectedGame?: GameChoice
  ) => {
    const levelToPlay = targetLevel || currentLevel;
    if (!levelToPlay || !course) return;

    if (targetLevel) {
      setCurrentLevel(targetLevel);
    }
    const gameToPlay = selectedGame || currentGameChoice || getInitialGameChoice(levelToPlay);
    setCurrentGameChoice(gameToPlay);
    setPracticeMode(isPractice);
    setQuestionLoadError(null);
    setCurrentView('loading-questions');

    const controller = new AbortController();
    questionGenAbortRef.current = controller;

    try {
      if (gameToPlay === 'lieHunter') {
        const rounds = await loadLieHunterRounds({
          level: levelToPlay,
          courseTitle: course.courseTitle,
          isSampleCourse,
          forceRegenerate,
          signal: controller.signal,
        });

        setCurrentRounds(rounds);
        setCurrentView('game');
      } else {
        const questions = await loadLevelQuestions({
          level: levelToPlay,
          courseTitle: course.courseTitle,
          isSampleCourse,
          forceRegenerate,
          signal: controller.signal,
        });

        setCurrentQuestions(questions);
        setCurrentView('game');
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      console.error('Failed to load level content:', err);
      const isLie = gameToPlay === 'lieHunter';
      setQuestionLoadError({
        message:
          err?.message ||
          (isLie
            ? "We couldn't build a good case file for this level."
            : "We couldn't build a good challenge for this level. Try again or choose another level."),
        technical: err?.technical || String(err),
      });
    }
  };

  // Launch a focused practice session for a single concept from World Map
  const handlePracticeConcept = (concept: Concept, chapter: Chapter) => {
    const practiceLevel: Level = {
      id: `practice-${concept.id}`,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      levelNumber: 1,
      concepts: [concept],
      pageStart: concept.page,
      pageEnd: concept.page,
    };
    handleStartGame(true, false, practiceLevel, 'runner');
  };

  const handleCancelQuestionLoading = () => {
    if (questionGenAbortRef.current) {
      questionGenAbortRef.current.abort();
      questionGenAbortRef.current = null;
    }
    setQuestionLoadError(null);
    if (currentLevel?.id.startsWith('practice-')) {
      setCurrentView('world-map');
    } else {
      setCurrentView('learn-card');
    }
  };

  const handleRetryQuestionLoading = () => {
    handleStartGame(practiceMode, true, currentLevel || undefined, currentGameChoice);
  };

  const handleInstantLaunchFallback = () => {
    if (!currentLevel) return;
    const fallback = generateFallbackQuestions(currentLevel.concepts);
    setCurrentQuestions(fallback);
    setCurrentGameChoice('runner');
    setCurrentView('game');
  };

  // Game concludes (either all questions answered or out of lives)
  const handleFinishGame = (result: LevelResult) => {
    const updatedProgress = recordLevelResult(result);
    setProgress(updatedProgress);
    setLevelResult(result);
    setCurrentView('result');
  };

  // Replay the current level with fresh question / statement shuffling
  const handlePlayAgain = () => {
    if (currentGameChoice === 'lieHunter' && currentRounds.length > 0) {
      const reshuffled = shuffleLieHunterStatements(currentRounds);
      setCurrentRounds(reshuffled);
      setCurrentView('game');
    } else if (currentQuestions.length > 0) {
      const reshuffled = shuffleQuestionsWithProgression(currentQuestions);
      setCurrentQuestions(reshuffled);
      setCurrentView('game');
    } else if (currentLevel) {
      handleStartGame(practiceMode, false, currentLevel, currentGameChoice);
    }
  };


  // Advance to next level if available
  const handleNextLevel = () => {
    if (!currentLevel) return;
    const currentIndex = allLevels.findIndex((lvl) => lvl.id === currentLevel.id);
    if (currentIndex >= 0 && currentIndex < allLevels.length - 1) {
      const nextLvl = allLevels[currentIndex + 1];
      handleSelectLevel(nextLvl);
    } else {
      setCurrentView('course');
    }
  };

  // Check if another level exists after current
  const hasNextLevel = useMemo(() => {
    if (!currentLevel) return false;
    const currentIndex = allLevels.findIndex((lvl) => lvl.id === currentLevel.id);
    return currentIndex >= 0 && currentIndex < allLevels.length - 1;
  }, [allLevels, currentLevel]);

  // Total levels count in current level's chapter
  const totalLevelsInCurrentChapter = useMemo(() => {
    if (!currentLevel) return 1;
    return allLevels.filter((lvl) => lvl.chapterId === currentLevel.chapterId).length;
  }, [allLevels, currentLevel]);

  return (
    <div className="min-h-screen retro-grid-bg flex flex-col justify-between selection:bg-[#F5C542] selection:text-black">
      {/* Top Banner Bar with XP Counter */}
      <header className="border-b border-[#1E2542] bg-[#0E1224]/90 backdrop-blur-xs sticky top-0 z-40 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => {
                if (course) setCurrentView('course');
                else setCurrentView('upload');
              }}
              className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542] rounded px-1 cursor-pointer"
            >
              <div className="w-2.5 h-2.5 bg-[#F5C542] rotate-45" />
              <span className="font-pixel text-xs sm:text-sm text-[#F5C542] tracking-wider">
                StudyQuest
              </span>
            </button>

            {/* Top Navigation Tabs when course is active */}
            {course && (
              <nav aria-label="Course views" className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('course')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                    currentView === 'course'
                      ? 'bg-[#1D2545] text-[#F5C542] border border-[#F5C542]/40 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-[#141A33]'
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('world-map')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                    currentView === 'world-map'
                      ? 'bg-[#1D2545] text-[#2DD4BF] border border-[#2DD4BF]/40 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-[#141A33]'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-[#2DD4BF]" aria-hidden="true" />
                  <span>World Map</span>
                </button>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Total XP Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#141A33] border border-[#2B355E] text-xs font-mono text-[#F5C542] shadow-inner">
              <Coins className="w-3.5 h-3.5 text-[#F5C542]" aria-hidden="true" />
              <span className="font-bold">XP: {progress.totalXp}</span>
            </div>

            <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-[#1A213D] text-[#2DD4BF] border border-[#2B355E]">
              WORLD MAP & MASTERY
            </span>
          </div>
        </div>
      </header>

      {/* Main Screen Views */}
      <main className="flex-1 flex flex-col justify-center py-4">
        {/* VIEW A: Upload */}
        {currentView === 'upload' && (
          <UploadView
            onStartExtraction={handleStartExtraction}
            onLoadSample={handleLoadSample}
          />
        )}

        {/* VIEW B: PDF Extraction Processing */}
        {currentView === 'processing' && (
          <ProcessingView
            currentStepLabel={processingStepLabel}
            currentStepIndex={processingStepIndex}
            onCancel={handleCancelExtraction}
            error={processingError}
            onRetry={handleRetryExtraction}
            onBackToUpload={handleCancelExtraction}
          />
        )}

        {/* VIEW C: Course Overview */}
        {currentView === 'course' && course && (
          <CourseOverviewView
            course={course}
            progress={progress}
            onStartOver={handleStartOver}
            onSelectLevel={handleSelectLevel}
            onStartLearning={handleStartLearning}
            onOpenWorldMap={() => setCurrentView('world-map')}
          />
        )}

        {/* VIEW C2: World Map & Mastery Realm */}
        {currentView === 'world-map' && course && (
          <WorldMapView
            course={course}
            onBackToCourse={() => setCurrentView('course')}
            onPracticeConcept={handlePracticeConcept}
            onSelectLevel={handleSelectLevel}
          />
        )}

        {/* VIEW D: Learn Card */}
        {currentView === 'learn-card' && currentLevel && (
          <LearnCardView
            level={currentLevel}
            totalLevelsInChapter={totalLevelsInCurrentChapter}
            onBackToCourse={() => setCurrentView('course')}
            onStartGame={handleStartGame}
          />
        )}

        {/* VIEW E: Loading Challenge / Case Files */}
        {currentView === 'loading-questions' && (
          <QuestionLoadingView
            gameType={currentGameChoice}
            onCancel={handleCancelQuestionLoading}
            error={questionLoadError}
            onRetry={handleRetryQuestionLoading}
            onBackToCourse={() => setCurrentView('course')}
            onInstantLaunch={handleInstantLaunchFallback}
            onPlayRunnerInstead={
              currentGameChoice === 'lieHunter'
                ? () => handleStartGame(practiceMode, false, currentLevel || undefined, 'runner')
                : undefined
            }
          />
        )}

        {/* VIEW F: Gameplay (Concept Runner or Lie Hunter) */}
        {currentView === 'game' && currentLevel && (
          <GameView
            gameType={currentGameChoice}
            questions={currentQuestions}
            rounds={currentRounds}
            level={currentLevel}
            practiceMode={practiceMode}
            onFinish={handleFinishGame}
            onQuit={() => {
              if (currentLevel.id.startsWith('practice-')) {
                setCurrentView('world-map');
              } else {
                setCurrentView('course');
              }
            }}
          />
        )}


        {/* VIEW G: Result Screen */}
        {currentView === 'result' && levelResult && (
          <ResultView
            result={levelResult}
            hasNextLevel={hasNextLevel}
            onPlayAgain={handlePlayAgain}
            onNextLevel={handleNextLevel}
            onBackToCourse={() => setCurrentView('course')}
            onReviewConcepts={() => setCurrentView('learn-card')}
            onOpenWorldMap={() => setCurrentView('world-map')}
          />
        )}
      </main>

      {/* Subtle Dungeon Footer */}
      <footer className="border-t border-[#181E38] py-4 px-4 text-center text-xs text-slate-500 font-mono">
        StudyQuest · Intelligent Course Decomposition & Concept Runner
      </footer>
    </div>
  );
}
