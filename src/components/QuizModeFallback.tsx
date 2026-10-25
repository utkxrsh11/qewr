import React, { useState, useEffect } from 'react';
import { Question, QuestionAnswerRecord, LevelResult, Level } from '../types/course.ts';
import { playSound } from '../services/soundEffects.ts';
import { calculateStars, calculateXpEarned } from '../services/progressService.ts';
import { recordAnswer } from '../services/masteryStore.ts';
import { Heart, Volume2, VolumeX, Pause, Play, CheckCircle2, XCircle, ArrowRight, BookOpen, Clock } from 'lucide-react';

interface QuizModeFallbackProps {
  questions: Question[];
  level: Level;
  practiceMode?: boolean;
  muted?: boolean;
  onToggleMute?: () => void;
  onFinish: (result: LevelResult) => void;
  onQuit: () => void;
}

export const QuizModeFallback: React.FC<QuizModeFallbackProps> = ({
  questions,
  level,
  practiceMode = false,
  muted = false,
  onToggleMute,
  onFinish,
  onQuit,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [livesLeft, setLivesLeft] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [startTime, setStartTime] = useState(Date.now());
  const [answers, setAnswers] = useState<QuestionAnswerRecord[]>([]);

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  useEffect(() => {
    setIsReady(false);
    setTimeLeft(60);
    setSelectedOption(null);
    setIsAnswered(false);
    setShowExplanation(false);
  }, [currentIndex]);

  // 60-second countdown timer once user clicks Ready
  useEffect(() => {
    if (!isReady || isAnswered) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-select wrong answer if time expires
          handleSelectOption(currentQ?.correctIndex === 0 ? 1 : 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isReady, isAnswered, currentQ]);

  const handleReady = () => {
    playSound('select');
    setIsReady(true);
    setStartTime(Date.now());
    setTimeLeft(60);
  };

  const handleSelectOption = (index: number) => {
    if (isAnswered || !currentQ) return;

    const timeSpent = Date.now() - startTime;
    const isCorrect = index === currentQ.correctIndex;
    setSelectedOption(index);
    setIsAnswered(true);

    // Deterministic Mastery Store record
    recordAnswer(currentQ.conceptId, isCorrect, {
      timeMs: timeSpent,
      questionId: currentQ.id,
      difficulty: currentQ.difficulty,
    });

    let nextLives = livesLeft;
    let nextScore = score;
    let nextStreak = streak;

    if (isCorrect) {
      playSound('correct');
      const streakBonus = Math.min(100, Math.max(0, (streak - 1) * 25));
      nextScore += 100 + streakBonus;
      nextStreak += 1;
      setScore(nextScore);
      setStreak(nextStreak);
      setBestStreak((prev) => Math.max(prev, nextStreak));
    } else {
      playSound('wrong');
      nextStreak = 0;
      setStreak(0);
      if (!practiceMode) {
        nextLives = Math.max(0, livesLeft - 1);
        setLivesLeft(nextLives);
      }
      setShowExplanation(true);
    }

    const newRecord: QuestionAnswerRecord = {
      questionId: currentQ.id,
      conceptId: currentQ.conceptId,
      chosenIndex: index,
      correct: isCorrect,
      timeMs: timeSpent,
    };

    const updatedAnswers = [...answers, newRecord];
    setAnswers(updatedAnswers);

    // If out of lives
    if (!practiceMode && nextLives <= 0) {
      setTimeout(() => {
        finishLevel(updatedAnswers, nextScore, Math.max(bestStreak, nextStreak), 0, 'out_of_lives');
      }, 1200);
      return;
    }

    // Auto advance on correct answer after 1.5 seconds if user hasn't clicked why
    if (isCorrect && !showExplanation) {
      setTimeout(() => {
        if (!showExplanation) {
          advanceNext(updatedAnswers, nextScore, Math.max(bestStreak, nextStreak), nextLives);
        }
      }, 1400);
    }
  };

  const advanceNext = (
    currentAnswers: QuestionAnswerRecord[],
    currentScore: number,
    currentBestStreak: number,
    currentLives: number
  ) => {
    if (isLast) {
      finishLevel(currentAnswers, currentScore, currentBestStreak, currentLives, 'completed');
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const finishLevel = (
    finalAnswers: QuestionAnswerRecord[],
    finalScore: number,
    finalBestStreak: number,
    finalLives: number,
    status: 'completed' | 'out_of_lives'
  ) => {
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

  if (!currentQ) return null;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 flex flex-col items-center select-none">
      {/* HUD Bar */}
      <div className="w-full bg-[#10131A] border-2 border-[#202636] rounded-xl p-3 sm:p-4 mb-4 flex items-center justify-between gap-3 shadow-lg">
        {/* Lives */}
        <div className="flex items-center gap-1.5" aria-label={`Lives: ${practiceMode ? 'Practice mode' : livesLeft}`}>
          {practiceMode ? (
            <span className="text-xs font-pixel text-[#38BDF8] bg-sky-950/80 px-2 py-0.5 rounded border border-sky-500/40">
              Practice
            </span>
          ) : (
            [1, 2, 3].map((heart) => (
              <Heart
                key={heart}
                className={`w-5 h-5 transition-transform ${
                  heart <= livesLeft
                    ? 'text-[#FF1376] fill-[#FF1376] drop-shadow-[0_0_8px_rgba(255,19,118,0.6)]'
                    : 'text-slate-700 fill-transparent'
                }`}
              />
            ))
          )}
        </div>

        {/* 60s Countdown Timer Badge */}
        {isReady ? (
          <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold bg-[#08090C] px-3 py-1 rounded-lg border border-[#202636]">
            <Clock className={`w-4 h-4 ${timeLeft <= 15 ? 'text-[#FF1376] animate-pulse' : 'text-[#38BDF8]'}`} />
            <span className={timeLeft <= 15 ? 'text-[#FF1376] font-bold' : 'text-slate-100'}>
              {timeLeft}s remaining
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[#38BDF8] bg-[#08090C] px-2.5 py-1 rounded-lg border border-[#0284C7]/40">
            <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>60s on Ready</span>
          </div>
        )}

        {/* Progress & Streak */}
        <div className="flex items-center gap-3 text-xs sm:text-sm font-mono">
          <span className="text-slate-300">
            Q <strong className="text-white font-bold">{currentIndex + 1}</strong>/{questions.length}
          </span>
          {streak > 1 && (
            <span className="text-[#FF4D9E] font-pixel text-[11px] bg-rose-950/60 px-2 py-0.5 rounded border border-[#FF1376]/50">
              Streak x{streak}
            </span>
          )}
          <span className="font-semibold text-white">
            Score: <span className="text-[#38BDF8] font-bold">{score}</span>
          </span>
        </div>

        {/* Mute & Quit */}
        <div className="flex items-center gap-2">
          {onToggleMute && (
            <button
              type="button"
              onClick={onToggleMute}
              className="p-1.5 rounded hover:bg-[#161A24] text-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0284C7]"
              aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-[#38BDF8]" />}
            </button>
          )}
          <button
            type="button"
            onClick={onQuit}
            className="text-xs text-slate-400 hover:text-[#FF1376] px-2 py-1 rounded transition-colors"
          >
            Quit
          </button>
        </div>
      </div>

      {/* Screen Reader Live Announcement */}
      <div className="sr-only" aria-live="polite">
        {isAnswered
          ? selectedOption === currentQ.correctIndex
            ? 'Correct answer! +100 points.'
            : `Wrong answer. The correct answer was ${currentQ.options[currentQ.correctIndex]}.`
          : `Question ${currentIndex + 1}: ${currentQ.question}`}
      </div>

      {/* Question Card */}
      <div className="w-full dungeon-card p-6 sm:p-8 bg-[#10131A] border-2 border-[#202636] rounded-xl shadow-2xl mb-5">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <span className="uppercase text-[#38BDF8] font-bold tracking-wider">{currentQ.difficulty} Challenge</span>
          <span>Page {currentQ.page}</span>
        </div>

        <h2 className="text-base sm:text-xl font-bold text-white mb-4 leading-relaxed">
          {currentQ.question}
        </h2>

        {/* 60s Progress Bar (when ready) */}
        {isReady && !isAnswered && (
          <div className="w-full bg-[#08090C] border border-[#202636] rounded-full h-2 mb-6 overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                timeLeft <= 15
                  ? 'bg-gradient-to-r from-[#FF1376] to-[#E11D48] animate-pulse'
                  : 'bg-gradient-to-r from-[#0284C7] to-[#38BDF8]'
              }`}
              style={{
                width: `${Math.max(0, Math.min(100, (timeLeft / 60) * 100))}%`,
              }}
            />
          </div>
        )}

        {/* READY STAGE (Question shown first, options hidden until Ready) */}
        {!isReady ? (
          <div className="p-6 sm:p-8 rounded-xl bg-[#08090C] border-2 border-[#202636] flex flex-col items-center text-center animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-[#0284C7]/15 border border-[#0284C7]/50 flex items-center justify-center text-[#38BDF8] mb-3 shadow-[0_0_16px_rgba(2,132,199,0.25)]">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-pixel text-xs sm:text-sm text-white mb-2 tracking-wider">
              QUESTION PRESENTED
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-5 leading-relaxed font-sans">
              Read the question carefully above. When you are ready to reveal the choices and select your answer, click <strong>READY</strong> to start the <strong>60-second</strong> challenge.
            </p>
            <button
              type="button"
              onClick={handleReady}
              className="btn-pixel-cerulean px-8 py-3.5 rounded-xl font-pixel text-xs sm:text-sm flex items-center gap-3 cursor-pointer hover:scale-103 transition-transform"
              autoFocus
            >
              <Play className="w-4 h-4 fill-current" />
              <span>READY · REVEAL OPTIONS (60s)</span>
            </button>
          </div>
        ) : (
          /* OPTIONS REVEALED */
          <div className="space-y-3 animate-in fade-in duration-200">
            {currentQ.options.map((option, idx) => {
              const letter = ['A', 'B', 'C'][idx];
              const isChosen = selectedOption === idx;
              const isThisCorrect = idx === currentQ.correctIndex;

              let btnClass = 'bg-[#121622] border-[#202636] text-slate-200 hover:border-[#0284C7] hover:bg-[#161D2B]';
              if (isAnswered) {
                if (isThisCorrect) {
                  btnClass = 'bg-emerald-950/90 border-[#10B981] text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]';
                } else if (isChosen) {
                  btnClass = 'bg-rose-950/90 border-[#FF1376] text-rose-200 shadow-[0_0_12px_rgba(255,19,118,0.3)]';
                } else {
                  btnClass = 'bg-[#08090C] border-[#181E2B] text-slate-600 opacity-60';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full p-4 rounded-lg border-2 text-left flex items-start gap-3 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] ${btnClass}`}
                >
                  <span className="w-6 h-6 rounded bg-[#08090C] font-mono text-xs font-bold text-[#38BDF8] flex items-center justify-center border border-[#202636] flex-shrink-0">
                    {letter}
                  </span>
                  <span className="text-sm sm:text-base font-medium flex-1 pt-0.5 leading-snug">
                    {option}
                  </span>
                  {isAnswered && isThisCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
                  )}
                  {isAnswered && isChosen && !isThisCorrect && (
                    <XCircle className="w-5 h-5 text-[#FF1376] flex-shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Why Button (when answered correctly and explanation not already expanded) */}
        {isAnswered && selectedOption === currentQ.correctIndex && !showExplanation && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowExplanation(true)}
              className="text-xs text-[#38BDF8] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Why is this right?</span>
            </button>
          </div>
        )}

        {/* Explanation Panel (Shown on wrong answer or when user clicks 'Why?') */}
        {showExplanation && (
          <div className="mt-5 p-4 rounded-lg bg-[#08090C] border-2 border-[#0284C7]/50 animate-in fade-in duration-150">
            <p className="text-xs font-bold text-[#38BDF8] mb-1 uppercase tracking-wider">
              {selectedOption === currentQ.correctIndex ? 'Explanation' : 'Correction & Explanation'}
            </p>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-3 font-sans">
              {currentQ.explanation}
            </p>
            <div className="pt-2 border-t border-[#202636] text-xs text-sky-300 flex items-center justify-between">
              <span className="italic font-serif">&ldquo;{currentQ.sourceQuote}&rdquo;</span>
              <span className="font-mono text-[#38BDF8] font-semibold ml-2">Page {currentQ.page}</span>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => advanceNext(answers, score, bestStreak, livesLeft)}
                className="btn-pixel-cerulean px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
