import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LieHunterRound,
  LieHunterAnswer,
  RoundMistakeSummary,
  LevelResult,
  Level,
  FalseStatement,
  Statement,
} from '../../types/course.ts';
import { playSound, isAudioMuted, setAudioMuted } from '../../services/soundEffects.ts';
import { calculateStars, calculateXpEarned } from '../../services/progressService.ts';
import { EvidenceCard } from './EvidenceCard.tsx';
import { DetectiveHelper } from './DetectiveHelper.tsx';
import { CaseSolvedPanel, CardVerifiedPanel } from './CasePanel.tsx';
import { LieHunterIntroCard } from './LieHunterIntroCard.tsx';
import {
  Heart,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Search,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';

export interface LieHunterGameProps {
  rounds: LieHunterRound[];
  level: Level;
  lives?: number;
  practiceMode?: boolean;
  muted?: boolean;
  reduceMotion?: boolean;
  onFinish: (result: LevelResult) => void;
  onQuit: () => void;
  onLivesChange?: (lives: number) => void;
}

export const LieHunterGame: React.FC<LieHunterGameProps> = ({
  rounds,
  level,
  lives: initialLives = 3,
  practiceMode = false,
  muted: initialMuted = isAudioMuted(),
  reduceMotion: initialReduceMotion = false,
  onFinish,
  onQuit,
  onLivesChange,
}) => {
  // Game progression state
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [livesLeft, setLivesLeft] = useState(initialLives);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [magnifiersLeft, setMagnifiersLeft] = useState(2);

  // Settings state
  const [muted, setMuted] = useState(initialMuted);
  const [reduceMotion, setReduceMotion] = useState(initialReduceMotion);
  const [isPaused, setIsPaused] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Active round state
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [cardStampStates, setCardStampStates] = useState<Array<'none' | 'true' | 'false' | 'verified'>>([
    'none',
    'none',
    'none',
    'none',
  ]);
  const [lockedIndices, setLockedIndices] = useState<Set<number>>(new Set());

  // Round tracking metrics
  const [roundAttempts, setRoundAttempts] = useState(0);
  const [roundMistakes, setRoundMistakes] = useState(0);
  const [isRoundHinted, setIsRoundHinted] = useState(false);
  const [firstAccusedId, setFirstAccusedId] = useState<string | null>(null);
  const roundStartTimeRef = useRef<number>(Date.now());

  // Modals & Feedback panels
  const [activeVerifiedStatement, setActiveVerifiedStatement] = useState<Statement | null>(null);
  const [showCaseSolved, setShowCaseSolved] = useState(false);
  const [isGameOverOutOfLives, setIsGameOverOutOfLives] = useState(false);
  const [lastRoundScoreGained, setLastRoundScoreGained] = useState(0);

  // Detective reactions
  const [detectiveMood, setDetectiveMood] = useState<'idle' | 'thinking' | 'celebrate' | 'concerned' | 'hint'>('idle');
  const [detectiveSpeech, setDetectiveSpeech] = useState<string>('Examine the evidence board carefully...');

  // Accessibility screen reader announcer
  const [ariaLiveMessage, setAriaLiveMessage] = useState<string>('');

  // Collected answers per round
  const answersRef = useRef<LieHunterAnswer[]>([]);
  const roundsSummaryRef = useRef<RoundMistakeSummary[]>([]);

  const currentRound: LieHunterRound | undefined = rounds[currentRoundIndex];
  const totalRounds = rounds.length;

  // Concept name for current round
  const currentConcept = level.concepts.find((c) => c.id === currentRound?.conceptId);
  const conceptName = currentConcept?.name || 'Evidence File';

  // Toggle audio mute
  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
  };

  // Announce to screen reader
  const announce = (msg: string) => {
    setAriaLiveMessage(msg);
  };

  // Reset round state when round index changes
  const setupRound = useCallback((roundIdx: number) => {
    setSelectedCardIndex(null);
    setCardStampStates(['none', 'none', 'none', 'none']);
    setLockedIndices(new Set());
    setRoundAttempts(0);
    setRoundMistakes(0);
    setIsRoundHinted(false);
    setFirstAccusedId(null);
    setActiveVerifiedStatement(null);
    setShowCaseSolved(false);
    setIsGameOverOutOfLives(false);
    setDetectiveMood('thinking');
    setDetectiveSpeech('One statement has been tampered with. Which one is false?');
    roundStartTimeRef.current = Date.now();

    const round = rounds[roundIdx];
    announce(`Case ${roundIdx + 1} of ${rounds.length}: ${round?.difficulty || 'easy'} case on ${conceptName}.`);
  }, [rounds, conceptName]);

  useEffect(() => {
    if (!showIntro && currentRound) {
      setupRound(currentRoundIndex);
    }
  }, [currentRoundIndex, showIntro, setupRound]);

  // Tab focus / Auto-pause when user switches away
  useEffect(() => {
    const handleBlur = () => {
      if (!showIntro && !showCaseSolved && !activeVerifiedStatement) {
        setIsPaused(true);
      }
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [showIntro, showCaseSolved, activeVerifiedStatement]);

  // Update lives callback
  const updateLives = useCallback((newLives: number) => {
    setLivesLeft(newLives);
    if (onLivesChange) {
      onLivesChange(newLives);
    }
  }, [onLivesChange]);

  // Remaining unlocked cards count
  const unlockedCount = 4 - lockedIndices.size;
  const isMagnifierUsable = practiceMode
    ? unlockedCount > 2
    : magnifiersLeft > 0 && unlockedCount > 2;

  // Use Magnifier Hint (H key or button)
  const handleUseMagnifier = () => {
    if (!isMagnifierUsable || !currentRound || isPaused || showCaseSolved || activeVerifiedStatement) {
      return;
    }

    // Find candidate true cards that are NOT locked yet
    const candidateIndices: number[] = [];
    currentRound.statements.forEach((s, idx) => {
      if (!s.isFalse && !lockedIndices.has(idx)) {
        candidateIndices.push(idx);
      }
    });

    if (candidateIndices.length === 0) return;

    // Pick random true card to eliminate
    const pickedIndex = candidateIndices[Math.floor(Math.random() * candidateIndices.length)];

    playSound('magnify');
    setIsRoundHinted(true);
    if (!practiceMode) {
      setMagnifiersLeft((prev) => Math.max(0, prev - 1));
      setScore((prev) => Math.max(0, prev - 25)); // Cost 25 points
    }

    // Clear selection if it was the eliminated card
    if (selectedCardIndex === pickedIndex) {
      setSelectedCardIndex(null);
    }

    // Lock and stamp card with "VERIFIED"
    setLockedIndices((prev) => new Set([...prev, pickedIndex]));
    setCardStampStates((prev) => {
      const next = [...prev];
      next[pickedIndex] = 'verified';
      return next;
    });

    setDetectiveMood('hint');
    setDetectiveSpeech(`Magnifier confirmed Statement #${pickedIndex + 1} is authentic!`);
    announce(`Magnifier used. Statement ${pickedIndex + 1} verified true and removed from suspects.`);
  };

  // Card Selection (1-4 keys or click)
  const handleSelectCard = (index: number) => {
    if (isPaused || showCaseSolved || activeVerifiedStatement || lockedIndices.has(index)) {
      return;
    }
    playSound('select');
    setSelectedCardIndex(index);
    setDetectiveMood('thinking');
    announce(`Selected Statement ${index + 1}`);
  };

  // Finish Game & compile LevelResult
  const concludeGame = useCallback(
    (status: 'completed' | 'outOfLives' | 'quit') => {
      const answers = answersRef.current;
      const roundsSummary = roundsSummaryRef.current;
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

      const result: LevelResult = {
        levelId: level.id,
        gameId: 'lieHunter',
        practiceMode,
        status: status === 'outOfLives' ? 'outOfLives' : status === 'quit' ? 'quit' : 'completed',
        score,
        bestStreak,
        livesLeft,
        totalQuestions: totalRounds,
        correctCount: firstTryCorrectCount,
        accuracyPercent,
        stars,
        xpEarned,
        answers,
        rounds,
        roundsSummary,
        level,
      };

      onFinish(result);
    },
    [bestStreak, level, livesLeft, onFinish, practiceMode, rounds, score, totalRounds]
  );

  // Confirm Accusation
  const handleAccuse = () => {
    if (selectedCardIndex === null || !currentRound || isPaused || showCaseSolved || activeVerifiedStatement) {
      return;
    }

    const chosenCard = currentRound.statements[selectedCardIndex];
    if (!chosenCard) return;

    const falseStatement = currentRound.statements.find((s) => s.isFalse) as FalseStatement;
    const isFirstAttempt = roundAttempts === 0;
    const nextAttempts = roundAttempts + 1;
    setRoundAttempts(nextAttempts);

    if (isFirstAttempt) {
      setFirstAccusedId(chosenCard.id);
    }

    if (chosenCard.isFalse) {
      // -------------------------------------------------------------
      // CORRECT ACCUSATION (Chosen card is the lie!)
      // -------------------------------------------------------------
      playSound('caught');

      // Calculate score gained
      let gained = 0;
      let newStreak = streak;
      if (isFirstAttempt && !isRoundHinted) {
        // First try correct: +100 + streak bonus (+25 per streak step, capped at +100 bonus)
        const streakBonus = Math.min(100, streak * 25);
        gained = 100 + streakBonus;
        newStreak = streak + 1;
        setStreak(newStreak);
        setBestStreak((prev) => Math.max(prev, newStreak));
        setDetectiveMood('celebrate');
        setDetectiveSpeech('Brilliant catch, detective! That statement was corrupted.');
      } else {
        // Correct after mistakes or hint: +25, no streak increase
        gained = 25;
        setDetectiveMood('celebrate');
        setDetectiveSpeech('Got it! Case solved.');
      }

      setScore((prev) => prev + gained);
      setLastRoundScoreGained(gained);

      // 1. Stamp chosen card with FALSE immediately
      setCardStampStates((prev) => {
        const next = [...prev];
        next[selectedCardIndex] = 'false';
        return next;
      });

      // 2. Stagger stamp other 3 cards with TRUE
      const otherIndices = [0, 1, 2, 3].filter((idx) => idx !== selectedCardIndex);
      if (reduceMotion) {
        setCardStampStates((prev) => {
          const next = [...prev];
          otherIndices.forEach((idx) => {
            next[idx] = 'true';
          });
          return next;
        });
      } else {
        otherIndices.forEach((idx, step) => {
          setTimeout(() => {
            setCardStampStates((prev) => {
              const next = [...prev];
              next[idx] = 'true';
              return next;
            });
          }, (step + 1) * 150);
        });
      }

      // Record answer for this round
      const isFirstTryStrict = isFirstAttempt && !isRoundHinted;
      const roundTimeMs = Date.now() - roundStartTimeRef.current;
      answersRef.current.push({
        itemId: currentRound.id,
        conceptId: currentRound.conceptId,
        gameId: 'lieHunter',
        correct: isFirstTryStrict,
        hinted: isRoundHinted,
        attempts: nextAttempts,
        chosenId: firstAccusedId || chosenCard.id,
        correctId: falseStatement.id,
        timeMs: roundTimeMs,
      });

      roundsSummaryRef.current.push({
        roundId: currentRound.id,
        conceptId: currentRound.conceptId,
        difficulty: currentRound.difficulty,
        mistakes: roundMistakes,
        hinted: isRoundHinted,
      });

      announce('Accusation correct! Case solved.');

      // Show blocking Case Solved panel after slight stamp impact delay
      setTimeout(
        () => {
          setShowCaseSolved(true);
        },
        reduceMotion ? 100 : 450
      );
    } else {
      // -------------------------------------------------------------
      // WRONG ACCUSATION (Chosen card is actually TRUE)
      // -------------------------------------------------------------
      playSound('wrong');

      const nextMistakes = roundMistakes + 1;
      setRoundMistakes(nextMistakes);
      setStreak(0); // Reset streak

      // Deduct life unless in practice mode
      const remainingLives = practiceMode ? livesLeft : Math.max(0, livesLeft - 1);
      if (!practiceMode) {
        updateLives(remainingLives);
      }

      // Stamp this card with TRUE and lock it
      setCardStampStates((prev) => {
        const next = [...prev];
        next[selectedCardIndex] = 'true';
        return next;
      });
      setLockedIndices((prev) => new Set([...prev, selectedCardIndex]));
      setSelectedCardIndex(null);

      setDetectiveMood('concerned');
      setDetectiveSpeech('That one is genuine. Look again.');
      announce(`Accusation rejected. Statement ${selectedCardIndex + 1} is verified true.`);

      if (remainingLives <= 0 && !practiceMode) {
        // Ran out of lives! Reveal the lie on CaseSolvedPanel then game over
        setIsGameOverOutOfLives(true);
        const roundTimeMs = Date.now() - roundStartTimeRef.current;
        answersRef.current.push({
          itemId: currentRound.id,
          conceptId: currentRound.conceptId,
          gameId: 'lieHunter',
          correct: false,
          hinted: isRoundHinted,
          attempts: nextAttempts,
          chosenId: firstAccusedId || chosenCard.id,
          correctId: falseStatement.id,
          timeMs: roundTimeMs,
        });

        roundsSummaryRef.current.push({
          roundId: currentRound.id,
          conceptId: currentRound.conceptId,
          difficulty: currentRound.difficulty,
          mistakes: nextMistakes,
          hinted: isRoundHinted,
        });

        setTimeout(
          () => {
            setShowCaseSolved(true);
          },
          reduceMotion ? 100 : 350
        );
      } else {
        // Still have lives: show small verified panel and allow second chance
        setActiveVerifiedStatement(chosenCard);
      }
    }
  };

  // Continue to next case or result
  const handleContinueAfterSolved = () => {
    setShowCaseSolved(false);

    if (isGameOverOutOfLives) {
      concludeGame('outOfLives');
      return;
    }

    if (currentRoundIndex < totalRounds - 1) {
      setCurrentRoundIndex((prev) => prev + 1);
    } else {
      playSound('complete');
      concludeGame('completed');
    }
  };

  // Global Keyboard Shortcuts (1-4, Enter, H, P, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if intro, info, or feedback dialogs are active (handled in their modals)
      if (showIntro || isInfoOpen || showCaseSolved || activeVerifiedStatement) {
        return;
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
        return;
      }

      if (isPaused) return;

      if (e.key === '1') {
        e.preventDefault();
        handleSelectCard(0);
      } else if (e.key === '2') {
        e.preventDefault();
        handleSelectCard(1);
      } else if (e.key === '3') {
        e.preventDefault();
        handleSelectCard(2);
      } else if (e.key === '4') {
        e.preventDefault();
        handleSelectCard(3);
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        handleUseMagnifier();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleAccuse();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showIntro,
    isInfoOpen,
    showCaseSolved,
    activeVerifiedStatement,
    isPaused,
    handleSelectCard,
    handleUseMagnifier,
    handleAccuse,
  ]);

  if (!currentRound) return null;

  const falseStatement = currentRound.statements.find((s) => s.isFalse) as FalseStatement;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-3 flex flex-col items-center select-none">
      {/* Screen reader announcement region */}
      <div className="sr-only" aria-live="assertive">
        {ariaLiveMessage}
      </div>

      {/* 1. TOP HUD BAR */}
      <div className="w-full bg-[#0F1426] border-2 border-[#242F55] rounded-xl px-4 py-2.5 mb-4 shadow-lg flex items-center justify-between gap-2 sm:gap-4">
        {/* Lives / Practice Mode */}
        <div className="flex items-center gap-1.5" aria-label={`Lives: ${livesLeft}`}>
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

        {/* Round Progress */}
        <div className="hidden sm:flex items-center gap-1 text-xs font-mono text-slate-300">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Case {currentRoundIndex + 1} of {totalRounds}
          </span>
        </div>

        {/* Magnifier / Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Magnifier button with uses badge */}
          <button
            type="button"
            disabled={!isMagnifierUsable}
            onClick={handleUseMagnifier}
            title={
              unlockedCount <= 2
                ? 'Cannot use magnifier when only 2 suspects remain'
                : practiceMode
                ? 'Unlimited free magnifier in practice mode'
                : `${magnifiersLeft} uses left (-25 pts)`
            }
            aria-label={`Use magnifier hint. ${practiceMode ? 'Unlimited' : `${magnifiersLeft} remaining`}`}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
              isMagnifierUsable
                ? 'bg-amber-950/70 border-amber-500/60 text-[#F5C542] hover:bg-amber-900/80 hover:border-[#F5C542]'
                : 'bg-slate-900 border-slate-700 text-slate-500 opacity-60 cursor-not-allowed'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline font-bold">Magnifier</span>
            <span className="font-bold">
              ({practiceMode ? '∞' : magnifiersLeft})
            </span>
          </button>

          {/* Info Button */}
          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            aria-label="View instructions and rules"
            className="p-1.5 rounded-lg border border-[#2B355E] bg-[#141A33] text-slate-300 hover:text-white hover:border-[#F5C542] cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Pause Button */}
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
            className="p-1.5 rounded-lg border border-[#2B355E] bg-[#141A33] text-slate-300 hover:text-white hover:border-[#F5C542] cursor-pointer"
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Mute Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            className="p-1.5 rounded-lg border border-[#2B355E] bg-[#141A33] text-slate-300 hover:text-white cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. CASE HEADER */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-pixel text-xs sm:text-sm text-[#F5C542] tracking-wider">
              CASE {currentRoundIndex + 1}: {conceptName.toUpperCase()}
            </h2>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                currentRound.difficulty === 'hard'
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                  : 'bg-teal-950/80 text-teal-300 border border-teal-500/40'
              }`}
            >
              {currentRound.difficulty === 'hard' ? 'Hard Case' : 'Easy Case'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">
            One statement has been tampered with. Find the lie.
          </p>
        </div>

        {/* Detective Assistant with Speech Bubble */}
        <DetectiveHelper
          mood={detectiveMood}
          speechText={detectiveSpeech}
          className="self-end sm:self-auto"
        />
      </div>

      {/* 3. THE EVIDENCE BOARD (Dark Cork/Stone wall drawn with CSS) */}
      <div
        className="w-full rounded-2xl p-4 sm:p-6 border-4 border-[#3D2C1E] shadow-2xl relative"
        style={{
          backgroundColor: '#1E1813',
          backgroundImage: `
            radial-gradient(#2A221A 15%, transparent 16%),
            radial-gradient(#261D15 15%, transparent 16%)
          `,
          backgroundSize: '30px 30px',
          backgroundPosition: '0 0, 15px 15px',
        }}
      >
        {/* Subtle wooden frame inset shadow */}
        <div className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_30px_rgba(0,0,0,0.85)] border border-[#523C2B]" />

        {/* Evidence Cards: 2x2 Grid on desktop, 1 column on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 relative z-10">
          {currentRound.statements.map((statement, idx) => (
            <EvidenceCard
              key={statement.id}
              statement={statement}
              index={idx}
              isSelected={selectedCardIndex === idx}
              stampState={cardStampStates[idx]}
              isLocked={lockedIndices.has(idx)}
              reduceMotion={reduceMotion}
              onSelect={handleSelectCard}
              onConfirm={handleAccuse}
            />
          ))}
        </div>
      </div>

      {/* 4. ACTION BAR UNDER THE BOARD */}
      <div className="w-full mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-3 z-30 bg-[#0A0D1A]/95 p-2 rounded-xl border border-[#242F55] shadow-xl backdrop-blur-md">
        <div className="text-xs text-slate-400 font-mono hidden sm:block">
          Select card [1-4], double-click or press Accuse [Enter]
        </div>

        <div className="w-full sm:w-auto flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={selectedCardIndex === null || showCaseSolved || Boolean(activeVerifiedStatement)}
            onClick={handleAccuse}
            className={`w-full sm:w-auto px-7 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              selectedCardIndex !== null
                ? 'btn-pixel-gold animate-pulse text-black'
                : 'bg-slate-800/80 border border-slate-700 text-slate-400 cursor-not-allowed opacity-70'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {selectedCardIndex !== null
                ? `Accuse Statement #${selectedCardIndex + 1} (Enter)`
                : 'Select a card first'}
            </span>
          </button>
        </div>
      </div>

      {/* 5. MODAL PANELS */}

      {/* A. Intro Card Modal */}
      {showIntro && (
        <LieHunterIntroCard
          concepts={level.concepts}
          onStart={() => setShowIntro(false)}
        />
      )}

      {/* B. Manual Info Card Modal */}
      {isInfoOpen && (
        <LieHunterIntroCard
          concepts={level.concepts}
          isManualInfoOpen={true}
          onStart={() => setIsInfoOpen(false)}
          onCloseManualInfo={() => setIsInfoOpen(false)}
        />
      )}

      {/* C. Pause Overlay */}
      {isPaused && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-sm bg-[#0F1426] border-2 border-[#2DD4BF] rounded-xl p-6 text-center shadow-2xl">
            <h3 className="font-pixel text-sm text-[#2DD4BF] mb-2">INVESTIGATION PAUSED</h3>
            <p className="text-xs text-slate-300 mb-6">
              Take your time to consider the evidence. Press Resume or P to continue.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setIsPaused(false)}
                className="btn-pixel-teal w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 text-black" />
                <span>Resume Investigation</span>
              </button>

              <button
                type="button"
                onClick={onQuit}
                className="btn-pixel-dark w-full py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Quit Level
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D. Card Verified Panel (Wrong Accusation -> Second Chance) */}
      {activeVerifiedStatement && (
        <CardVerifiedPanel
          verifiedStatement={activeVerifiedStatement}
          pageNumber={currentRound.page}
          onContinue={() => setActiveVerifiedStatement(null)}
        />
      )}

      {/* E. Case Solved Panel (Correct Accusation or Out of Lives reveal) */}
      {showCaseSolved && falseStatement && (
        <CaseSolvedPanel
          falseStatement={falseStatement}
          pageNumber={currentRound.page}
          sourceQuote={currentRound.sourceQuote}
          isLastRound={currentRoundIndex === totalRounds - 1}
          isGameOverOutOfLives={isGameOverOutOfLives}
          scoreGained={lastRoundScoreGained}
          streak={streak}
          onContinue={handleContinueAfterSolved}
        />
      )}
    </div>
  );
};
