/**
 * StudyQuest App (Phase 7 Polished)
 * Multi-Game Dungeon Learning Suite with Design System, Offline-Safe Demo Mode,
 * Presenter Toolbar, Self-Check QA Suite, Master Sound Synthesizer, and Accessibility.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Course,
  Level,
  LevelResult,
  StudyQuestProgress,
  Chapter,
  Concept,
  GameChoice,
  LevelSegment,
  RevisionSize,
  RevisionPlan,
} from './types/course.ts';
import { UploadView } from './components/UploadView.tsx';
import { ProcessingView } from './components/ProcessingView.tsx';
import { CourseOverviewView } from './components/CourseOverviewView.tsx';
import { WorldMapView } from './components/WorldMap/WorldMapView.tsx';
import { DashboardView } from './components/Dashboard/DashboardView.tsx';
import { RevisionBriefView } from './components/Revision/RevisionBriefView.tsx';
import { LearnCardView } from './components/LearnCardView.tsx';
import { QuestionLoadingView, SegmentStatusItem } from './components/QuestionLoadingView.tsx';
import { GameView } from './components/GameView.tsx';
import { ResultView } from './components/ResultView.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { WelcomeBanner } from './components/WelcomeBanner.tsx';
import { HowItWorksModal } from './components/modals/HowItWorksModal.tsx';
import { ShortcutsModal } from './components/modals/ShortcutsModal.tsx';
import { PresenterToolbar } from './components/PresenterToolbar.tsx';
import { QAModal } from './qa/QAModal.tsx';

import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { GameErrorBoundary } from './components/common/GameErrorBoundary.tsx';
import { ConfirmDialog } from './components/common/ConfirmDialog.tsx';
import { ToastProvider, useToast } from './components/common/ToastContext.tsx';

import {
  loadCourseFromStorage,
  saveCourseToStorage,
  clearCourseFromStorage,
} from './services/storage.ts';
import { startExtractionStream } from './services/courseApi.ts';
import { buildLevels } from './services/levelBuilder.ts';
import { clearAllQuestionCaches } from './services/questionService.ts';
import { shuffleLieHunterStatements } from './services/lieHunterService.ts';
import {
  loadProgress,
  recordLevelResult,
  clearProgress,
  seedDemoProgress,
} from './services/progressService.ts';
import { shuffleQuestionsWithProgression } from './services/questionValidator.ts';
import { GAME_REGISTRY } from './services/gameRegistry.ts';
import {
  buildLevelSegments,
  generateLevelContent,
  clearAllLevelCaches,
} from './services/levelSession.ts';
import { isDue } from './services/masteryModel.ts';
import {
  buildRevisionPlan,
  buildRevisionPlanForConcept,
} from './services/revisionPlanner.ts';
import { runStorageMigrations } from './services/storageManager.ts';
import { setupDemoMode } from './services/demoPackService.ts';

import {
  Coins,
  Compass,
  BarChart2,
  Settings,
  HelpCircle,
  Keyboard,
  ShieldCheck,
  Presentation,
} from 'lucide-react';

export type AppView =
  | 'upload'
  | 'processing'
  | 'course'
  | 'world-map'
  | 'dashboard'
  | 'revision-brief'
  | 'learn-card'
  | 'loading-questions'
  | 'game'
  | 'result';

function StudyQuestApp() {
  const { showToast, info, success } = useToast();

  const [currentView, setCurrentView] = useState<AppView>('upload');
  const [course, setCourse] = useState<Course | null>(null);

  // Phase 1: PDF Processing State
  const [processingStepLabel, setProcessingStepLabel] = useState('Reading your PDF...');
  const [processingStepIndex, setProcessingStepIndex] = useState(0);
  const [processingError, setProcessingError] = useState<{
    message: string;
    technical?: string;
  } | null>(null);

  // Gameplay & Multi-Segment State
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [currentSegments, setCurrentSegments] = useState<LevelSegment[]>([]);
  const [segmentContents, setSegmentContents] = useState<Record<string, any>>({});
  const [segmentStatuses, setSegmentStatuses] = useState<SegmentStatusItem[]>([]);
  const [lastForceGame, setLastForceGame] = useState<GameChoice | 'auto'>('auto');
  const [practiceMode, setPracticeMode] = useState(false);
  const [levelResult, setLevelResult] = useState<LevelResult | null>(null);
  const [progress, setProgress] = useState<StudyQuestProgress>(loadProgress());
  const [questionLoadError, setQuestionLoadError] = useState<{
    message: string;
    technical?: string;
  } | null>(null);
  const [activeRevisionPlan, setActiveRevisionPlan] = useState<RevisionPlan | null>(null);

  // Modals & Panels
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showQAModal, setShowQAModal] = useState(false);
  const [showStartOverConfirm, setShowStartOverConfirm] = useState(false);
  const [isPresenterMode, setIsPresenterMode] = useState(false);

  // Live Screen Reader Announcement
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');

  // Keep last extraction payload to enable "Try again"
  const lastExtractionPayloadRef = useRef<{
    pdfBase64?: string;
    text?: string;
    fileName?: string;
  } | null>(null);

  const extractionAbortRef = useRef<AbortController | null>(null);
  const questionGenAbortRef = useRef<AbortController | null>(null);

  // Compute all levels from course at runtime
  const allLevels = useMemo(() => {
    return course ? buildLevels(course) : [];
  }, [course]);

  // Number of concepts currently due for review
  const dueCount = useMemo(() => {
    if (!course) return 0;
    let count = 0;
    course.chapters.forEach((ch) => {
      ch.concepts.forEach((c) => {
        const cp = progress.concepts[c.id];
        if (cp && isDue(cp)) count++;
      });
    });
    return count;
  }, [course, progress]);

  // Screen Reader view announcements
  const announceView = useCallback((viewName: string) => {
    setAriaAnnouncement(`Switched to ${viewName} screen`);
  }, []);

  // On mount: check storage, url params, setup demo/qa/presenter
  useEffect(() => {
    runStorageMigrations();

    // Check UI scale from storage
    try {
      const savedScale = localStorage.getItem('studyquest_ui_scale');
      if (savedScale && savedScale !== 'normal') {
        document.documentElement.setAttribute('data-ui-scale', savedScale);
      }
    } catch {}

    const search = new URLSearchParams(window.location.search);

    // QA Suite Flag
    if (search.get('qa') === '1') {
      setShowQAModal(true);
    }

    // Presenter Mode Flag
    if (search.get('present') === '1') {
      setIsPresenterMode(true);
    }

    // Demo Mode Flag (?demo=1 or ?demo=1&offline=1)
    if (search.get('demo') === '1') {
      const isOffline = search.get('offline') === '1';
      const demoState = setupDemoMode(isOffline);
      setCourse(demoState.course);
      setProgress(demoState.progress);
      setCurrentView('course');
      info(
        isOffline
          ? 'Demo loaded in offline-safe mode.'
          : 'Demo course loaded with interactive progress.'
      );
      return;
    }

    // Standard saved course load
    const saved = loadCourseFromStorage();
    if (saved) {
      setCourse(saved);
      setCurrentView('course');
    }
    setProgress(loadProgress());
  }, [info]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // '?' opens shortcuts
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }

      // Ctrl+Shift+P or Cmd+Shift+P toggles presenter mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setIsPresenterMode((prev) => {
          const next = !prev;
          info(next ? 'Presenter mode enabled' : 'Presenter mode exited');
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [info]);

  // ---------------------------------------------------------------------------
  // Extraction Handlers
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
    announceView('Processing');

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
          clearProgress();
          clearAllQuestionCaches();
          setProgress({ totalXp: 0, levels: {}, concepts: {} });
          setCurrentView('course');
          announceView('Course Overview');
          success('Course decomposed successfully into dungeon levels!');
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
    announceView('Upload');
  };

  const handleRetryExtraction = () => {
    if (lastExtractionPayloadRef.current) {
      handleStartExtraction(lastExtractionPayloadRef.current);
    } else {
      setCurrentView('upload');
      announceView('Upload');
    }
  };

  const handleLoadSample = (sample: Course) => {
    setCourse(sample);
    saveCourseToStorage(sample);
    clearProgress();
    clearAllQuestionCaches();
    setProgress({ totalXp: 0, levels: {}, concepts: {} });
    setCurrentView('course');
    announceView('Course Overview');
    success('Loaded Hydrologic Cycle sample course!');
  };

  const handleConfirmStartOver = () => {
    clearCourseFromStorage();
    clearProgress();
    clearAllQuestionCaches();
    setCourse(null);
    setCurrentLevel(null);
    setCurrentSegments([]);
    setSegmentContents({});
    setLevelResult(null);
    setProgress({ totalXp: 0, levels: {}, concepts: {} });
    setShowStartOverConfirm(false);
    setCurrentView('upload');
    announceView('Upload');
    info('Course and progress cleared.');
  };

  // ---------------------------------------------------------------------------
  // Level & Gameplay Flow
  // ---------------------------------------------------------------------------

  const handleSelectLevel = (level: Level) => {
    setCurrentLevel(level);
    setCurrentView('learn-card');
    announceView('Learn Card');
  };

  const handleStartLearning = () => {
    if (allLevels.length === 0) return;
    const firstUncompleted =
      allLevels.find((lvl) => !progress.levels[lvl.id]?.completed) || allLevels[0];
    handleSelectLevel(firstUncompleted);
  };

  const handleStartGame = async (
    isPractice: boolean,
    forceRegenerate = false,
    targetLevel?: Level,
    forceGame: GameChoice | 'auto' = 'auto'
  ) => {
    const levelToPlay = targetLevel || currentLevel;
    if (!levelToPlay || !course) return;

    if (targetLevel) {
      setCurrentLevel(targetLevel);
    }
    setPracticeMode(isPractice);
    setLastForceGame(forceGame);
    setQuestionLoadError(null);

    const segments = buildLevelSegments(
      levelToPlay,
      forceGame !== 'auto' ? { forceGame } : undefined
    );
    setCurrentSegments(segments);

    const initialStatuses: SegmentStatusItem[] = segments.map((seg) => {
      const gEntry = GAME_REGISTRY[seg.gameId];
      return {
        gameId: seg.gameId,
        name: `${gEntry.name}${seg.gameId === 'runner' ? ' questions' : ''}`,
        status: 'preparing',
      };
    });
    setSegmentStatuses(initialStatuses);
    setCurrentView('loading-questions');
    announceView('Loading Challenges');

    const controller = new AbortController();
    questionGenAbortRef.current = controller;

    try {
      const result = await generateLevelContent({
        level: levelToPlay,
        course,
        segments,
        forceRegenerate,
        onSegmentStatus: (gameId, status) => {
          setSegmentStatuses((prev) =>
            prev.map((s) => (s.gameId === gameId ? { ...s, status } : s))
          );
        },
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (result.hasFailure) {
        const failed = result.segments.find((s) => !s.content || s.error);
        setQuestionLoadError({
          message: failed?.error?.message || "We couldn't build challenges for this level.",
          technical: failed?.error?.technical,
        });
        return;
      }

      const contentsMap: Record<string, any> = {};
      result.segments.forEach((seg) => {
        contentsMap[seg.segmentId] = seg.content;
      });

      setSegmentContents(contentsMap);
      setCurrentView('game');
      announceView('Game');
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setQuestionLoadError({
        message: "We couldn't reach the AI service. Check your connection and try again.",
        technical: String(err?.message || err),
      });
    }
  };

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
    handleStartGame(true, false, practiceLevel, 'auto');
  };

  const handleStartSmartRevision = (size: RevisionSize = 'standard', practice = false) => {
    if (!course) return;
    const plan = buildRevisionPlan(course, progress, size);
    setActiveRevisionPlan(plan);
    setPracticeMode(practice);
    setCurrentView('revision-brief');
    announceView('Revision Brief');
  };

  const handleReviseSingleConcept = (concept: Concept, chapterId: string) => {
    if (!course) return;
    const plan = buildRevisionPlanForConcept(concept, chapterId, progress);
    setActiveRevisionPlan(plan);
    setPracticeMode(false);
    setCurrentView('revision-brief');
    announceView('Revision Brief');
  };

  const handleStartRevisionSession = (plan: RevisionPlan, practice = false) => {
    setActiveRevisionPlan(plan);
    setPracticeMode(practice);
    handleStartGame(practice, false, plan.virtualLevel, 'auto');
  };

  const handlePlayLevel = (level: Level) => {
    handleSelectLevel(level);
  };

  const handleCancelQuestionLoading = () => {
    if (questionGenAbortRef.current) {
      questionGenAbortRef.current.abort();
      questionGenAbortRef.current = null;
    }
    setQuestionLoadError(null);
    if (currentLevel?.id.startsWith('rev-')) {
      setCurrentView('revision-brief');
    } else if (currentLevel?.id.startsWith('practice-')) {
      setCurrentView('world-map');
    } else {
      setCurrentView('learn-card');
    }
  };

  const handleRetryQuestionLoading = () => {
    handleStartGame(practiceMode, true, currentLevel || undefined, lastForceGame);
  };

  const handleFinishGame = (result: LevelResult) => {
    const updatedProgress = recordLevelResult(result, course || undefined);
    setProgress(updatedProgress);
    setLevelResult(result);
    setCurrentView('result');
    announceView('Level Results');
  };

  const handlePlayAgain = () => {
    if (currentLevel?.id.startsWith('rev-')) {
      handleStartSmartRevision('standard', practiceMode);
      return;
    }

    if (!currentLevel || currentSegments.length === 0) return;

    const reshuffledContents: Record<string, any> = {};
    currentSegments.forEach((seg) => {
      const orig = segmentContents[seg.id];
      if (!orig) return;

      if (seg.gameId === 'runner' && Array.isArray(orig)) {
        reshuffledContents[seg.id] = shuffleQuestionsWithProgression(orig);
      } else if (seg.gameId === 'lieHunter' && Array.isArray(orig)) {
        reshuffledContents[seg.id] = shuffleLieHunterStatements(orig);
      } else {
        reshuffledContents[seg.id] = [...orig];
      }
    });

    setSegmentContents(reshuffledContents);
    setCurrentView('game');
    announceView('Game');
  };

  const handleNextLevel = () => {
    if (!currentLevel) return;
    const currentIndex = allLevels.findIndex((lvl) => lvl.id === currentLevel.id);
    if (currentIndex >= 0 && currentIndex < allLevels.length - 1) {
      const nextLvl = allLevels[currentIndex + 1];
      handleSelectLevel(nextLvl);
    } else {
      setCurrentView('course');
      announceView('Course Overview');
    }
  };

  const hasNextLevel = useMemo(() => {
    if (!currentLevel) return false;
    const currentIndex = allLevels.findIndex((lvl) => lvl.id === currentLevel.id);
    return currentIndex >= 0 && currentIndex < allLevels.length - 1;
  }, [allLevels, currentLevel]);

  const totalLevelsInCurrentChapter = useMemo(() => {
    if (!currentLevel) return 1;
    return allLevels.filter((lvl) => lvl.chapterId === currentLevel.chapterId).length;
  }, [allLevels, currentLevel]);

  return (
    <div className="min-h-screen retro-grid-bg flex flex-col justify-between selection:bg-[#FF1376] selection:text-white">
      {/* Skip to Main Content for Accessibility */}
      <a href="#main-content" className="skip-link font-pixel text-xs">
        Skip to main content
      </a>

      {/* Screen Reader ARIA Live Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      {/* Top Banner Bar */}
      <header className="border-b border-[#202636] bg-[#0A0D15]/95 backdrop-blur-xs sticky top-0 z-40 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              type="button"
              onClick={() => {
                if (course) setCurrentView('course');
                else setCurrentView('upload');
              }}
              className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] rounded px-1 cursor-pointer"
              aria-label="StudyQuest Home"
            >
              <div className="w-2.5 h-2.5 bg-[#FF1376] rotate-45 shadow-[0_0_8px_rgba(255,19,118,0.8)]" />
              <span className="font-pixel text-xs sm:text-sm text-white tracking-wider">
                Study<span className="text-[#38BDF8]">Quest</span>
              </span>
            </button>

            {/* Top Navigation Tabs when course is active */}
            {course && (
              <nav aria-label="Course views" className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('course');
                    announceView('Overview');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                    currentView === 'course'
                      ? 'bg-[#161F30] text-[#38BDF8] border border-[#0284C7]/60 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-[#121622]'
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('world-map');
                    announceView('World Map');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                    currentView === 'world-map'
                      ? 'bg-[#161F30] text-[#38BDF8] border border-[#0284C7]/60 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-[#121622]'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-[#38BDF8]" aria-hidden="true" />
                  <span>Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('dashboard');
                    announceView('Dashboard');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                    currentView === 'dashboard'
                      ? 'bg-[#161F30] text-[#FF4D9E] border border-[#FF1376]/60 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-[#121622]'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5 text-[#FF4D9E]" aria-hidden="true" />
                  <span>Dashboard</span>
                  {dueCount > 0 && (
                    <span
                      className="ml-0.5 px-1.5 py-0.2 bg-[#FF1376] text-white text-[10px] font-bold rounded-full shadow-[0_0_8px_rgba(255,19,118,0.6)]"
                      title={`${dueCount} concepts due for review`}
                    >
                      {dueCount}
                    </span>
                  )}
                </button>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Total XP Badge */}
            <button
              type="button"
              onClick={() => {
                if (course) setCurrentView('dashboard');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#11141F] border border-[#202738] text-xs font-mono text-[#38BDF8] shadow-inner hover:border-[#0284C7] transition-colors cursor-pointer"
              title={course ? 'View Retention & Readiness Dashboard' : 'XP Earned'}
            >
              <Coins className="w-3.5 h-3.5 text-[#FF1376]" aria-hidden="true" />
              <span className="font-bold">XP: {progress.totalXp}</span>
            </button>

            {/* How It Works Help Button */}
            <button
              type="button"
              onClick={() => setShowHowItWorksModal(true)}
              className="p-1.5 rounded-lg bg-[#141A33] border border-[#2B355E] text-slate-400 hover:text-[#2DD4BF] hover:border-[#2DD4BF]/50 transition-colors cursor-pointer"
              title="How StudyQuest Works"
              aria-label="How StudyQuest Works"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Keyboard Shortcuts Button */}
            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              className="p-1.5 rounded-lg bg-[#141A33] border border-[#2B355E] text-slate-400 hover:text-[#F5C542] hover:border-[#F5C542]/50 transition-colors cursor-pointer"
              title="Keyboard Shortcuts (?)"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-1.5 rounded-lg bg-[#141A33] border border-[#2B355E] text-slate-400 hover:text-white hover:border-slate-400 transition-colors cursor-pointer"
              title="Settings & Audio"
              aria-label="Settings and Preferences"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Presenter Toggle */}
            <button
              type="button"
              onClick={() => setIsPresenterMode(!isPresenterMode)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isPresenterMode
                  ? 'bg-[#F5C542] text-black border-[#F5C542]'
                  : 'bg-[#141A33] border-[#2B355E] text-slate-400 hover:text-[#F5C542]'
              }`}
              title="Toggle Presenter Mode (Ctrl+Shift+P)"
              aria-label="Toggle Presenter Mode"
            >
              <Presentation className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Views with id for skip link */}
      <main id="main-content" className="flex-1 flex flex-col justify-center py-4" tabIndex={-1}>
        {/* Welcome Banner on Overview or Upload */}
        {(currentView === 'course' || currentView === 'upload') && (
          <WelcomeBanner onOpenHowItWorks={() => setShowHowItWorksModal(true)} />
        )}

        {/* VIEW A: Upload */}
        {currentView === 'upload' && (
          <div className="view-transition">
            <UploadView
              onStartExtraction={handleStartExtraction}
              onLoadSample={handleLoadSample}
            />
          </div>
        )}

        {/* VIEW B: PDF Extraction Processing */}
        {currentView === 'processing' && (
          <div className="view-transition">
            <ProcessingView
              currentStepLabel={processingStepLabel}
              currentStepIndex={processingStepIndex}
              onCancel={handleCancelExtraction}
              error={processingError}
              onRetry={handleRetryExtraction}
              onBackToUpload={handleCancelExtraction}
            />
          </div>
        )}

        {/* VIEW C: Course Overview */}
        {currentView === 'course' && course && (
          <div className="view-transition">
            <CourseOverviewView
              course={course}
              progress={progress}
              onStartOver={() => setShowStartOverConfirm(true)}
              onSelectLevel={handleSelectLevel}
              onStartLearning={handleStartLearning}
              onOpenWorldMap={() => {
                setCurrentView('world-map');
                announceView('World Map');
              }}
              onOpenDashboard={() => {
                setCurrentView('dashboard');
                announceView('Dashboard');
              }}
              onStartRevision={() => handleStartSmartRevision('standard', false)}
            />
          </div>
        )}

        {/* VIEW C2: World Map & Mastery Realm */}
        {currentView === 'world-map' && course && (
          <div className="view-transition">
            <WorldMapView
              course={course}
              progress={progress}
              onBackToCourse={() => {
                setCurrentView('course');
                announceView('Course Overview');
              }}
              onPracticeConcept={handlePracticeConcept}
              onSelectLevel={handleSelectLevel}
              onOpenDashboard={() => {
                setCurrentView('dashboard');
                announceView('Dashboard');
              }}
              onStartSmartRevision={() => handleStartSmartRevision('standard', false)}
            />
          </div>
        )}

        {/* VIEW C3: Phase 6 Dashboard */}
        {currentView === 'dashboard' && course && (
          <div className="view-transition">
            <DashboardView
              course={course}
              progress={progress}
              onBackToCourse={() => {
                setCurrentView('course');
                announceView('Course Overview');
              }}
              onOpenWorldMap={() => {
                setCurrentView('world-map');
                announceView('World Map');
              }}
              onStartSmartRevision={handleStartSmartRevision}
              onReviseConcept={handleReviseSingleConcept}
              onPlayLevel={handlePlayLevel}
              onStartLearning={handleStartLearning}
              onResetProgress={() => {
                clearProgress();
                setProgress(loadProgress());
                info('Progress reset.');
              }}
              onSeedDemoProgress={() => {
                seedDemoProgress(course);
                setProgress(loadProgress());
                success('Demo mastery records populated.');
              }}
              onClearAllProgress={() => {
                clearProgress();
                clearAllLevelCaches();
                clearAllQuestionCaches();
                setProgress(loadProgress());
                info('All progress and caches cleared.');
              }}
            />
          </div>
        )}

        {/* VIEW C4: Phase 6 Smart Revision Brief */}
        {currentView === 'revision-brief' && activeRevisionPlan && (
          <div className="view-transition">
            <RevisionBriefView
              plan={activeRevisionPlan}
              onStartSession={handleStartRevisionSession}
              onBackToDashboard={() => {
                setCurrentView('dashboard');
                announceView('Dashboard');
              }}
            />
          </div>
        )}

        {/* VIEW D: Learn Card */}
        {currentView === 'learn-card' && currentLevel && (
          <div className="view-transition">
            <LearnCardView
              level={currentLevel}
              totalLevelsInChapter={totalLevelsInCurrentChapter}
              onBackToCourse={() => {
                setCurrentView('course');
                announceView('Course Overview');
              }}
              onStartGame={handleStartGame}
            />
          </div>
        )}

        {/* VIEW E: Loading Challenge */}
        {currentView === 'loading-questions' && (
          <div className="view-transition">
            <QuestionLoadingView
              segmentStatuses={segmentStatuses}
              onCancel={handleCancelQuestionLoading}
              error={questionLoadError}
              onRetry={handleRetryQuestionLoading}
              onBackToCourse={() => {
                setCurrentView('course');
                announceView('Course Overview');
              }}
              onPlayRunnerInstead={() =>
                handleStartGame(practiceMode, false, currentLevel || undefined, 'runner')
              }
            />
          </div>
        )}

        {/* VIEW F: Gameplay (Multi-Segment Session wrapped in GameErrorBoundary) */}
        {currentView === 'game' && currentLevel && (
          <div className="view-transition">
            <GameErrorBoundary
              onFallbackToRunner={() =>
                handleStartGame(practiceMode, false, currentLevel, 'runner')
              }
              onQuit={() => {
                if (currentLevel.id.startsWith('rev-')) {
                  setCurrentView('dashboard');
                } else if (currentLevel.id.startsWith('practice-')) {
                  setCurrentView('world-map');
                } else {
                  setCurrentView('course');
                }
              }}
            >
              <GameView
                level={currentLevel}
                segments={currentSegments}
                segmentContents={segmentContents}
                practiceMode={practiceMode}
                onFinish={handleFinishGame}
                onQuit={() => {
                  if (currentLevel.id.startsWith('rev-')) {
                    setCurrentView('dashboard');
                  } else if (currentLevel.id.startsWith('practice-')) {
                    setCurrentView('world-map');
                  } else {
                    setCurrentView('course');
                  }
                }}
              />
            </GameErrorBoundary>
          </div>
        )}

        {/* VIEW G: Result Screen */}
        {currentView === 'result' && levelResult && (
          <div className="view-transition">
            <ResultView
              result={levelResult}
              hasNextLevel={hasNextLevel}
              onPlayAgain={handlePlayAgain}
              onNextLevel={handleNextLevel}
              onBackToCourse={() => {
                setCurrentView('course');
                announceView('Course Overview');
              }}
              onReviewConcepts={() => {
                setCurrentView('learn-card');
                announceView('Learn Card');
              }}
              onOpenWorldMap={() => {
                setCurrentView('world-map');
                announceView('World Map');
              }}
              onOpenDashboard={() => {
                setCurrentView('dashboard');
                announceView('Dashboard');
              }}
            />
          </div>
        )}
      </main>

      {/* Subtle Dungeon Footer with QA & Shortcuts Access */}
      <footer className="border-t border-[#181E38] py-4 px-4 text-center text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto w-full gap-2">
        <div>StudyQuest · Dungeon Learning Suite & Spaced Repetition Engine</div>
        <div className="flex items-center gap-4 text-[11px]">
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="hover:text-slate-300 transition-colors cursor-pointer"
          >
            Shortcuts (?)
          </button>
          <button
            type="button"
            onClick={() => setShowQAModal(true)}
            className="hover:text-[#2DD4BF] transition-colors cursor-pointer flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span>QA Suite (?qa=1)</span>
          </button>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onResetAllProgress={() => {
          clearProgress();
          setProgress(loadProgress());
        }}
      />

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={showHowItWorksModal}
        onClose={() => setShowHowItWorksModal(false)}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* QA Test Runner Modal */}
      <QAModal isOpen={showQAModal} onClose={() => setShowQAModal(false)} />

      {/* Start Over Confirm Dialog */}
      <ConfirmDialog
        isOpen={showStartOverConfirm}
        title="START OVER WITH A NEW COURSE?"
        message="This will clear the current course structure and reset level records so you can upload or select new material."
        confirmLabel="Start Over"
        variant="danger"
        onConfirm={handleConfirmStartOver}
        onCancel={() => setShowStartOverConfirm(false)}
      />

      {/* Presenter Toolbar */}
      {isPresenterMode && (
        <PresenterToolbar
          currentView={currentView}
          onNavigate={(v) => {
            setCurrentView(v);
            announceView(v);
          }}
          onClose={() => setIsPresenterMode(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <StudyQuestApp />
      </ToastProvider>
    </ErrorBoundary>
  );
}
