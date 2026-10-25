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
  Clock,
} from 'lucide-react';

export interface ConceptRunnerGameProps {
  questions: Question[];
  level: Level;
  lives?: number;
  initialStreak?: number;
  practiceMode?: boolean;
  muted?: boolean;
  reduceMotion?: boolean;
  onFinish: (result: LevelResult) => void;
  onQuit: () => void;
  onSwitchToQuizMode?: () => void;
  onLivesChange?: (lives: number) => void;
}

// 16:9 Canvas virtual dimensions
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const LANE_Y = [110, 225, 340]; // Top (A), Middle (B), Bottom (C)

export const ConceptRunnerGame: React.FC<ConceptRunnerGameProps> = ({
  questions,
  level,
  lives: initialLives = 3,
  initialStreak = 0,
  practiceMode = false,
  muted: initialMuted = isAudioMuted(),
  reduceMotion: initialReduceMotion = false,
  onFinish,
  onQuit,
  onSwitchToQuizMode,
  onLivesChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [livesLeft, setLivesLeft] = useState(initialLives);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(initialStreak);
  const [bestStreak, setBestStreak] = useState(initialStreak);
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
  const streakRef = useRef<number>(initialStreak);
  const livesRef = useRef<number>(initialLives);
  const scoreRef = useRef<number>(0);

  streakRef.current = streak;
  livesRef.current = livesLeft;
  scoreRef.current = score;

  const currentQ = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // 60-second answer timer & Question-First Ready flow
  const TOTAL_QUESTION_TIME_MS = 60000;
  const gateDurationMs = TOTAL_QUESTION_TIME_MS;

  const [isReady, setIsReady] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(60);
  const isReadyRef = useRef<boolean>(false);
  isReadyRef.current = isReady;

  const resolveAnswerRef = useRef<(lane: number) => void>(() => {});

  const handleReady = useCallback(() => {
    playSound('select');
    setIsReady(true);
    isReadyRef.current = true;
    questionStartTimeRef.current = Date.now();
    setTimeRemainingSeconds(60);
  }, []);

  // Sync mute state
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If question is presented but not yet ready, Space or Enter triggers Ready
      if (!isReady) {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          handleReady();
        }
        return;
      }

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
        resolveAnswerRef.current?.(0);
      } else if (e.key === '2') {
        setPlayerLane(1);
        resolveAnswerRef.current?.(1);
      } else if (e.key === '3') {
        setPlayerLane(2);
        resolveAnswerRef.current?.(2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReady, isPaused, feedbackState.showExplanation, handleReady]);

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

  // Reset gate position and readiness when question changes
  useEffect(() => {
    gatesProgressRef.current = 0;
    isResolvingRef.current = false;
    isReadyRef.current = false;
    setIsReady(false);
    setTimeRemainingSeconds(60);
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
          onLivesChange?.(nextLives);
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
      endStreak: streakRef.current,
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

      if (!isPaused && !feedbackState.showExplanation && isReadyRef.current) {
        // Update gates progress over 60 seconds
        if (!isResolvingRef.current) {
          gatesProgressRef.current += delta / TOTAL_QUESTION_TIME_MS;
          const remaining = Math.max(
            0,
            Math.ceil(TOTAL_QUESTION_TIME_MS * (1 - gatesProgressRef.current) / 1000)
          );
          setTimeRemainingSeconds(remaining);
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

      // --- DRAW BACKGROUND (Plain Jet Black - no checks / no grid) ---
      ctx.fillStyle = '#08090C'; // Plain Jet Black
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Subtle atmospheric Cerulean haze on upper dungeon wall
      const hazeGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT - 50);
      hazeGradient.addColorStop(0, 'rgba(2, 132, 199, 0.08)');
      hazeGradient.addColorStop(1, 'rgba(8, 9, 12, 0)');
      ctx.fillStyle = hazeGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT - 50);

      // Wall Torches with Cerulean and Neon Rose flame
      const torchSpacing = 220;
      for (let tx = 80 - bgScrollMid; tx < CANVAS_WIDTH + 100; tx += torchSpacing) {
        if (tx > -40 && tx < CANVAS_WIDTH + 40) {
          // Torch bracket
          ctx.fillStyle = '#202636';
          ctx.fillRect(tx, 45, 6, 16);
          // Flame glow
          const flameFlicker = Math.sin(now * 0.02 + tx) * 2.5;
          ctx.fillStyle = '#FF1376'; // Neon Rose flame
          ctx.beginPath();
          ctx.arc(tx + 3, 40 + flameFlicker, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#38BDF8'; // Cerulean inner spark
          ctx.beginPath();
          ctx.arc(tx + 3, 40 + flameFlicker, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Lane Guide Lines (Cerulean Blue passive, Neon Rose active lane)
      LANE_Y.forEach((y, laneIdx) => {
        const isCurrent = playerLane === laneIdx;
        ctx.strokeStyle = isCurrent ? 'rgba(255, 19, 118, 0.5)' : 'rgba(2, 132, 199, 0.2)';
        ctx.lineWidth = isCurrent ? 2 : 1;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Bottom Stone Floor (Plain, no checks / grid lines)
      ctx.fillStyle = '#10131A';
      ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 50);
      ctx.fillStyle = '#202636';
      ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 2);
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(0, CANVAS_HEIGHT - 48, CANVAS_WIDTH, 1);

      // --- DRAW 3 APPROACHING ANSWER GATES ---
      // Player is at X = 130. Gates start at X = 780 and move toward X = 130 over 60 seconds.
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
          let frameColor = '#202636';
          let signBg = '#0E1117';
          let glowColor = 'rgba(2, 132, 199, 0.15)';

          if (isResolvingRef.current) {
            if (optIdx === currentQ.correctIndex) {
              frameColor = '#10B981';
              signBg = '#064E3B';
              glowColor = 'rgba(16, 185, 129, 0.5)';
            } else if (optIdx === feedbackState.chosenLane) {
              frameColor = '#FF1376';
              signBg = '#7F1D1D';
              glowColor = 'rgba(255, 19, 118, 0.5)';
            }
          } else if (isTargetedByPlayer) {
            frameColor = '#FF1376';
            glowColor = 'rgba(255, 19, 118, 0.4)';
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
          ctx.fillStyle = isTargetedByPlayer ? '#FF1376' : '#0284C7';
          ctx.beginPath();
          ctx.arc(currentGateX, gateTop + 18, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(letter, currentGateX, gateTop + 18);

          // Short preview text on gate (only visible when ready)
          if (isReadyRef.current) {
            ctx.fillStyle = '#F1F5F9';
            ctx.font = 'bold 9px sans-serif';
            const shortPreview = optText.length > 12 ? optText.slice(0, 10) + '...' : optText;
            ctx.fillText(shortPreview, currentGateX, gateTop + 45);
          }
        });
      }

      // --- DRAW PLAYER PIXEL HERO ---
      const playerX = 130;
      const playerY = playerVisualYRef.current;
      const bobY = Math.sin(runFrame * Math.PI) * 3;

      // Hero shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(playerX, playerY + 22, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Damage blinking on wrong answer
      const isDamaged = feedbackState.type === 'wrong' && Math.floor(now / 100) % 2 === 0;

      if (!isDamaged) {
        // Hero Cape (Cerulean Blue)
        ctx.fillStyle = '#0284C7';
        ctx.beginPath();
        ctx.moveTo(playerX - 6, playerY - 4 + bobY);
        ctx.lineTo(playerX - 22, playerY + 10 + (runFrame % 2) * 4);
        ctx.lineTo(playerX - 6, playerY + 12 + bobY);
        ctx.fill();

        // Hero Body & Armor (Neon Rose breastplate)
        ctx.fillStyle = '#FF1376';
        ctx.fillRect(playerX - 7, playerY - 8 + bobY, 14, 18);

        // Hero Helmet
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(playerX - 6, playerY - 20 + bobY, 12, 12);
        // Visor slit
        ctx.fillStyle = '#08090C';
        ctx.fillRect(playerX - 1, playerY - 16 + bobY, 8, 3);

        // Legs (Running cycle)
        ctx.fillStyle = '#334155';
        if (runFrame === 0 || runFrame === 2) {
          ctx.fillRect(playerX - 6, playerY + 10 + bobY, 4, 11);
          ctx.fillRect(playerX + 2, playerY + 8 + bobY, 4, 11);
        } else {
          ctx.fillRect(playerX - 8, playerY + 7 + bobY, 5, 10);
          ctx.fillRect(playerX + 4, playerY + 11 + bobY, 5, 9);
        }

        // Lantern in hand
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(playerX + 11, playerY + 3 + bobY, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- STAGE OVERLAY IF NOT YET READY ---
      if (!isReadyRef.current) {
        ctx.fillStyle = 'rgba(8, 9, 12, 0.72)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Banner box
        const bannerW = 460;
        const bannerH = 110;
        const bannerX = (CANVAS_WIDTH - bannerW) / 2;
        const bannerY = (CANVAS_HEIGHT - bannerH) / 2;
        ctx.fillStyle = '#10131A';
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 2;
        ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
        ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

        // Pulsing Neon Rose dot
        ctx.fillStyle = '#FF1376';
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH / 2, bannerY + 28, 5 + Math.sin(now * 0.006) * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('QUESTION PRESENTED', CANVAS_WIDTH / 2, bannerY + 52);

        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('CLICK "READY" BELOW TO REVEAL OPTIONS & SPRINT (60s)', CANVAS_WIDTH / 2, bannerY + 80);
      }

      // --- FLOATING FEEDBACK PARTICLES ---
      if (feedbackState.type === 'correct') {
        ctx.fillStyle = '#38BDF8';
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
      {/* 1. HUD TOP BAR */}
      <div className="w-full bg-[#10131A] border-2 border-[#202636] rounded-xl p-3 sm:p-4 mb-3 flex items-center justify-between gap-3 shadow-xl">
        {/* Lives (3 pixel hearts in Neon Rose) */}
        <div className="flex items-center gap-1.5" aria-label={`Lives remaining: ${practiceMode ? 'Practice mode' : livesLeft}`}>
          {practiceMode ? (
            <span className="text-xs font-pixel text-[#38BDF8] bg-sky-950/80 px-2 py-0.5 rounded border border-sky-500/40">
              PRACTICE
            </span>
          ) : (
            [1, 2, 3].map((h) => (
              <Heart
                key={h}
                className={`w-5 h-5 transition-transform ${
                  h <= livesLeft
                    ? 'text-[#FF1376] fill-[#FF1376] drop-shadow-[0_0_8px_rgba(255,19,118,0.6)]'
                    : 'text-slate-700 fill-transparent'
                }`}
                aria-hidden="true"
              />
            ))
          )}
        </div>

        {/* 60-Second Countdown Timer Badge */}
        {isReady ? (
          <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold bg-[#08090C] px-3 py-1 rounded-lg border border-[#202636] shadow-inner">
            <Clock
              className={`w-4 h-4 ${
                timeRemainingSeconds <= 15
                  ? 'text-[#FF1376] animate-pulse'
                  : 'text-[#38BDF8]'
              }`}
            />
            <span
              className={
                timeRemainingSeconds <= 15
                  ? 'text-[#FF1376] font-bold'
                  : 'text-slate-100'
              }
            >
              {timeRemainingSeconds}s remaining
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[#38BDF8] bg-[#08090C] px-3 py-1 rounded-lg border border-[#0284C7]/40 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>60s on Ready</span>
          </div>
        )}

        {/* Question Counter, Streak & Score */}
        <div className="flex items-center gap-3 text-xs sm:text-sm font-mono">
          <span className="text-slate-300 hidden sm:inline">
            Q <strong className="text-white font-bold">{currentQuestionIndex + 1}</strong>/{questions.length}
          </span>
          {streak > 1 && (
            <span className="text-[#FF4D9E] font-pixel text-[11px] bg-rose-950/70 px-2 py-0.5 rounded border border-[#FF1376]/50 animate-pulse">
              Streak x{streak}
            </span>
          )}
          <span className="font-semibold text-white">
            Score: <span className="text-[#38BDF8] font-bold">{score}</span>
          </span>
        </div>

        {/* Controls: Mute, Motion, Pause, Quiz Fallback */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Reduce Motion toggle */}
          <button
            type="button"
            onClick={() => setReduceMotion(!reduceMotion)}
            className={`p-1.5 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0284C7] ${
              reduceMotion ? 'bg-[#1C2333] text-[#38BDF8]' : 'hover:bg-[#161A24] text-slate-400'
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
            className="p-1.5 rounded hover:bg-[#161A24] text-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0284C7]"
            aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-[#38BDF8]" />}
          </button>

          {/* Pause button */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded hover:bg-[#161A24] text-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0284C7]"
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
          >
            {isPaused ? <Play className="w-4 h-4 text-[#10B981]" /> : <Pause className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Quiz mode fallback toggle */}
          {onSwitchToQuizMode && (
            <button
              type="button"
              onClick={onSwitchToQuizMode}
              className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-[#08090C] border border-[#202636] transition-colors"
              title="Switch to card-based quiz mode"
            >
              Quiz Mode
            </button>
          )}
        </div>
      </div>

      {/* 2. QUESTION PANEL (DOM text above canvas, WCAG legible) */}
      <div className="w-full bg-[#10131A] border-2 border-[#202636] rounded-xl p-4 sm:p-5 mb-3 shadow-lg text-center relative overflow-hidden">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
          <span className="uppercase text-[#38BDF8] font-bold tracking-wider">{currentQ.difficulty} Challenge</span>
          <span className="text-slate-400">Page {currentQ.page}</span>
        </div>

        <h2 className="text-base sm:text-lg md:text-xl font-bold text-white leading-snug">
          {currentQ.question}
        </h2>

        {/* 60s Progress Bar (Active when Ready) */}
        {isReady && (
          <div className="w-full bg-[#08090C] border border-[#202636] rounded-full h-2 mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                timeRemainingSeconds <= 15
                  ? 'bg-gradient-to-r from-[#FF1376] to-[#E11D48] animate-pulse'
                  : 'bg-gradient-to-r from-[#0284C7] to-[#38BDF8]'
              }`}
              style={{
                width: `${Math.max(0, Math.min(100, (timeRemainingSeconds / 60) * 100))}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* 3. GAME CANVAS (16:9 ratio, pixelated rendering) */}
      <div className="w-full relative rounded-xl overflow-hidden border-2 border-[#202636] shadow-2xl bg-[#08090C] aspect-video">
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
              className="btn-pixel-cerulean px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Why?</span>
            </button>
          </div>
        )}

        {/* Explanation Modal Overlay (on wrong answer or when 'Why?' is clicked) */}
        {feedbackState.showExplanation && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-[#10131A] border-2 border-[#0284C7] rounded-xl p-5 sm:p-6 shadow-2xl text-left">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2">
                {feedbackState.type === 'wrong' ? (
                  <>
                    <XCircle className="w-4 h-4 text-[#FF1376]" />
                    <span className="text-[#FF1376]">Incorrect Answer</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    <span className="text-[#10B981]">Correct Explanation</span>
                  </>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-300 mb-2">
                <strong>Correct answer:</strong>{' '}
                <span className="text-white font-semibold">
                  {['A', 'B', 'C'][currentQ.correctIndex]}: {currentQ.options[currentQ.correctIndex]}
                </span>
              </p>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-4 font-sans bg-[#08090C] p-3 rounded border border-[#202636]">
                {currentQ.explanation}
              </p>

              {/* Source Quote from PDF */}
              <div className="p-2.5 rounded bg-[#08090C] border-l-2 border-[#38BDF8] text-xs text-sky-200 mb-5">
                <span className="font-semibold block text-[10px] text-[#38BDF8] font-mono mb-0.5">
                  FROM THE PDF (Page {currentQ.page}):
                </span>
                <span className="italic font-serif">&ldquo;{currentQ.sourceQuote}&rdquo;</span>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleContinueAfterWrong}
                  className="btn-pixel-cerulean px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
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
          <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#10131A] border-2 border-[#202636] rounded-xl p-6 text-center shadow-2xl">
              <h3 className="font-pixel text-base text-[#38BDF8] mb-5">Paused</h3>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaused(false)}
                  className="btn-pixel-cerulean py-2.5 rounded-lg text-xs font-bold"
                >
                  Resume
                </button>
                <button
                  type="button"
                  onClick={onQuit}
                  className="btn-pixel-dark py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-[#FF1376]"
                >
                  Quit Level
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. READY STAGE vs OPTIONS SELECTION */}
      {!isReady ? (
        /* STEP 1: Question-First State -> Options NOT visible until player clicks READY */
        <div className="w-full bg-[#10131A] border-2 border-[#202636] rounded-xl p-6 sm:p-7 mt-3 flex flex-col items-center justify-center text-center shadow-xl animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-full bg-[#0284C7]/15 border border-[#0284C7]/50 flex items-center justify-center text-[#38BDF8] mb-3 shadow-[0_0_16px_rgba(2,132,199,0.3)]">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-pixel text-xs sm:text-sm text-white mb-2 tracking-wider">
            QUESTION PRESENTED
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-5 leading-relaxed font-sans">
            Read the challenge carefully above. When you are ready to reveal the options and sprint to choose your answer, click <strong>READY</strong> to start the <strong>60-second</strong> challenge.
          </p>
          <button
            type="button"
            onClick={handleReady}
            className="btn-pixel-cerulean px-8 py-3.5 rounded-xl font-pixel text-xs sm:text-sm flex items-center gap-3 cursor-pointer hover:scale-103 transition-transform"
            autoFocus
          >
            <Play className="w-4 h-4 fill-current" />
            <span>I AM READY · REVEAL OPTIONS (60s)</span>
          </button>
          <span className="text-[11px] text-slate-500 font-mono mt-3">
            Tip: You can also press Space or Enter on your keyboard
          </span>
        </div>
      ) : (
        /* STEP 2: Options and Game active -> Options are visible and answer selectable */
        <div className="w-full mt-3 animate-in fade-in duration-200">
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {currentQ.options.map((opt, idx) => {
              const letter = ['A', 'B', 'C'][idx];
              const isPlayerInThisLane = playerLane === idx;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (!isResolvingRef.current) {
                      setPlayerLane(idx);
                      resolveAnswer(idx);
                    }
                  }}
                  className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all flex items-start gap-2.5 text-left group ${
                    isPlayerInThisLane
                      ? 'bg-[#141C2B] border-[#FF1376] text-white shadow-[0_0_16px_rgba(255,19,118,0.25)]'
                      : 'bg-[#10131A] border-[#202636] text-slate-300 hover:border-[#0284C7] hover:bg-[#121622]'
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Option ${letter}: ${opt}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPlayerLane(idx);
                      resolveAnswer(idx);
                    }
                  }}
                >
                  <span
                    className={`w-7 h-7 rounded text-xs font-bold font-mono flex items-center justify-center flex-shrink-0 transition-colors ${
                      isPlayerInThisLane
                        ? 'bg-[#FF1376] text-white shadow-xs'
                        : 'bg-[#161B26] text-[#38BDF8] border border-[#20283A] group-hover:border-[#0284C7]'
                    }`}
                  >
                    {letter}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs sm:text-sm leading-snug line-clamp-3 block">
                      {opt}
                    </span>
                    <span className="text-[10px] text-sky-400 font-mono mt-1 block opacity-80 group-hover:opacity-100">
                      Tap to select {letter}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5. TOUCH ON-SCREEN LANE BUTTONS (Mobile & Tablet) */}
          <div className="w-full flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[#202636]">
            <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
              Controls: Click option to answer · W / S / Arrows or 1, 2, 3 to navigate · Space to pause
            </div>

            {/* On-screen lane buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
              <span className="text-xs text-slate-400 mr-1 sm:hidden">Lane:</span>
              {['A (Top)', 'B (Mid)', 'C (Bot)'].map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPlayerLane(idx);
                    resolveAnswer(idx);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold border-2 transition-all flex-1 sm:flex-initial cursor-pointer ${
                    playerLane === idx
                      ? 'bg-[#FF1376] text-white border-[#FF4D9E] shadow-md'
                      : 'btn-pixel-dark text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
