import React, { useState, useEffect } from 'react';
import { Question, QuestionAnswerRecord, LevelResult, Level } from '../types/course.ts';
import { playSound } from '../services/soundEffects.ts';
import { calculateStars, calculateXpEarned } from '../services/progressService.ts';
import { recordAnswer } from '../services/masteryStore.ts';
import { Heart, Volume2, VolumeX, Pause, Play, CheckCircle2, XCircle, ArrowRight, BookOpen } from 'lucide-react';

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
  const [startTime, setStartTime] = useState(Date.now());
  const [answers, setAnswers] = useState<QuestionAnswerRecord[]>([]);

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  useEffect(() => {
    setStartTime(Date.now());
    setSelectedOption(null);
    setIsAnswered(false);
    setShowExplanation(false);
  }, [currentIndex]);

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
    <div className="w-full max-w-3xl mx-auto px-4 py-6 flex flex-col items-center">
      {/* HUD Bar */}
      <div className="w-full bg-[#12162B] border-2 border-[#232A47] rounded-xl p-3 sm:p-4 mb-4 flex items-center justify-between gap-3 shadow-lg">
        {/* Lives */}
        <div className="flex items-center gap-1.5" aria-label={`Lives: ${practiceMode ? 'Practice mode' : livesLeft}`}>
          {practiceMode ? (
            <span className="text-xs font-pixel text-[#2DD4BF]">Practice</span>
          ) : (
            [1, 2, 3].map((heart) => (
              <Heart
                key={heart}
                className={`w-5 h-5 transition-transform ${
                  heart <= livesLeft
                    ? 'text-red-500 fill-red-500 animate-pulse'
                    : 'text-slate-600 fill-transparent'
                }`}
              />
            ))
          )}
        </div>

        {/* Progress & Streak */}
        <div className="flex items-center gap-3 text-xs sm:text-sm font-mono">
          <span className="text-slate-300">
            Q <strong className="text-white">{currentIndex + 1}</strong>/{questions.length}
          </span>
          {streak > 1 && (
            <span className="text-[#F5C542] font-pixel text-[11px] bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
              Streak x{streak}
            </span>
          )}
          <span className="font-semibold text-white">
            Score: <span className="text-[#F5C542]">{score}</span>
          </span>
        </div>

        {/* Mute & Quit */}
        <div className="flex items-center gap-2">
          {onToggleMute && (
            <button
              type="button"
              onClick={onToggleMute}
              className="p-1.5 rounded hover:bg-[#1C2344] text-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#F5C542]"
              aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-[#2DD4BF]" />}
            </button>
          )}
          <button
            type="button"
            onClick={onQuit}
            className="text-xs text-slate-400 hover:text-red-400 px-2 py-1 rounded transition-colors"
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
      <div className="w-full dungeon-card p-6 sm:p-8 bg-[#12162B] border-2 border-[#232A47] rounded-xl shadow-2xl mb-5">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <span className="uppercase text-[#2DD4BF] font-semibold">{currentQ.difficulty} Challenge</span>
          <span>Page {currentQ.page}</span>
        </div>

        <h2 className="text-base sm:text-xl font-bold text-white mb-6 leading-relaxed">
          {currentQ.question}
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {currentQ.options.map((option, idx) => {
            const letter = ['A', 'B', 'C'][idx];
            const isChosen = selectedOption === idx;
            const isThisCorrect = idx === currentQ.correctIndex;

            let btnClass = 'bg-[#161B33] border-[#2A345B] text-slate-200 hover:border-[#F5C542] hover:bg-[#1B2240]';
            if (isAnswered) {
              if (isThisCorrect) {
                btnClass = 'bg-emerald-950/90 border-[#22C55E] text-emerald-200 shadow-[0_0_12px_rgba(34,197,94,0.3)]';
              } else if (isChosen) {
                btnClass = 'bg-red-950/90 border-[#EF4444] text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.3)]';
              } else {
                btnClass = 'bg-[#101426] border-[#1E2540] text-slate-500 opacity-60';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSelectOption(idx)}
                className={`w-full p-4 rounded-lg border-2 text-left flex items-start gap-3 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542] ${btnClass}`}
              >
                <span className="w-6 h-6 rounded bg-[#0A0D1B] font-mono text-xs font-bold text-[#F5C542] flex items-center justify-center border border-[#2E3A68] flex-shrink-0">
                  {letter}
                </span>
                <span className="text-sm sm:text-base font-medium flex-1 pt-0.5 leading-snug">
                  {option}
                </span>
                {isAnswered && isThisCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] flex-shrink-0 mt-0.5" />
                )}
                {isAnswered && isChosen && !isThisCorrect && (
                  <XCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Why Button (when answered correctly and explanation not already expanded) */}
        {isAnswered && selectedOption === currentQ.correctIndex && !showExplanation && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowExplanation(true)}
              className="text-xs text-[#2DD4BF] hover:underline flex items-center gap-1 font-semibold"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Why is this right?</span>
            </button>
          </div>
        )}

        {/* Explanation Panel (Shown on wrong answer or when user clicks 'Why?') */}
        {showExplanation && (
          <div className="mt-5 p-4 rounded-lg bg-[#0B0F20] border-2 border-amber-500/50 animate-in fade-in duration-150">
            <p className="text-xs font-bold text-[#F5C542] mb-1 uppercase tracking-wider">
              {selectedOption === currentQ.correctIndex ? 'Explanation' : 'Correction & Explanation'}
            </p>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-3">
              {currentQ.explanation}
            </p>
            <div className="pt-2 border-t border-[#1C2545] text-xs text-teal-300 flex items-center justify-between">
              <span className="italic font-serif">&ldquo;{currentQ.sourceQuote}&rdquo;</span>
              <span className="font-mono text-teal-400 font-semibold ml-2">Page {currentQ.page}</span>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => advanceNext(answers, score, bestStreak, livesLeft)}
                className="btn-pixel-gold px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
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
