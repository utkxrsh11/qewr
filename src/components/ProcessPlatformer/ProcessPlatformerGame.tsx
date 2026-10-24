import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlatformerRound,
  StepAnswer,
  PlatformerRoundSummary,
  LevelResult,
  Level,
} from '../../types/course.ts';
import { playSound, isAudioMuted, setAudioMuted } from '../../services/soundEffects.ts';
import { calculateStars, calculateXpEarned } from '../../services/progressService.ts';
import { generatePlatformLayout, PlatformSlot } from '../../services/platformerService.ts';
import { PlatformerSimpleMode } from './PlatformerSimpleMode.tsx';
import {
  Heart,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Shield,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Sliders,
  Layers,
} from 'lucide-react';

export interface ProcessPlatformerGameProps {
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
}

const VIRTUAL_WIDTH = 960;
const VIRTUAL_HEIGHT = 540;
const GROUND_Y = 510;
const PLAYER_WIDTH = 26;
const PLAYER_HEIGHT = 38;

export const ProcessPlatformerGame: React.FC<ProcessPlatformerGameProps> = ({
  rounds,
  level,
  lives: initialLives = 3,
  initialStreak = 0,
  practiceMode = false,
  muted: initialMuted = isAudioMuted(),
  reduceMotion: initialReduceMotion = false,
  onFinish,
  onQuit,
  onLivesChange,
}) => {
  // Check localStorage for simple mode preference
  const [simpleMode, setSimpleMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('studyquest_simple_platformer') === 'true';
    } catch {
      return false;
    }
  });

  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0); // Which step in round.steps is expected next
  const [livesLeft, setLivesLeft] = useState(initialLives);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(initialStreak);
  const [bestStreak, setBestStreak] = useState(initialStreak);
  const [hintsLeft, setHintsLeft] = useState(2);
  const [isPaused, setIsPaused] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [muted, setMuted] = useState(initialMuted);
  const [reduceMotion, setReduceMotion] = useState(initialReduceMotion);
  const [showStepsList, setShowStepsList] = useState(false);

  // Non-blocking caption for correct steps (3 seconds)
  const [activeCaption, setActiveCaption] = useState<{ stepLabel: string; explanation: string } | null>(null);

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
  const [redFlashActive, setRedFlashActive] = useState(false);

  // Screen reader announcements
  const [ariaLive, setAriaLive] = useState('');

  // Canvas & layout state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [platformSlots, setPlatformSlots] = useState<PlatformSlot[]>([]);

  // Solved and crumbled platform tracking
  const solvedSlotIdsRef = useRef<Set<string>>(new Set());
  const crumbledSlotIdsRef = useRef<Map<string, { crumbleStartTime: number; respawnAt: number; falling: boolean }>>(new Map());
  const hintPulseSlotIdRef = useRef<{ slotId: string; until: number } | null>(null);

  // Player physics state
  const playerRef = useRef({
    x: 60,
    y: GROUND_Y - PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    isGrounded: true,
    facing: 1 as 1 | -1,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    currentPlatformId: null as string | null,
    standTimer: 0, // ms standing continuously on current platform
  });

  // Inputs
  const keysRef = useRef({
    left: false,
    right: false,
    up: false,
    upHeld: false,
  });

  // Hints and answers tracking
  const hintedStepIndicesRef = useRef<Set<number>>(new Set());
  const answersRef = useRef<StepAnswer[]>([]);
  const roundSummariesRef = useRef<PlatformerRoundSummary[]>([]);
  const currentRoundMistakesRef = useRef(0);
  const currentRoundHintsUsedRef = useRef(0);
  const stepAttemptsRef = useRef<Record<number, number>>({});
  const stepFirstChosenIdRef = useRef<Record<number, string>>({});
  const stepStartTimeRef = useRef(Date.now());
  const streakRef = useRef(initialStreak);
  streakRef.current = streak;

  const currentRound = rounds[currentRoundIdx];
  const totalRounds = rounds.length;

  const handleToggleSimpleMode = () => {
    const next = !simpleMode;
    setSimpleMode(next);
    try {
      localStorage.setItem('studyquest_simple_platformer', next ? 'true' : 'false');
    } catch {}
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
  };

  // Initialize round layout and state
  useEffect(() => {
    if (!currentRound) return;
    setCurrentStepIdx(0);
    setHintsLeft(2);
    setBlockingWrong(null);
    setBlockingRoundComplete(false);
    setActiveCaption(null);
    solvedSlotIdsRef.current.clear();
    crumbledSlotIdsRef.current.clear();
    hintPulseSlotIdRef.current = null;
    hintedStepIndicesRef.current.clear();
    currentRoundMistakesRef.current = 0;
    currentRoundHintsUsedRef.current = 0;
    stepAttemptsRef.current = {};
    stepFirstChosenIdRef.current = {};
    stepStartTimeRef.current = Date.now();

    // Reset player position to start sign
    playerRef.current = {
      x: 60,
      y: GROUND_Y - PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      isGrounded: true,
      facing: 1,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      currentPlatformId: null,
      standTimer: 0,
    };

    const slots = generatePlatformLayout(currentRound);
    setPlatformSlots(slots);
    setAriaLive(`Round ${currentRoundIdx + 1} of ${totalRounds}: ${currentRound.title}. Stand on a platform to choose it.`);
  }, [currentRoundIdx, currentRound, totalRounds]);

  const updateLives = useCallback(
    (newLives: number) => {
      setLivesLeft(newLives);
      onLivesChange?.(newLives);
    },
    [onLivesChange]
  );

  // Trigger hint
  const handleUseHint = useCallback(() => {
    if (!currentRound || isPaused || blockingWrong || blockingRoundComplete) return;
    if (!practiceMode && hintsLeft <= 0) return;

    const expected = currentRound.steps[currentStepIdx];
    if (!expected) return;

    const targetSlot = platformSlots.find((s) => s.item.id === expected.id);
    if (!targetSlot) return;

    playSound('hint');
    hintedStepIndicesRef.current.add(currentStepIdx);
    hintPulseSlotIdRef.current = {
      slotId: targetSlot.id,
      until: Date.now() + 3000,
    };
    currentRoundHintsUsedRef.current++;

    if (!practiceMode) {
      setHintsLeft((prev) => Math.max(0, prev - 1));
      setScore((prev) => Math.max(0, prev - 25)); // Cost 25 pts (floor 0)
    }

    setAriaLive(`Hint used: next step platform highlighted.`);
  }, [currentRound, isPaused, blockingWrong, blockingRoundComplete, practiceMode, hintsLeft, currentStepIdx, platformSlots]);

  // Choice evaluation
  const evaluateChoice = useCallback(
    (slot: PlatformSlot) => {
      if (!currentRound || blockingWrong || blockingRoundComplete) return;
      if (solvedSlotIdsRef.current.has(slot.id)) return; // Already placed

      const expectedStep = currentRound.steps[currentStepIdx];
      if (!expectedStep) return;

      const attempts = (stepAttemptsRef.current[currentStepIdx] || 0) + 1;
      stepAttemptsRef.current[currentStepIdx] = attempts;
      if (!stepFirstChosenIdRef.current[currentStepIdx]) {
        stepFirstChosenIdRef.current[currentStepIdx] = slot.item.id;
      }

      const isFirstTry = attempts === 1;
      const isHinted = hintedStepIndicesRef.current.has(currentStepIdx);

      if (slot.item.type === 'step' && slot.item.id === expectedStep.id) {
        // CORRECT CHOICE!
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
        solvedSlotIdsRef.current.add(slot.id);

        // Record answer
        answersRef.current.push({
          itemId: expectedStep.id,
          conceptId: currentRound.conceptId,
          gameId: 'platformer',
          correct: isFirstTry && !isHinted,
          hinted: isHinted,
          attempts,
          chosenId: stepFirstChosenIdRef.current[currentStepIdx] || slot.item.id,
          correctId: expectedStep.id,
          timeMs,
        });

        // 3-second non-blocking caption
        setActiveCaption({
          stepLabel: slot.item.label,
          explanation: slot.item.explanation,
        });
        setTimeout(() => {
          setActiveCaption((prev) => (prev?.stepLabel === slot.item.label ? null : prev));
        }, 3000);

        setAriaLive(`Step ${currentStepIdx + 1} placed: ${slot.item.label}.`);

        const nextStepIdx = currentStepIdx + 1;
        if (nextStepIdx >= currentRound.steps.length) {
          // Sequence complete!
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
        // WRONG CHOICE (real step in wrong place OR decoy)
        playSound('wrong');
        playSound('crumble');
        currentRoundMistakesRef.current++;
        setStreak(0);

        // Red flash
        setRedFlashActive(true);
        setTimeout(() => setRedFlashActive(false), 300);

        // Platform shakes 400ms then crumbles & falls
        crumbledSlotIdsRef.current.set(slot.id, {
          crumbleStartTime: Date.now(),
          respawnAt: Date.now() + 400 + 1500, // 400ms shake/fall + 1.5s respawn
          falling: true,
        });

        // Player drops to ground
        playerRef.current.y = Math.min(GROUND_Y - PLAYER_HEIGHT, playerRef.current.y + 40);
        playerRef.current.vy = 200;
        playerRef.current.currentPlatformId = null;
        playerRef.current.standTimer = 0;

        const remLives = practiceMode ? livesLeft : Math.max(0, livesLeft - 1);
        if (!practiceMode) {
          updateLives(remLives);
        }

        const isDecoy = slot.item.type === 'decoy';
        setBlockingWrong({
          isDecoy,
          chosenLabel: slot.item.label,
          expectedStepLabel: expectedStep.label,
          expectedExplanation: expectedStep.explanation,
          whyNot: slot.item.explanation,
          page: currentRound.page,
          sourceQuote: currentRound.sourceQuote,
        });

        setAriaLive(
          isDecoy
            ? `Decoy chosen: ${slot.item.label} does not belong.`
            : `Wrong order: That step comes later. Next expected step is: ${expectedStep.label}`
        );
      }
    },
    [currentRound, blockingWrong, blockingRoundComplete, currentStepIdx, streak, practiceMode, livesLeft, updateLives]
  );

  const handleContinueAfterWrong = () => {
    setBlockingWrong(null);
    if (!practiceMode && livesLeft <= 0) {
      concludeGame('outOfLives');
    }
  };

  const handleContinueAfterRoundComplete = () => {
    setBlockingRoundComplete(false);
    if (currentRoundIdx < totalRounds - 1) {
      setCurrentRoundIdx((prev) => prev + 1);
    } else {
      concludeGame('completed');
    }
  };

  const concludeGame = useCallback(
    (status: 'completed' | 'outOfLives' | 'quit') => {
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
    },
    [bestStreak, level, livesLeft, onFinish, practiceMode, rounds, score, streak]
  );

  // Auto-pause when tab loses focus
  useEffect(() => {
    const handleBlur = () => {
      if (!blockingWrong && !blockingRoundComplete && !isInfoOpen) {
        setIsPaused(true);
      }
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [blockingWrong, blockingRoundComplete, isInfoOpen]);

  // Keyboard navigation & controls
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

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = true;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        e.preventDefault();
        keysRef.current.up = true;
        keysRef.current.upHeld = true;
        playerRef.current.jumpBufferTimer = 100; // 100ms jump buffer
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        handleUseHint();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = false;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        keysRef.current.up = false;
        keysRef.current.upHeld = false;
        // Variable jump: cutting velocity if moving upward
        if (playerRef.current.vy < -120) {
          playerRef.current.vy *= 0.45;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [blockingWrong, blockingRoundComplete, isInfoOpen, isPaused, handleUseHint]);

  // Touch handlers
  const handleTouchStartLeft = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current.left = true;
  };
  const handleTouchEndLeft = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current.left = false;
  };
  const handleTouchStartRight = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current.right = true;
  };
  const handleTouchEndRight = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current.right = false;
  };
  const handleTouchStartJump = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current.up = true;
    keysRef.current.upHeld = true;
    playerRef.current.jumpBufferTimer = 100;
  };
  const handleTouchEndJump = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysRef.current.up = false;
    keysRef.current.upHeld = false;
    if (playerRef.current.vy < -120) {
      playerRef.current.vy *= 0.45;
    }
  };

  // ---------------------------------------------------------------------------
  // Canvas Physics & Render Loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (simpleMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Canvas 2D context not available. Switching to Simple Mode.');
      setSimpleMode(true);
      return;
    }

    let lastTime = performance.now();
    let isMounted = true;

    const loop = (now: number) => {
      if (!isMounted) return;

      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const player = playerRef.current;
      const keys = keysRef.current;
      const isStopped = isPaused || Boolean(blockingWrong) || Boolean(blockingRoundComplete);

      // --- PHYSICS UPDATE ---
      if (!isStopped) {
        // Horizontal movement
        const moveSpeed = reduceMotion ? 190 : 220;
        if (keys.left && !keys.right) {
          player.vx = -moveSpeed;
          player.facing = -1;
        } else if (keys.right && !keys.left) {
          player.vx = moveSpeed;
          player.facing = 1;
        } else {
          player.vx = 0;
        }

        player.x += player.vx * dt;
        // Keep in bounds
        player.x = Math.max(10, Math.min(VIRTUAL_WIDTH - PLAYER_WIDTH - 10, player.x));

        // Timers update
        if (player.coyoteTimer > 0) player.coyoteTimer -= dt * 1000;
        if (player.jumpBufferTimer > 0) player.jumpBufferTimer -= dt * 1000;

        // Jump trigger
        if (player.jumpBufferTimer > 0 && (player.isGrounded || player.coyoteTimer > 0)) {
          player.vy = -430; // Jump height ~150px with gravity 900
          player.isGrounded = false;
          player.coyoteTimer = 0;
          player.jumpBufferTimer = 0;
          player.currentPlatformId = null;
          player.standTimer = 0;
          playSound('jump');
        }

        // Apply gravity
        player.vy += 900 * dt;
        const prevY = player.y;
        player.y += player.vy * dt;

        // Ground collision (y = GROUND_Y)
        const groundSurface = GROUND_Y - PLAYER_HEIGHT;
        if (player.y >= groundSurface) {
          if (!player.isGrounded && player.vy > 100) {
            playSound('land');
          }
          player.y = groundSurface;
          player.vy = 0;
          player.isGrounded = true;
          player.coyoteTimer = 100;
          player.currentPlatformId = null;
          player.standTimer = 0;
        } else {
          player.isGrounded = false;
        }

        // Platform one-way collision & standing choice check
        let landedOnPlatform: PlatformSlot | null = null;
        const pBottom = player.y + PLAYER_HEIGHT;
        const prevBottom = prevY + PLAYER_HEIGHT;
        const pLeft = player.x;
        const pRight = player.x + PLAYER_WIDTH;

        const nowMs = Date.now();
        // Clean up expired crumbled platforms
        crumbledSlotIdsRef.current.forEach((info, sId) => {
          if (nowMs >= info.respawnAt) {
            crumbledSlotIdsRef.current.delete(sId);
          }
        });

        for (const slot of platformSlots) {
          const isCrumbled = crumbledSlotIdsRef.current.has(slot.id);
          if (isCrumbled) continue;

          const platTop = slot.y;
          const platLeft = slot.x;
          const platRight = slot.x + slot.width;

          // Falling downward through top edge
          if (
            player.vy >= 0 &&
            prevBottom <= platTop + 8 &&
            pBottom >= platTop &&
            pRight > platLeft + 6 &&
            pLeft < platRight - 6
          ) {
            player.y = platTop - PLAYER_HEIGHT;
            player.vy = 0;
            player.isGrounded = true;
            player.coyoteTimer = 100;
            landedOnPlatform = slot;
            break;
          }
        }

        // Check standing on platform for 600ms choice rule
        if (landedOnPlatform) {
          if (player.currentPlatformId === landedOnPlatform.id) {
            player.standTimer += dt * 1000;
            if (player.standTimer >= 600) {
              player.standTimer = 0;
              // Evaluate choice!
              evaluateChoice(landedOnPlatform);
            }
          } else {
            player.currentPlatformId = landedOnPlatform.id;
            player.standTimer = 0;
          }
        } else if (!player.isGrounded) {
          player.currentPlatformId = null;
          player.standTimer = 0;
        }
      }

      // --- RENDERING ---
      ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

      // 1. Background (Dark Stone Dungeon with 2 Parallax Layers)
      ctx.fillStyle = '#080A16';
      ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

      // Layer 1: Distant Wall Bricks & Arch lines
      const pxOffset1 = reduceMotion ? 0 : (player.x / VIRTUAL_WIDTH) * 20;
      ctx.strokeStyle = '#12182B';
      ctx.lineWidth = 1;
      for (let x = -pxOffset1; x < VIRTUAL_WIDTH; x += 60) {
        for (let y = 0; y < GROUND_Y - 40; y += 36) {
          ctx.strokeRect(x, y, 60, 36);
        }
      }

      // Layer 2: Midground Pillars & Torches
      const pxOffset2 = reduceMotion ? 0 : (player.x / VIRTUAL_WIDTH) * 45;
      for (let tx = 140 - pxOffset2; tx < VIRTUAL_WIDTH + 100; tx += 280) {
        if (tx > -60 && tx < VIRTUAL_WIDTH + 60) {
          // Pillar
          ctx.fillStyle = '#161E38';
          ctx.fillRect(tx, 0, 28, GROUND_Y);

          // Torch
          ctx.fillStyle = '#374151';
          ctx.fillRect(tx + 10, 240, 8, 20);
          const flicker = Math.sin(now * 0.01 + tx) * 3;
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(tx + 14, 235 + flicker, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FDE047';
          ctx.beginPath();
          ctx.arc(tx + 14, 235 + flicker, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Solid Stone Ground (y = GROUND_Y to VIRTUAL_HEIGHT)
      ctx.fillStyle = '#1A213D';
      ctx.fillRect(0, GROUND_Y, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - GROUND_Y);
      ctx.fillStyle = '#2A3660';
      ctx.fillRect(0, GROUND_Y, VIRTUAL_WIDTH, 4); // Ground lip
      // Stone pavement lines
      ctx.strokeStyle = '#0E1324';
      ctx.lineWidth = 2;
      for (let gx = 0; gx < VIRTUAL_WIDTH; gx += 48) {
        ctx.beginPath();
        ctx.moveTo(gx, GROUND_Y);
        ctx.lineTo(gx, VIRTUAL_HEIGHT);
        ctx.stroke();
      }

      // 3. START Sign (far left)
      ctx.fillStyle = '#4B3621'; // Wood post
      ctx.fillRect(40, GROUND_Y - 50, 8, 50);
      ctx.fillStyle = '#785230'; // Signboard
      ctx.fillRect(20, GROUND_Y - 72, 48, 24);
      ctx.strokeStyle = '#2B1A0E';
      ctx.strokeRect(20, GROUND_Y - 72, 48, 24);
      ctx.fillStyle = '#F5C542';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('START', 27, GROUND_Y - 56);

      // 4. Render Platforms
      const nowMs = Date.now();
      const pulseInfo = hintPulseSlotIdRef.current;
      const isPulsing = pulseInfo && pulseInfo.until > nowMs;

      for (const slot of platformSlots) {
        const isCrumbled = crumbledSlotIdsRef.current.get(slot.id);
        if (isCrumbled) {
          // If in 400ms shake/fall phase
          const elapsed = nowMs - isCrumbled.crumbleStartTime;
          if (elapsed < 400) {
            const shake = reduceMotion ? 0 : (Math.random() - 0.5) * 6;
            const dropY = (elapsed / 400) * 35;
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - elapsed / 400);
            ctx.fillStyle = '#EF4444';
            ctx.fillRect(slot.x + shake, slot.y + dropY, slot.width, slot.height);
            ctx.restore();
          }
          continue; // Hidden while respawning
        }

        const isSolved = solvedSlotIdsRef.current.has(slot.id);
        const isPulseTarget = isPulsing && pulseInfo?.slotId === slot.id;

        // Platform slab colors
        let slabBg = '#1E2748';
        let slabBorder = '#364578';
        let slabTop = '#4B5E99';

        if (isSolved) {
          slabBg = '#0B382A';
          slabBorder = '#10B981';
          slabTop = '#34D399';
        } else if (isPulseTarget) {
          const pulseBright = Math.sin(nowMs * 0.008) > 0;
          slabBg = pulseBright ? '#4A4215' : '#2A2510';
          slabBorder = '#FDE047';
          slabTop = '#FEF08A';
        }

        // Platform Body
        ctx.fillStyle = slabBg;
        ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
        // Top surface
        ctx.fillStyle = slabTop;
        ctx.fillRect(slot.x, slot.y, slot.width, 4);
        // Border
        ctx.strokeStyle = slabBorder;
        ctx.lineWidth = isPulseTarget ? 3 : 2;
        ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);

        // Sequence badge if solved
        if (isSolved && slot.item.stepIndex !== undefined) {
          ctx.fillStyle = '#10B981';
          ctx.fillRect(slot.x + 4, slot.y + 8, 22, 16);
          ctx.fillStyle = '#052E16';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`#${slot.item.stepIndex + 1}`, slot.x + 7, slot.y + 20);
        }

        // Filling progress bar if player is currently standing on it to choose
        if (player.currentPlatformId === slot.id && !isSolved) {
          const ratio = Math.min(1, player.standTimer / 600);
          ctx.fillStyle = 'rgba(245, 197, 66, 0.4)';
          ctx.fillRect(slot.x, slot.y + 4, slot.width * ratio, 6);
          ctx.fillStyle = '#F5C542';
          ctx.fillRect(slot.x, slot.y + 4, slot.width * ratio, 2);
        }

        // Draw Step Text on platform (wraps up to 3 lines, auto-shrinks, truncates on canvas)
        ctx.fillStyle = isSolved ? '#D1FAE5' : '#F1F5F9';
        ctx.font = '11px sans-serif';

        const textPaddingX = isSolved ? 32 : 8;
        const maxTextWidth = slot.width - textPaddingX - 6;
        const words = slot.item.label.split(' ');
        const lines: string[] = [];
        let curLine = '';

        for (const w of words) {
          const testLine = curLine ? `${curLine} ${w}` : w;
          if (ctx.measureText(testLine).width <= maxTextWidth) {
            curLine = testLine;
          } else {
            if (curLine) lines.push(curLine);
            curLine = w;
            if (lines.length >= 3) break;
          }
        }
        if (curLine && lines.length < 3) {
          lines.push(curLine);
        }

        // Truncate line 3 if more words
        if (lines.length === 3 && words.length > 5) {
          while (ctx.measureText(lines[2] + '...').width > maxTextWidth && lines[2].length > 4) {
            lines[2] = lines[2].slice(0, -1);
          }
          lines[2] += '...';
        }

        const startY = slot.y + 16 + (3 - lines.length) * 4;
        lines.forEach((l, li) => {
          ctx.fillText(l, slot.x + textPaddingX, startY + li * 13);
        });
      }

      // 5. Draw Player Character
      // Retro adventurer pixel avatar
      const px = player.x;
      const py = player.y;

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(px + PLAYER_WIDTH / 2, py + PLAYER_HEIGHT + 1, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body (Tunic)
      ctx.fillStyle = '#2DD4BF'; // Teal hero armor
      ctx.fillRect(px + 4, py + 12, PLAYER_WIDTH - 8, PLAYER_HEIGHT - 18);

      // Belt & Gold Buckle
      ctx.fillStyle = '#4B250E';
      ctx.fillRect(px + 4, py + 24, PLAYER_WIDTH - 8, 4);
      ctx.fillStyle = '#F5C542';
      ctx.fillRect(px + PLAYER_WIDTH / 2 - 3, py + 23, 6, 6);

      // Head & Helmet
      ctx.fillStyle = '#FDE68A'; // Face
      ctx.fillRect(px + 6, py + 2, PLAYER_WIDTH - 12, 10);
      ctx.fillStyle = '#374151'; // Helmet
      ctx.fillRect(px + 4, py, PLAYER_WIDTH - 8, 4);

      // Eyes facing direction
      ctx.fillStyle = '#0F172A';
      const eyeX = player.facing === 1 ? px + PLAYER_WIDTH - 9 : px + 7;
      ctx.fillRect(eyeX, py + 5, 3, 3);

      // Legs / Running animation bob
      const legOffset = Math.sin(now * 0.02) * (player.vx !== 0 ? 3 : 0);
      ctx.fillStyle = '#1E293B'; // Boots
      ctx.fillRect(px + 5, py + PLAYER_HEIGHT - 6 + legOffset, 6, 6);
      ctx.fillRect(px + PLAYER_WIDTH - 11, py + PLAYER_HEIGHT - 6 - legOffset, 6, 6);

      // Stand Indicator above head if choosing
      if (player.currentPlatformId && player.standTimer > 0) {
        const ratio = Math.min(1, player.standTimer / 600);
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(px - 4, py - 12, 34, 6);
        ctx.fillStyle = '#2DD4BF';
        ctx.fillRect(px - 3, py - 11, 32 * ratio, 4);
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [simpleMode, isPaused, blockingWrong, blockingRoundComplete, platformSlots, reduceMotion, evaluateChoice]);

  // If Simple Mode is active, delegate completely to PlatformerSimpleMode
  if (simpleMode) {
    return (
      <PlatformerSimpleMode
        rounds={rounds}
        level={level}
        lives={livesLeft}
        initialStreak={streak}
        practiceMode={practiceMode}
        muted={muted}
        reduceMotion={reduceMotion}
        onFinish={onFinish}
        onQuit={onQuit}
        onLivesChange={onLivesChange}
        onSwitchToCanvasMode={() => {
          setSimpleMode(false);
          try {
            localStorage.setItem('studyquest_simple_platformer', 'false');
          } catch {}
        }}
      />
    );
  }

  if (!currentRound) return null;

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-3 flex flex-col items-center select-none font-sans">
      <div className="sr-only" aria-live="assertive">
        {ariaLive}
      </div>

      {/* 1. TOP HUD BAR */}
      <div className="w-full bg-[#0F1426] border-2 border-[#242F55] rounded-xl px-4 py-2 mb-3 shadow-lg flex items-center justify-between gap-2 sm:gap-4">
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

        {/* Round & Step Progress */}
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
            title="Reveal next platform (key H)"
          >
            <Lightbulb className="w-3.5 h-3.5 text-[#F5C542]" />
            <span>Hint ({practiceMode ? '∞' : hintsLeft})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            className="p-1.5 rounded bg-[#18213D] border border-[#2F3E70] text-slate-400 hover:text-white cursor-pointer"
            title="Controls & Simple Mode"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            className="p-1.5 rounded bg-[#18213D] border border-[#2F3E70] text-slate-400 hover:text-white cursor-pointer"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
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

      {/* 2. INSTRUCTION & SEQUENCE SO FAR */}
      <div className="w-full bg-[#12162B] border-2 border-[#232A47] rounded-xl p-3.5 mb-3 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-1.5">
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
          <span className="text-[11px] text-teal-300/80 font-mono hidden sm:inline">
            Stand on a platform for a moment to choose it
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-200 mb-2.5 leading-snug">{currentRound.instruction}</p>

        {/* Sequence So Far slots */}
        <div className="w-full pt-2 border-t border-[#1F2747]">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase mb-1.5">
            <span>Sequence So Far:</span>
            <span>Expecting Step #{currentStepIdx + 1}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {currentRound.steps.map((st, idx) => {
              const isFilled = idx < currentStepIdx;
              return (
                <div
                  key={st.id}
                  className={`p-1.5 rounded border text-left flex flex-col justify-between min-h-[46px] transition-all ${
                    isFilled
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                      : idx === currentStepIdx
                      ? 'bg-[#18213D] border-[#F5C542] text-amber-200 animate-pulse'
                      : 'bg-[#0A0D1B] border-[#1F2848] text-slate-600'
                  }`}
                >
                  <span className="text-[9px] font-mono font-bold block">Step {idx + 1}</span>
                  <span className="text-[10px] font-medium leading-tight truncate">
                    {isFilled ? st.label : '?'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. 16:9 CANVAS VIEWPORT */}
      <div
        className={`relative w-full aspect-video max-w-4xl rounded-2xl overflow-hidden border-2 shadow-2xl bg-[#080A16] ${
          redFlashActive ? 'border-red-500 animate-pulse' : 'border-[#232A47]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={VIRTUAL_WIDTH}
          height={VIRTUAL_HEIGHT}
          className="w-full h-full block pixelated"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Non-blocking caption under canvas (3 seconds) */}
        {activeCaption && (
          <div className="absolute bottom-14 left-4 right-4 bg-[#0A0E20]/90 border border-emerald-500/80 rounded-xl p-3 shadow-xl backdrop-blur-sm animate-fade-in flex items-start gap-2.5 pointer-events-none">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-emerald-300 block">{activeCaption.stepLabel}</span>
              <p className="text-[11px] text-slate-200 leading-snug">{activeCaption.explanation}</p>
            </div>
          </div>
        )}

        {/* Touch Controls Overlay for Touch Devices */}
        <div className="sm:hidden absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto select-none touch-none">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onTouchStart={handleTouchStartLeft}
              onTouchEnd={handleTouchEndLeft}
              onMouseDown={handleTouchStartLeft}
              onMouseUp={handleTouchEndLeft}
              className="w-14 h-14 rounded-xl bg-[#1A2242]/90 border-2 border-[#334277] text-white font-bold text-lg active:bg-[#2DD4BF] active:text-black shadow-lg"
            >
              ◀
            </button>
            <button
              type="button"
              onTouchStart={handleTouchStartRight}
              onTouchEnd={handleTouchEndRight}
              onMouseDown={handleTouchStartRight}
              onMouseUp={handleTouchEndRight}
              className="w-14 h-14 rounded-xl bg-[#1A2242]/90 border-2 border-[#334277] text-white font-bold text-lg active:bg-[#2DD4BF] active:text-black shadow-lg"
            >
              ▶
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUseHint}
              className="w-12 h-12 rounded-xl bg-[#2A2B18]/90 border-2 border-[#F5C542] text-[#F5C542] text-xs font-bold shadow-lg"
            >
              HINT
            </button>
            <button
              type="button"
              onTouchStart={handleTouchStartJump}
              onTouchEnd={handleTouchEndJump}
              onMouseDown={handleTouchStartJump}
              onMouseUp={handleTouchEndJump}
              className="w-16 h-14 rounded-xl bg-[#2DD4BF]/90 border-2 border-[#14B8A6] text-black font-pixel text-xs font-bold active:scale-95 shadow-lg"
            >
              JUMP
            </button>
          </div>
        </div>
      </div>

      {/* 4. DOM ACCESSIBILITY LIST TOGGLE */}
      <div className="w-full max-w-4xl mt-3 flex items-center justify-between text-xs text-slate-400">
        <button
          type="button"
          onClick={() => setShowStepsList((prev) => !prev)}
          className="flex items-center gap-1.5 hover:text-white cursor-pointer font-mono text-[11px]"
        >
          {showStepsList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showStepsList ? 'Hide platform steps list' : 'Show steps list (accessible read-out)'}</span>
        </button>

        <button
          type="button"
          onClick={handleToggleSimpleMode}
          className="text-teal-400 hover:text-teal-300 font-mono text-[11px] underline cursor-pointer"
        >
          Switch to Simple Card Mode
        </button>
      </div>

      {showStepsList && (
        <div className="w-full max-w-4xl mt-2 p-3 bg-[#0D1122] border border-[#20284A] rounded-xl text-left space-y-2">
          <div className="text-[11px] font-mono text-[#F5C542]">Available Platforms (Full Text):</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
            {platformSlots.map((slot, idx) => (
              <div key={slot.id} className="p-2 rounded bg-[#131930] border border-[#222B4E]">
                <span className="font-mono text-[10px] text-teal-400 block mb-0.5">Platform #{idx + 1}:</span>
                <p className="font-semibold">{slot.item.label}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">{slot.item.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. BLOCKING WRONG PANEL */}
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
                : 'That step comes later in the sequence.'}
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

      {/* 6. BLOCKING SEQUENCE COMPLETE PANEL */}
      {blockingRoundComplete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#14182E] border-2 border-emerald-500 rounded-2xl p-6 shadow-2xl animate-fade-in text-left">
            <div className="flex items-center gap-2.5 text-emerald-400 font-pixel text-xs mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>SEQUENCE COMPLETE!</span>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              All stages of <strong className="text-white">{currentRound.title}</strong> have been assembled in order.
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
              Continue (Enter)
            </button>
          </div>
        </div>
      )}

      {/* 7. PAUSE OVERLAY */}
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

      {/* 8. INFO & SETTINGS MODAL */}
      {isInfoOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#14182E] border-2 border-[#2F3E70] rounded-2xl p-6 text-left shadow-2xl">
            <h3 className="font-pixel text-xs text-[#F5C542] mb-3">PROCESS PLATFORMER</h3>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Leap across platforms to put the stages of this process in order.
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside mb-4">
              <li><strong>Move:</strong> Arrow keys or A/D keys.</li>
              <li><strong>Jump:</strong> Up arrow, W, or Spacebar.</li>
              <li><strong>Choose:</strong> Stand on a platform for a moment (600ms).</li>
              <li><strong>Hint:</strong> Press H to pulse the next platform.</li>
              <li><strong>Simple Mode:</strong> Prefer tapping cards instead of jumping? Toggle below.</li>
            </ul>

            <div className="pt-3 border-t border-[#232F55] mb-4 flex items-center justify-between">
              <span className="text-xs text-slate-300 font-semibold">Simple Card Mode:</span>
              <button
                type="button"
                onClick={handleToggleSimpleMode}
                className={`px-3 py-1 rounded text-xs font-mono font-bold cursor-pointer border ${
                  simpleMode
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-[#18213D] border-[#2E3C6C] text-slate-300'
                }`}
              >
                {simpleMode ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

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
