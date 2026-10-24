import React, { useState, useEffect, useRef } from 'react';
import {
  PlatformerRound,
  StepAnswer,
  PlatformerRoundSummary,
  LevelResult,
  Level,
} from '../../types/course.ts';
import { playSound } from '../../services/soundEffects.ts';
import { calculateStars, calculateXpEarned } from '../../services/progressService.ts';
import {
  Heart,
  Sparkles,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  BookOpen,
  Info,
} from 'lucide-react';

interface PlatformerSimpleModeProps {
  rounds: PlatformerRound[];
  level: Level;
  lives?: number;
  initialStreak?: number;
  practiceMode?: boolean;
  muted?: boolean;
  reduceMotion?: boolean;
  onFinish: (result: LevelResult) => void;
  onQuit: () => void;
  onLivesChange?: (lives: number) => void;
  onSwitchToCanvasMode?: () => void;
}

export const PlatformerSimpleMode: React.FC<PlatformerSimpleModeProps> = ({
  rounds,
  level,
  lives: initialLives = 3,
  initialStreak = 0,
  practiceMode = false,
  muted = false,
  reduceMotion = false,
  onFinish,
  onQuit,
  onLivesChange,
  onSwitchToCanvasMode,
}) => {
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0); // Which step in round.steps is expected next
  const [livesLeft, setLivesLeft] = useState(initialLives);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(initialStreak);
  const [bestStreak, setBestStreak] = useState(initialStreak);
  const [hintsLeft, setHintsLeft] = useState(2);
  const [isPaused, setIsPaused] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [hintedStepIndices, setHintedStepIndices] = useState<Set<number>>(new Set());
  const [highlightedStepId, setHighlightedStepId] = useState<string | null>(null);

  // Cards in current round (shuffled)
  const [shuffledCards, setShuffledCards] = useState<Array<{
    id: string;
    label: string;
    isDecoy: boolean;
    stepIndex?: number;
    explanation: string;
    whyNot?: string;
  }>>([]);

  // Solved steps in current round
  const [solvedStepIds, setSolvedStepIds] = useState<Set<string>>(new Set());

  // Blocking dialog states
  const [blockingWrong, setBlockingWrong] = useState<{
    isDecoy: boolean;
    chosenLabel: string;
    expectedStepLabel: string;
    expectedExplanation: string;
    whyNot?: string;
    page: number;
    sourceQuote: string;
  } | null>(null);

  const [blockingRoundComplete, setBlockingRoundComplete] = useState<boolean>(false);

  // Answers & metrics accumulators
  const answersRef = useRef<StepAnswer[]>([]);
  const roundSummariesRef = useRef<PlatformerRoundSummary[]>([]);
  const currentRoundMistakesRef = useRef(0);
  const currentRoundHintsUsedRef = useRef(0);
  const stepAttemptsRef = useRef<Record<number, number>>({});
  const stepFirstChosenIdRef = useRef<Record<number, string>>({});
  const stepStartTimeRef = useRef(Date.now());
  const [ariaLive, setAriaLive] = useState('');

  const currentRound = rounds[currentRoundIdx];
  const totalRounds = rounds.length;

  // Initialize round cards
  useEffect(() => {
    if (!currentRound) return;
    setCurrentStepIdx(0);
    setSolvedStepIds(new Set());
    setHintsLeft(2);
    setHintedStepIndices(new Set());
    setHighlightedStepId(null);
    setBlockingWrong(null);
    setBlockingRoundComplete(false);
    currentRoundMistakesRef.current = 0;
    currentRoundHintsUsedRef.current = 0;
    stepAttemptsRef.current = {};
    stepFirstChosenIdRef.current = {};
    stepStartTimeRef.current = Date.now();

    interface SimpleCardItem {
      id: string;
      label: string;
      isDecoy: boolean;
      stepIndex?: number;
      explanation: string;
      whyNot?: string;
    }

    const items: SimpleCardItem[] = currentRound.steps.map((s, idx) => ({
      id: s.id,
      label: s.label,
      isDecoy: false,
      stepIndex: idx,
      explanation: s.explanation,
    }));

    if (currentRound.kind === 'challenge' && currentRound.decoy) {
      items.push({
        id: currentRound.decoy.id,
        label: currentRound.decoy.label,
        isDecoy: true,
        explanation: currentRound.decoy.whyNot,
        whyNot: currentRound.decoy.whyNot,
      });
    }

    // Shuffle cards so they're not in order
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setAriaLive(`Round ${currentRoundIdx + 1} of ${totalRounds}: ${currentRound.title}`);
  }, [currentRoundIdx, currentRound, totalRounds]);

  const updateLives = (newLives: number) => {
    setLivesLeft(newLives);
    onLivesChange?.(newLives);
  };

  const handleUseHint = () => {
    if (!currentRound || isPaused || blockingWrong || blockingRoundComplete) return;
    if (!practiceMode && hintsLeft <= 0) return;

    const expected = currentRound.steps[currentStepIdx];
    if (!expected) return;

    playSound('hint');
    setHintedStepIndices((prev) => new Set([...prev, currentStepIdx]));
    setHighlightedStepId(expected.id);
    currentRoundHintsUsedRef.current++;

    if (!practiceMode) {
      setHintsLeft((prev) => Math.max(0, prev - 1));
      setScore((prev) => Math.max(0, prev - 25)); // Cost 25 pts
    }

    setAriaLive(`Hint used for step ${currentStepIdx + 1}`);

    setTimeout(() => {
      setHighlightedStepId(null);
    }, 3000);
  };

  const handleSelectCard = (card: typeof shuffledCards[0]) => {
    if (isPaused || blockingWrong || blockingRoundComplete || !currentRound) return;
    if (solvedStepIds.has(card.id)) return; // Already solved

    const expectedStep = currentRound.steps[currentStepIdx];
    if (!expectedStep) return;

    const attempts = (stepAttemptsRef.current[currentStepIdx] || 0) + 1;
    stepAttemptsRef.current[currentStepIdx] = attempts;
    if (!stepFirstChosenIdRef.current[currentStepIdx]) {
      stepFirstChosenIdRef.current[currentStepIdx] = card.id;
    }

    const isFirstTry = attempts === 1;
    const isHinted = hintedStepIndices.has(currentStepIdx);

    if (!card.isDecoy && card.id === expectedStep.id) {
      // CORRECT!
      playSound('correct');
      const timeMs = Date.now() - stepStartTimeRef.current;
      stepStartTimeRef.current = Date.now();

      let points = 25;
      let newStreak = streak;
      if (isFirstTry && !isHinted) {
        const streakBonus = Math.min(100, streak * 25);
        points = 100 + streakBonus;
        newStreak = streak + 1;
        setStreak(newStreak);
        setBestStreak((prev) => Math.max(prev, newStreak));
      }

      setScore((prev) => prev + points);
      setSolvedStepIds((prev) => new Set([...prev, card.id]));

      // Record answer
      answersRef.current.push({
        itemId: expectedStep.id,
        conceptId: currentRound.conceptId,
        gameId: 'platformer',
        correct: isFirstTry && !isHinted,
        hinted: isHinted,
        attempts,
        chosenId: stepFirstChosenIdRef.current[currentStepIdx] || card.id,
        correctId: expectedStep.id,
        timeMs,
      });

      const nextStepIdx = currentStepIdx + 1;
      setAriaLive(`Step ${currentStepIdx + 1} correct: ${card.label}`);

      if (nextStepIdx >= currentRound.steps.length) {
        // Round Complete!
        playSound('roundComplete');
        let bonus = 0;
        if (currentRoundMistakesRef.current === 0 && currentRoundHintsUsedRef.current === 0) {
          bonus = 150;
          setScore((prev) => prev + bonus);
        }

        roundSummariesRef.current.push({
          roundId: currentRound.id,
          conceptId: currentRound.conceptId,
          kind: currentRound.kind,
          mistakes: currentRoundMistakesRef.current,
          hintsUsed: currentRoundHintsUsedRef.current,
        });

        setBlockingRoundComplete(true);
      } else {
        setCurrentStepIdx(nextStepIdx);
      }
    } else {
      // WRONG!
      playSound('wrong');
      playSound('crumble');
      currentRoundMistakesRef.current++;
      setStreak(0);

      const remLives = practiceMode ? livesLeft : Math.max(0, livesLeft - 1);
      if (!practiceMode) {
        updateLives(remLives);
      }

      setBlockingWrong({
        isDecoy: card.isDecoy,
        chosenLabel: card.label,
        expectedStepLabel: expectedStep.label,
        expectedExplanation: expectedStep.explanation,
        whyNot: card.whyNot,
        page: currentRound.page,
        sourceQuote: currentRound.sourceQuote,
      });

      setAriaLive(
        card.isDecoy
          ? `Incorrect: ${card.label} does not belong in this process.`
          : `Incorrect: That step comes later. Next step is: ${expectedStep.label}`
      );
    }
  };

  const handleContinueAfterWrong = () => {
    setBlockingWrong(null);
    if (!practiceMode && livesLeft <= 0) {
      // Conclude out of lives
      concludeGame('outOfLives');
    }
  };

  const handleContinueAfterRoundComplete = () => {
    setBlockingRoundComplete(false);
    if (currentRoundIdx < totalRounds - 1) {
      setCurrentRoundIdx((prev) => prev + 1);
    } else {
      // Finished all rounds in this segment!
      concludeGame('completed');
    }
  };

  const concludeGame = (status: 'completed' | 'outOfLives' | 'quit') => {
    const answers = answersRef.current;
    const summaries = roundSummariesRef.current;
    const firstTryCorrectCount = answers.filter((a) => a.correct).length;
    const totalAnswers = Math.max(1, answers.length);
    const accuracyPercent = Math.round((firstTryCorrectCount / totalAnswers) * 100);
    const finalStatus = status === 'outOfLives' ? 'out_of_lives' : 'completed';
    const stars = calculateStars(accuracyPercent, finalStatus);
    const xpEarned = calculateXpEarned({
      practiceMode,
      correctCount: firstTryCorrectCount,
      stars,
    });

    onFinish({
      levelId: level.id,
      gameId: 'platformer',
      practiceMode,
      status: status === 'outOfLives' ? 'outOfLives' : status === 'quit' ? 'quit' : 'completed',
      score,
      bestStreak,
      endStreak: streak,
      livesLeft,
      totalQuestions: totalAnswers,
      correctCount: firstTryCorrectCount,
      accuracyPercent,
      stars,
      xpEarned,
      answers,
      platformerRounds: rounds,
      platformerSummary: summaries,
      level,
    });
  };

  // Keyboard support: 1-9 selects card, H hint, P/Escape pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (blockingWrong || blockingRoundComplete || isInfoOpen) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (blockingWrong) handleContinueAfterWrong();
          else if (blockingRoundComplete) handleContinueAfterRoundComplete();
        }
        return;
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
        return;
      }
      if (isPaused) return;

      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        handleUseHint();
        return;
      }

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= shuffledCards.length) {
        e.preventDefault();
        handleSelectCard(shuffledCards[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [blockingWrong, blockingRoundComplete, isInfoOpen, isPaused, shuffledCards, currentStepIdx]);

  if (!currentRound) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-3 flex flex-col items-center select-none font-sans">
      <div className="sr-only" aria-live="assertive">
        {ariaLive}
      </div>

      {/* 1. HUD BAR */}
      <div className="w-full bg-[#0F1426] border-2 border-[#242F55] rounded-xl px-4 py-2.5 mb-4 shadow-lg flex items-center justify-between gap-2 sm:gap-4">
        {/* Lives / Practice */}
        <div className="flex items-center gap-1.5">
          {practiceMode ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-950/80 border border-teal-500/40 text-teal-300 text-xs font-mono font-bold">
              <Shield className="w-3.5 h-3.5 text-[#2DD4BF]" />
              <span>PRACTICE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((idx) => (
                <Heart
                  key={idx}
                  className={`w-5 h-5 transition-transform ${
                    idx < livesLeft
                      ? 'text-[#EF4444] fill-[#EF4444] scale-100'
                      : 'text-slate-600 fill-slate-800 scale-90'
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
          )}
        </div>

        {/* Score & Streak */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-mono text-[#F5C542]">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="font-bold">{score} PTS</span>
          </div>
          {streak > 1 && (
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 text-[#FDE68A] border border-amber-500/40 animate-pulse">
              Streak x{streak}
            </span>
          )}
        </div>

        {/* Round & Progress */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-300">
          <span className="text-[#2DD4BF] font-bold">
            Round {currentRoundIdx + 1}/{totalRounds}
          </span>
          <span className="text-slate-500">•</span>
          <span>
            Step {currentStepIdx + 1}/{currentRound.steps.length}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUseHint}
            disabled={(!practiceMode && hintsLeft <= 0) || isPaused}
            className="px-2.5 py-1 rounded bg-[#18213D] border border-[#2F3E70] text-xs font-mono font-semibold text-[#F5C542] hover:bg-[#202C52] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            title="Reveal next step (key H)"
          >
            <Lightbulb className="w-3.5 h-3.5 text-[#F5C542]" />
            <span>Hint ({practiceMode ? '∞' : hintsLeft})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            className="p-1.5 rounded bg-[#18213D] border border-[#2F3E70] text-slate-400 hover:text-white cursor-pointer"
            title="Instructions"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className="p-1.5 rounded bg-[#18213D] border border-[#2F3E70] text-slate-400 hover:text-white cursor-pointer"
            title="Pause (P or Esc)"
          >
            {isPaused ? <Play className="w-4 h-4 text-[#2DD4BF]" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. INSTRUCTION & SEQUENCE SO FAR PANELS */}
      <div className="w-full bg-[#12162B] border-2 border-[#232A47] rounded-xl p-4 mb-4 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[11px] text-[#F5C542] uppercase tracking-wider">
              {currentRound.title}
            </span>
            {currentRound.kind === 'challenge' && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-300 font-bold">
                AVOID DECOY
              </span>
            )}
          </div>
          {onSwitchToCanvasMode && (
            <button
              type="button"
              onClick={onSwitchToCanvasMode}
              className="text-[11px] text-teal-400 hover:text-teal-300 underline font-mono cursor-pointer"
            >
              Switch to Platformer Canvas
            </button>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-200 mb-3">{currentRound.instruction}</p>

        {/* "Sequence So Far" Slots */}
        <div className="w-full pt-3 border-t border-[#1F2747]">
          <div className="text-[11px] font-mono text-slate-400 uppercase mb-2">
            Sequence So Far:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {currentRound.steps.map((st, idx) => {
              const isFilled = idx < currentStepIdx;
              return (
                <div
                  key={st.id}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between min-h-[56px] transition-all ${
                    isFilled
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                      : idx === currentStepIdx
                      ? 'bg-[#18213D] border-[#F5C542] text-amber-200 animate-pulse'
                      : 'bg-[#0A0D1B] border-[#1F2848] text-slate-600'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold block mb-0.5">
                    Step {idx + 1}
                  </span>
                  <span className="text-[11px] font-medium leading-tight truncate">
                    {isFilled ? st.label : '?'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. SHUFFLED INTERACTIVE CARDS */}
      <div className="w-full mb-6">
        <div className="text-xs font-mono text-slate-400 mb-2 flex items-center justify-between">
          <span>Choose the next step in sequence (click or press 1-{shuffledCards.length}):</span>
          <span className="text-teal-400 font-semibold">Expecting Step #{currentStepIdx + 1}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shuffledCards.map((card, idx) => {
            const isSolved = solvedStepIds.has(card.id);
            const isHighlighted = highlightedStepId === card.id;

            return (
              <button
                key={card.id}
                type="button"
                disabled={isSolved || isPaused}
                onClick={() => handleSelectCard(card)}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer relative flex items-start gap-3 ${
                  isSolved
                    ? 'bg-emerald-950/20 border-emerald-600/40 opacity-50 cursor-not-allowed'
                    : isHighlighted
                    ? 'bg-[#2A2B15] border-[#FDE047] shadow-[0_0_20px_rgba(253,224,71,0.4)] scale-[1.02]'
                    : 'bg-[#12162B] border-[#242F55] hover:border-[#2DD4BF] hover:bg-[#161D36]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-mono text-xs font-bold border ${
                    isSolved
                      ? 'bg-emerald-900 border-emerald-600 text-emerald-200'
                      : 'bg-[#1E2748] border-[#344275] text-[#F5C542]'
                  }`}
                >
                  {isSolved ? '✓' : idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white leading-snug">{card.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. BLOCKING WRONG PANEL */}
      {blockingWrong && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#14182E] border-2 border-red-500 rounded-2xl p-6 shadow-2xl animate-fade-in text-left">
            <div className="flex items-center gap-2.5 text-red-400 font-pixel text-xs mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span>{blockingWrong.isDecoy ? 'FALSE STEP DETECTED' : 'INCORRECT ORDER'}</span>
            </div>

            <p className="text-sm font-semibold text-red-200 mb-3">
              {blockingWrong.isDecoy
                ? `"${blockingWrong.chosenLabel}" does not belong in this process.`
                : 'That step comes later in the process.'}
            </p>

            {blockingWrong.isDecoy && blockingWrong.whyNot && (
              <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-500/40 text-xs text-red-300 mb-4">
                <span className="font-bold block mb-1 font-mono uppercase text-[10px]">
                  Why it does not belong:
                </span>
                {blockingWrong.whyNot}
              </div>
            )}

            {!blockingWrong.isDecoy && (
              <div className="p-3.5 rounded-lg bg-[#0E1226] border border-[#252F56] text-xs text-slate-300 mb-4">
                <span className="text-[#F5C542] font-bold block mb-1 font-mono uppercase text-[10px]">
                  Next Expected Step:
                </span>
                <p className="font-semibold text-white mb-1.5">{blockingWrong.expectedStepLabel}</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {blockingWrong.expectedExplanation}
                </p>
              </div>
            )}

            {/* Source quote */}
            <div className="p-3 rounded-lg bg-[#0B0F20] border-l-4 border-teal-400 border-y border-r border-[#1C2545] text-xs text-teal-200 mb-5">
              <span className="font-mono text-teal-400 text-[10px] block mb-0.5">
                FROM THE PDF: Page {blockingWrong.page}
              </span>
              <p className="italic text-[11px] text-teal-100/90">&ldquo;{blockingWrong.sourceQuote}&rdquo;</p>
            </div>

            <button
              type="button"
              onClick={handleContinueAfterWrong}
              className="w-full btn-pixel-gold py-3 rounded-xl text-xs sm:text-sm font-pixel cursor-pointer"
            >
              Continue (Enter)
            </button>
          </div>
        </div>
      )}

      {/* 5. BLOCKING ROUND COMPLETE PANEL */}
      {blockingRoundComplete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#14182E] border-2 border-emerald-500 rounded-2xl p-6 shadow-2xl animate-fade-in text-left">
            <div className="flex items-center gap-2.5 text-emerald-400 font-pixel text-xs mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>SEQUENCE COMPLETE!</span>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              You correctly arranged all stages of <strong className="text-white">{currentRound.title}</strong>.
            </p>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-1">
              {currentRound.steps.map((st, i) => (
                <div
                  key={st.id}
                  className="p-3 rounded-lg bg-[#0C1022] border border-[#1E284A] text-xs text-slate-200"
                >
                  <span className="font-mono text-[10px] font-bold text-[#F5C542] block mb-0.5">
                    Step {i + 1}: {st.label}
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{st.explanation}</p>
                </div>
              ))}

              {currentRound.kind === 'challenge' && currentRound.decoy && (
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-xs text-red-200">
                  <span className="font-mono text-[10px] font-bold text-red-400 block mb-0.5">
                    Not part of the process: {currentRound.decoy.label}
                  </span>
                  <p className="text-red-300 text-[11px] leading-relaxed">{currentRound.decoy.whyNot}</p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-[#0B0F20] border-l-4 border-teal-400 border-y border-r border-[#1C2545] text-xs text-teal-200 mb-5">
              <span className="font-mono text-teal-400 text-[10px] block mb-0.5">
                Page {currentRound.page}
              </span>
              <p className="italic text-[11px] text-teal-100/90">&ldquo;{currentRound.sourceQuote}&rdquo;</p>
            </div>

            <button
              type="button"
              onClick={handleContinueAfterRoundComplete}
              className="w-full btn-pixel-gold py-3 rounded-xl text-xs sm:text-sm font-pixel cursor-pointer"
            >
              Continue to Next (Enter)
            </button>
          </div>
        </div>
      )}

      {/* 6. PAUSE OVERLAY */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#14182E] border-2 border-[#2F3E70] rounded-2xl p-6 text-center shadow-2xl">
            <h3 className="font-pixel text-base text-[#F5C542] mb-4">GAME PAUSED</h3>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIsPaused(false)}
                className="w-full btn-pixel-gold py-2.5 rounded-lg text-xs font-pixel cursor-pointer"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={onQuit}
                className="w-full btn-pixel-dark py-2.5 rounded-lg text-xs font-pixel text-red-400 hover:text-red-300 cursor-pointer"
              >
                Quit Level
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. INFO / CONTROLS MODAL */}
      {isInfoOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#14182E] border-2 border-[#2F3E70] rounded-2xl p-6 text-left shadow-2xl">
            <h3 className="font-pixel text-xs text-[#F5C542] mb-3">HOW TO PLAY</h3>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              In Process Platformer Simple Mode, arrange the steps of the process in correct chronological order.
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside mb-4">
              <li>Click or press 1-{shuffledCards.length} to select the next step.</li>
              <li>First try correct gives +100 and builds your streak.</li>
              <li>Press H to use a hint. Outside practice mode, hints cost 25 pts.</li>
              <li>Avoid decoy steps in Challenge rounds!</li>
            </ul>
            <button
              type="button"
              onClick={() => setIsInfoOpen(false)}
              className="w-full btn-pixel-dark py-2.5 rounded-lg text-xs font-pixel cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
