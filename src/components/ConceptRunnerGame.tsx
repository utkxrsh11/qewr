import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Question, QuestionAnswerRecord, LevelResult, Level } from '../types/course.ts';
import { playSound, isAudioMuted, setAudioMuted } from '../services/soundEffects.ts';
import { calculateStars, calculateXpEarned } from '../services/progressService.ts';
import { recordAnswer } from '../services/masteryStore.ts';
import {
  Heart,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Eye,
  Sliders,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export interface ConceptRunnerGameProps {
  questions: Question[];
  level: Level;
  practiceMode?: boolean;
  muted?: boolean;
  reduceMotion?: boolean;
  onFinish: (result: LevelResult) => void;
  onQuit: () => void;
  onSwitchToQuizMode?: () => void;
}

// 16:9 Canvas virtual dimensions
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const LANE_Y = [110, 225, 340]; // Top (A), Middle (B), Bottom (C)

export const ConceptRunnerGame: React.FC<ConceptRunnerGameProps> = ({
  questions,
  level,
  practiceMode = false,
  muted: initialMuted = isAudioMuted(),
  reduceMotion: initialReduceMotion = false,
  onFinish,
  onQuit,
  onSwitchToQuizMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [livesLeft, setLivesLeft] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [playerLane, setPlayerLane] = useState(1); // 0 = Top (A), 1 = Middle (B), 2 = Bottom (C)
  const [isPaused, setIsPaused] = useState(false);
  const [muted, setMuted] = useState(initialMuted);
  const [reduceMotion, setReduceMotion] = useState(initialReduceMotion);

  // Question resolution & feedback overlay
  const [feedbackState, setFeedbackState] = useState<{
    type: 'correct' | 'wrong' | null;
    chosenLane: number;
    showExplanation: boolean;
    whyTimerActive: boolean;
  }>({
    type: null,
    chosenLane: 1,
    showExplanation: false,
    whyTimerActive: false,
  });

  const [answers, setAnswers] = useState<QuestionAnswerRecord[]>([]);
  const questionStartTimeRef = useRef(Date.now());

  // Animation & Physics refs
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const gatesProgressRef = useRef<number>(0); // 0 (far right) to 1 (at player X)
  const playerVisualYRef = useRef<number>(LANE_Y[1]);
  const isResolvingRef = useRef<boolean>(false);
  const streakRef = useRef<number>(0);
  const livesRef = useRef<number>(3);
  const scoreRef = useRef<number>(0);

  streakRef.current = streak;
  livesRef.current = livesLeft;
  scoreRef.current = score;

  const currentQ = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Reaction time: starts at 6.5s, decreases by 0.3s every 2 correct answers down to 4.2s
  const correctCountSoFar = answers.filter((a) => a.correct).length;
  const speedTier = Math.floor(correctCountSoFar / 2);
  const gateDurationMs = Math.max(4200, 6500 - speedTier * 300);

  // Sync mute state
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Pause toggle
      if (e.code === 'Space' || e.key.toLowerCase() === 'p') {
        if (!feedbackState.showExplanation) {
          e.preventDefault();
          setIsPaused((prev) => !prev);
          return;
        }
      }

      if (isPaused || feedbackState.showExplanation || isResolvingRef.current) {
        if (feedbackState.showExplanation && e.key === 'Enter') {
          handleContinueAfterWrong();
        }
        return;
      }

      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setPlayerLane((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        e.preventDefault();
        setPlayerLane((prev) => Math.min(2, prev + 1));
      } else if (e.key === '1') {
        setPlayerLane(0);
      } else if (e.key === '2') {
        setPlayerLane(1);
      } else if (e.key === '3') {
        setPlayerLane(2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, feedbackState.showExplanation]);

  // Tab visibility change: auto-pause on blur
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !feedbackState.showExplanation) {
        setIsPaused(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [feedbackState.showExplanation]);

  // Reset gate position when question changes
  useEffect(() => {
    gatesProgressRef.current = 0;
    isResolvingRef.current = false;
    questionStartTimeRef.current = Date.now();
    setFeedbackState({
      type: null,
      chosenLane: 1,
      showExplanation: false,
      whyTimerActive: false,
    });
  }, [currentQuestionIndex]);

  // Handle gate collision & answer lock-in
  const resolveAnswer = useCallback(
    (chosenLane: number) => {
      if (isResolvingRef.current || !currentQ) return;
      isResolvingRef.current = true;

      const timeSpent = Date.now() - questionStartTimeRef.current;
      const isCorrect = chosenLane === currentQ.correctIndex;

      // Deterministic Mastery Store record
      recordAnswer(currentQ.conceptId, isCorrect, {
        timeMs: timeSpent,
        questionId: currentQ.id,
        difficulty: currentQ.difficulty,
      });

      let nextScore = scoreRef.current;
      let nextStreak = streakRef.current;
      let nextLives = livesRef.current;

      if (isCorrect) {
        playSound('correct');
        const streakBonus = Math.min(100, Math.max(0, (nextStreak - 1) * 25));
        nextScore += 100 + streakBonus;
        nextStreak += 1;
        setScore(nextScore);
        setStreak(nextStreak);
        setBestStreak((prev) => Math.max(prev, nextStreak));

        setFeedbackState({
          type: 'correct',
          chosenLane,
          showExplanation: false,
          whyTimerActive: true,
        });

        // 3-second window for "Why?" button
        setTimeout(() => {
          setFeedbackState((prev) => ({ ...prev, whyTimerActive: false }));
        }, 3000);

        // Auto advance after 1.3s if explanation not opened
        setTimeout(() => {
          setFeedbackState((prev) => {
            if (!prev.showExplanation) {
              advanceToNextQuestion(
                [
                  ...answers,
                  {
                    questionId: currentQ.id,
                    conceptId: currentQ.conceptId,
                    chosenIndex: chosenLane,
                    correct: true,
                    timeMs: timeSpent,
                  },
                ],
                nextScore,
                Math.max(bestStreak, nextStreak),
                nextLives
              );
            }
            return prev;
          });
        }, 1300);
      } else {
        playSound('wrong');
        nextStreak = 0;
        setStreak(0);
        if (!practiceMode) {
          nextLives = Math.max(0, livesRef.current - 1);
          setLivesLeft(nextLives);
        }

        const newRecord: QuestionAnswerRecord = {
          questionId: currentQ.id,
          conceptId: currentQ.conceptId,
          chosenIndex: chosenLane,
          correct: false,
          timeMs: timeSpent,
        };

        const updatedAnswers = [...answers, newRecord];
        setAnswers(updatedAnswers);

        // Show mandatory explanation overlay
        setFeedbackState({
          type: 'wrong',
          chosenLane,
          showExplanation: true,
          whyTimerActive: false,
        });

        if (!practiceMode && nextLives <= 0) {
          // Out of lives will conclude when user closes explanation or after 2s
        }
      }
    },
    [currentQ, answers, bestStreak, practiceMode]
  );

  const handleContinueAfterWrong = () => {
    if (!currentQ) return;
    const timeSpent = Date.now() - questionStartTimeRef.current;
    const newAnswers = answers.some((a) => a.questionId === currentQ.id)
      ? answers
      : [
          ...answers,
          {
            questionId: currentQ.id,
            conceptId: currentQ.conceptId,
            chosenIndex: playerLane,
            correct: false,
            timeMs: timeSpent,
          },
        ];

    if (!practiceMode && livesLeft <= 0) {
      finishGame(newAnswers, score, bestStreak, 0, 'out_of_lives');
    } else {
      advanceToNextQuestion(newAnswers, score, bestStreak, livesLeft);
    }
  };

  const advanceToNextQuestion = (
    currentAnswers: QuestionAnswerRecord[],
    currentScore: number,
    currentBestStreak: number,
    currentLives: number
  ) => {
    setAnswers(currentAnswers);
    if (isLastQuestion) {
      finishGame(currentAnswers, currentScore, currentBestStreak, currentLives, 'completed');
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const finishGame = (
    finalAnswers: QuestionAnswerRecord[],
    finalScore: number,
    finalBestStreak: number,
    finalLives: number,
    status: 'completed' | 'out_of_lives'
  ) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const correctCount = finalAnswers.filter((a) => a.correct).length;
    const accuracyPercent = Math.round((correctCount / questions.length) * 100);
    const stars = calculateStars(accuracyPercent, status);
    const xpEarned = calculateXpEarned({ practiceMode, correctCount, stars });

    if (status === 'completed') {
      playSound('complete');
    }

    onFinish({
      levelId: level.id,
      practiceMode,
      status,
      score: finalScore,
      bestStreak: finalBestStreak,
      livesLeft: finalLives,
      totalQuestions: questions.length,
      correctCount,
      accuracyPercent,
      stars,
      xpEarned,
      answers: finalAnswers,
      questions,
      level,
    });
  };

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bgScrollFar = 0;
    let bgScrollMid = 0;
    let bgScrollFloor = 0;
    let runFrame = 0;
    let frameTimer = 0;

    const render = (now: number) => {
      const delta = Math.min(100, now - lastTimeRef.current);
      lastTimeRef.current = now;

      if (!isPaused && !feedbackState.showExplanation) {
        // Update gates progress
        if (!isResolvingRef.current) {
          gatesProgressRef.current += delta / gateDurationMs;
          if (gatesProgressRef.current >= 1) {
            gatesProgressRef.current = 1;
            resolveAnswer(playerLane);
          }
        }

        // Parallax background scrolling (unless reduceMotion)
        if (!reduceMotion) {
          bgScrollFar = (bgScrollFar + delta * 0.03) % 40;
          bgScrollMid = (bgScrollMid + delta * 0.08) % 80;
          bgScrollFloor = (bgScrollFloor + delta * 0.18) % 60;
        }

        // Run animation frames
        frameTimer += delta;
        if (frameTimer > 120) {
          frameTimer = 0;
          runFrame = (runFrame + 1) % 4;
        }

        // Smooth lane interpolation
        const targetY = LANE_Y[playerLane];
        playerVisualYRef.current += (targetY - playerVisualYRef.current) * 0.22;
      }

      // --- DRAW BACKGROUND ---
      // Distant dark stone dungeon wall
      ctx.fillStyle = '#080A14';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Layer 1: Distant Wall Bricks & Arch lines
      ctx.strokeStyle = '#141A30';
      ctx.lineWidth = 1;
      const brickSize = 40;
      for (let x = -bgScrollFar; x < CANVAS_WIDTH; x += brickSize) {
        for (let y = 0; y < CANVAS_HEIGHT - 60; y += 24) {
          ctx.strokeRect(x, y, brickSize, 24);
        }
      }

      // Wall Torches
      const torchSpacing = 200;
      for (let tx = 80 - bgScrollMid; tx < CANVAS_WIDTH + 100; tx += torchSpacing) {
        if (tx > -40 && tx < CANVAS_WIDTH + 40) {
          // Torch bracket
          ctx.fillStyle = '#374151';
          ctx.fillRect(tx, 45, 8, 16);
          // Flame glow
          const flameFlicker = Math.sin(now * 0.02 + tx) * 3;
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(tx + 4, 40 + flameFlicker, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FDE047';
          ctx.beginPath();
          ctx.arc(tx + 4, 40 + flameFlicker, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Lane Guide Lines
      LANE_Y.forEach((y, laneIdx) => {
        const isCurrent = playerLane === laneIdx;
        ctx.strokeStyle = isCurrent ? 'rgba(245, 197, 66, 0.35)' : 'rgba(45, 212, 191, 0.12)';
        ctx.lineWidth = isCurrent ? 2 : 1;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Bottom Stone Floor with Tiling
      ctx.fillStyle = '#0E1222';
      ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 50);
      ctx.fillStyle = '#1B223D';
      ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 3);
      for (let fx = -bgScrollFloor; fx < CANVAS_WIDTH; fx += 30) {
        ctx.strokeStyle = '#1F2848';
        ctx.lineWidth = 2;
        ctx.strokeRect(fx, CANVAS_HEIGHT - 48, 30, 48);
      }

      // --- DRAW 3 APPROACHING ANSWER GATES ---
      // Player is at X = 130. Gates start at X = 780 and move toward X = 130.
      const gateStartX = CANVAS_WIDTH - 40;
      const gateTargetX = 130;
      const currentGateX = gateStartX - (gateStartX - gateTargetX) * gatesProgressRef.current;

      if (currentQ && currentQ.options) {
        currentQ.options.forEach((optText, optIdx) => {
          const gateY = LANE_Y[optIdx];
          const isTargetedByPlayer = playerLane === optIdx;
          const letter = ['A', 'B', 'C'][optIdx];

          // Gate Frame
          const gateW = 60;
          const gateH = 80;
          const gateLeft = currentGateX - gateW / 2;
          const gateTop = gateY - gateH / 2;

          // Feedback Highlight on Resolution
          let frameColor = '#283357';
          let signBg = '#14182E';
          let glowColor = 'rgba(45, 212, 191, 0.2)';

          if (isResolvingRef.current) {
            if (optIdx === currentQ.correctIndex) {
              frameColor = '#22C55E';
              signBg = '#064E3B';
              glowColor = 'rgba(34, 197, 94, 0.5)';
            } else if (optIdx === feedbackState.chosenLane) {
              frameColor = '#EF4444';
              signBg = '#7F1D1D';
              glowColor = 'rgba(239, 68, 68, 0.5)';
            }
          } else if (isTargetedByPlayer) {
            frameColor = '#F5C542';
            glowColor = 'rgba(245, 197, 66, 0.4)';
          }

          // Gate Glow
          ctx.fillStyle = glowColor;
          ctx.fillRect(gateLeft - 6, gateTop - 6, gateW + 12, gateH + 12);

          // Stone Pillars & Arch
          ctx.fillStyle = frameColor;
          ctx.fillRect(gateLeft, gateTop, gateW, gateH);

          // Inner Archway Opening
          ctx.fillStyle = signBg;
          ctx.fillRect(gateLeft + 6, gateTop + 8, gateW - 12, gateH - 14);

          // Shield Letter Badge (A, B, C)
          ctx.fillStyle = isTargetedByPlayer ? '#F5C542' : '#3B82F6';
          ctx.beginPath();
          ctx.arc(currentGateX, gateTop + 18, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0F121E';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(letter, currentGateX, gateTop + 18);

          // Short preview text on gate
          ctx.fillStyle = '#E2E8F0';
          ctx.font = 'bold 9px sans-serif';
          const shortPreview = optText.length > 12 ? optText.slice(0, 10) + '...' : optText;
          ctx.fillText(shortPreview, currentGateX, gateTop + 45);
        });
      }

      // --- DRAW PLAYER PIXEL HERO ---
      const playerX = 130;
      const playerY = playerVisualYRef.current;
      const bobY = Math.sin(runFrame * Math.PI) * 3;

      // Hero shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(playerX, playerY + 22, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Damage blinking on wrong answer
      const isDamaged = feedbackState.type === 'wrong' && Math.floor(now / 100) % 2 === 0;

      if (!isDamaged) {
        // Hero Cape (fluttering)
        ctx.fillStyle = '#0D9488';
        ctx.beginPath();
        ctx.moveTo(playerX - 6, playerY - 4 + bobY);
        ctx.lineTo(playerX - 22, playerY + 10 + (runFrame % 2) * 4);
        ctx.lineTo(playerX - 6, playerY + 12 + bobY);
        ctx.fill();

        // Hero Body & Armor
        ctx.fillStyle = '#F5C542'; // Gold breastplate
        ctx.fillRect(playerX - 7, playerY - 8 + bobY, 14, 18);

        // Hero Helmet
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(playerX - 6, playerY - 20 + bobY, 12, 12);
        // Visor slit
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(playerX - 1, playerY - 16 + bobY, 8, 3);

        // Legs (Running cycle)
        ctx.fillStyle = '#475569';
        if (runFrame === 0 || runFrame === 2) {
          ctx.fillRect(playerX - 6, playerY + 10 + bobY, 4, 11);
          ctx.fillRect(playerX + 2, playerY + 8 + bobY, 4, 11);
        } else {
          ctx.fillRect(playerX - 8, playerY + 7 + bobY, 5, 10);
          ctx.fillRect(playerX + 4, playerY + 11 + bobY, 5, 9);
        }

        // Lantern in hand (provides light forward)
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.arc(playerX + 11, playerY + 3 + bobY, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- FLOATING FEEDBACK PARTICLES ---
      if (feedbackState.type === 'correct') {
        ctx.fillStyle = '#F5C542';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+100', playerX + 15, playerY - 26);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    isPaused,
    playerLane,
    currentQuestionIndex,
    gateDurationMs,
    reduceMotion,
    feedbackState,
    currentQ,
    resolveAnswer,
  ]);

  // Touch Swipe on Canvas
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(diffY) > 25) {
      if (diffY < 0) {
        // Swiped UP
        setPlayerLane((prev) => Math.max(0, prev - 1));
      } else {
        // Swiped DOWN
        setPlayerLane((prev) => Math.min(2, prev + 1));
      }
    }
    touchStartY.current = null;
  };

  if (!currentQ) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 flex flex-col items-center select-none">
      {/* 1. HUD TOP BAR (DOM elements for crisp accessibility) */}
      <div className="w-full bg-[#12162B] border-2 border-[#232A47] rounded-xl p-3 sm:p-4 mb-3 flex items-center justify-between gap-3 shadow-xl">
        {/* Lives (3 pixel hearts) */}
        <div className="flex items-center gap-1.5" aria-label={`Lives remaining: ${practiceMode ? 'Practice mode' : livesLeft}`}>
          {practiceMode ? (
            <span className="text-xs font-pixel text-[#2DD4BF] bg-teal-950/80 px-2 py-0.5 rounded border border-teal-500/40">
              PRACTICE
            </span>
          ) : (
            [1, 2, 3].map((h) => (
              <Heart
                key={h}
                className={`w-5 h-5 transition-transform ${
                  h <= livesLeft
                    ? 'text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                    : 'text-slate-600 fill-transparent'
                }`}
                aria-hidden="true"
              />
            ))
          )}
        </div>

        {/* Question Counter & Streak */}
        <div className="flex items-center gap-3 text-xs sm:text-sm font-mono">
          <span className="text-slate-300">
            Question <strong className="text-white font-bold">{currentQuestionIndex + 1}</strong> of {questions.length}
          </span>
          {streak > 1 && (
            <span className="text-[#F5C542] font-pixel text-[11px] bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40 animate-pulse">
              Streak x{streak}
            </span>
          )}
          <span className="font-semibold text-white">
            Score: <span className="text-[#F5C542] font-bold">{score}</span>
          </span>
        </div>

        {/* Controls: Mute, Motion, Pause, Quiz Fallback */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Reduce Motion toggle */}
          <button
            type="button"
            onClick={() => setReduceMotion(!reduceMotion)}
            className={`p-1.5 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#F5C542] ${
              reduceMotion ? 'bg-[#2A345B] text-[#F5C542]' : 'hover:bg-[#1C2344] text-slate-400'
            }`}
            title={reduceMotion ? 'Reduced motion active' : 'Enable reduced motion'}
            aria-label="Toggle reduced motion"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Mute button */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 rounded hover:bg-[#1C2344] text-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#F5C542]"
            aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-[#2DD4BF]" />}
          </button>

          {/* Pause button */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded hover:bg-[#1C2344] text-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#F5C542]"
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
          >
            {isPaused ? <Play className="w-4 h-4 text-[#22C55E]" /> : <Pause className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Quiz mode fallback toggle */}
          {onSwitchToQuizMode && (
            <button
              type="button"
              onClick={onSwitchToQuizMode}
              className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-[#0A0D1B] border border-[#232B4A] transition-colors"
              title="Switch to card-based quiz mode"
            >
              Quiz Mode
            </button>
          )}
        </div>
      </div>

      {/* 2. QUESTION PANEL (DOM text above canvas, WCAG legible) */}
      <div className="w-full bg-[#12162B] border-2 border-[#232A47] rounded-xl p-4 sm:p-5 mb-3 shadow-lg text-center">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
          <span className="uppercase text-[#2DD4BF] font-semibold">{currentQ.difficulty} Challenge</span>
          <span className="text-slate-400">Page {currentQ.page}</span>
        </div>

        <h2 className="text-base sm:text-lg md:text-xl font-bold text-white leading-snug">
          {currentQ.question}
        </h2>
      </div>

      {/* 3. GAME CANVAS (16:9 ratio, pixelated rendering) */}
      <div className="w-full relative rounded-xl overflow-hidden border-2 border-[#232A47] shadow-2xl bg-[#080A14] aspect-video">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full block cursor-pointer"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Why Button overlay (appears for 3 seconds after correct answer) */}
        {feedbackState.whyTimerActive && !feedbackState.showExplanation && (
          <div className="absolute top-4 right-4 z-20 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={() => {
                setIsPaused(true);
                setFeedbackState((prev) => ({ ...prev, showExplanation: true, whyTimerActive: false }));
              }}
              className="btn-pixel-teal px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Why?</span>
            </button>
          </div>
        )}

        {/* Explanation Modal Overlay (on wrong answer or when 'Why?' is clicked) */}
        {feedbackState.showExplanation && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-[#12162B] border-2 border-[#F5C542] rounded-xl p-5 sm:p-6 shadow-2xl text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-[#F5C542] uppercase tracking-wider mb-2">
                {feedbackState.type === 'wrong' ? (
                  <>
                    <XCircle className="w-4 h-4 text-[#EF4444]" />
                    <span className="text-[#EF4444]">Incorrect Answer</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                    <span className="text-[#22C55E]">Correct Explanation</span>
                  </>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-300 mb-2">
                <strong>Correct answer:</strong>{' '}
                <span className="text-white font-semibold">
                  {['A', 'B', 'C'][currentQ.correctIndex]}: {currentQ.options[currentQ.correctIndex]}
                </span>
              </p>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-4 font-sans bg-[#0A0D1B] p-3 rounded border border-[#232B4A]">
                {currentQ.explanation}
              </p>

              {/* Source Quote from PDF */}
              <div className="p-2.5 rounded bg-[#090C1A] border-l-2 border-teal-400 text-xs text-teal-200 mb-5">
                <span className="font-semibold block text-[10px] text-teal-400 font-mono mb-0.5">
                  FROM THE PDF (Page {currentQ.page}):
                </span>
                <span className="italic font-serif">&ldquo;{currentQ.sourceQuote}&rdquo;</span>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleContinueAfterWrong}
                  className="btn-pixel-gold px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pause Overlay */}
        {isPaused && !feedbackState.showExplanation && (
          <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#12162B] border-2 border-[#232A47] rounded-xl p-6 text-center shadow-2xl">
              <h3 className="font-pixel text-base text-[#F5C542] mb-5">Paused</h3>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaused(false)}
                  className="btn-pixel-gold py-2.5 rounded-lg text-xs font-bold"
                >
                  Resume
                </button>
                <button
                  type="button"
                  onClick={onQuit}
                  className="btn-pixel-dark py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400"
                >
                  Quit Level
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. DOM FULL OPTION TEXT PANEL (A, B, C) */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-3">
        {currentQ.options.map((opt, idx) => {
          const letter = ['A', 'B', 'C'][idx];
          const isPlayerInThisLane = playerLane === idx;

          return (
            <div
              key={idx}
              onClick={() => setPlayerLane(idx)}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-start gap-2.5 text-left ${
                isPlayerInThisLane
                  ? 'bg-[#1C2344] border-[#F5C542] text-white shadow-[0_0_12px_rgba(245,197,66,0.2)]'
                  : 'bg-[#111528] border-[#202747] text-slate-300 hover:border-[#2DD4BF]/50'
              }`}
            >
              <span
                className={`w-6 h-6 rounded text-xs font-bold font-mono flex items-center justify-center flex-shrink-0 ${
                  isPlayerInThisLane ? 'bg-[#F5C542] text-black' : 'bg-[#181E38] text-slate-300 border border-[#2F3A66]'
                }`}
              >
                {letter}
              </span>
              <span className="text-xs sm:text-sm leading-snug line-clamp-3">
                {opt}
              </span>
            </div>
          );
        })}
      </div>

      {/* 5. TOUCH ON-SCREEN LANE BUTTONS (Mobile & Tablet) */}
      <div className="w-full flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[#1C223D]">
        <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
          Controls: W / S or &uarr; / &darr; or 1, 2, 3 to switch lanes · Space to pause
        </div>

        {/* On-screen lane buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
          <span className="text-xs text-slate-400 mr-1 sm:hidden">Switch lane:</span>
          {['A (Top)', 'B (Mid)', 'C (Bot)'].map((label, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPlayerLane(idx)}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold border-2 transition-all flex-1 sm:flex-initial ${
                playerLane === idx
                  ? 'bg-[#F5C542] text-black border-[#D9A422] shadow-md'
                  : 'btn-pixel-dark text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
