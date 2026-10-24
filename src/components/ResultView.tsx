import React, { useState, useEffect } from 'react';
import {
  LevelResult,
  Question,
  LieHunterRound,
  LieHunterAnswer,
  FalseStatement,
  Statement,
} from '../types/course.ts';
import {
  Star,
  Award,
  RotateCcw,
  ArrowRight,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  Quote,
  Compass,
  FileSearch,
  Gamepad2,
  AlertCircle,
} from 'lucide-react';

interface ResultViewProps {
  result: LevelResult;
  hasNextLevel: boolean;
  onPlayAgain: () => void;
  onNextLevel: () => void;
  onBackToCourse: () => void;
  onReviewConcepts: () => void;
  onOpenWorldMap?: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  result,
  hasNextLevel,
  onPlayAgain,
  onNextLevel,
  onBackToCourse,
  onReviewConcepts,
  onOpenWorldMap,
}) => {
  const [animatedXp, setAnimatedXp] = useState(0);

  const isLieHunter = result.gameId === 'lieHunter' || Boolean(result.rounds && result.rounds.length > 0);

  // Count-up animation for XP earned
  useEffect(() => {
    if (result.practiceMode || result.xpEarned <= 0) {
      setAnimatedXp(0);
      return;
    }

    let start = 0;
    const target = result.xpEarned;
    const duration = 800; // ms
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      setAnimatedXp(Math.round(progress * target));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [result.xpEarned, result.practiceMode]);

  // Concept performance breakdown
  const conceptBreakdown = result.level.concepts.map((concept) => {
    const conceptAnswers = result.answers.filter((a) => a.conceptId === concept.id);
    const correctCount = conceptAnswers.filter((a) => a.correct).length;
    const totalCount = isLieHunter ? 2 : Math.max(3, conceptAnswers.length);

    let color = 'text-[#EF4444] border-red-500/40 bg-red-950/40';
    let indicator = 'bg-[#EF4444]';

    if (isLieHunter) {
      if (correctCount === 2) {
        color = 'text-[#22C55E] border-emerald-500/40 bg-emerald-950/40';
        indicator = 'bg-[#22C55E]';
      } else if (correctCount === 1) {
        color = 'text-[#F5C542] border-amber-500/40 bg-amber-950/40';
        indicator = 'bg-[#F5C542]';
      }
    } else {
      if (correctCount === totalCount) {
        color = 'text-[#22C55E] border-emerald-500/40 bg-emerald-950/40';
        indicator = 'bg-[#22C55E]';
      } else if (correctCount >= 2) {
        color = 'text-[#F5C542] border-amber-500/40 bg-amber-950/40';
        indicator = 'bg-[#F5C542]';
      }
    }

    return {
      concept,
      correctCount,
      totalCount,
      color,
      indicator,
    };
  });

  // Runner mistakes to review
  const wrongRunnerQuestions: Array<{ q: Question; chosenIndex: number }> = [];
  if (!isLieHunter && Array.isArray(result.questions)) {
    const wrongAnswers = result.answers.filter((a) => !a.correct);
    wrongAnswers.forEach((ans: any) => {
      const match = result.questions?.find((q) => q.id === ans.questionId);
      if (match) {
        wrongRunnerQuestions.push({ q: match, chosenIndex: ans.chosenIndex });
      }
    });
  }

  // Lie Hunter mistakes & hinted rounds to review
  interface LieHunterReviewItem {
    round: LieHunterRound;
    answer: LieHunterAnswer;
    accusedStatement?: Statement;
    falseStatement: FalseStatement;
    isHintedOnly: boolean;
  }

  const lieHunterMistakes: LieHunterReviewItem[] = [];
  if (isLieHunter && Array.isArray(result.rounds)) {
    result.answers.forEach((ans: any) => {
      // Review if wrong first accusation OR hinted
      if (!ans.correct || ans.hinted) {
        const round = result.rounds?.find((r) => r.id === ans.itemId);
        if (round) {
          const falseStmt = round.statements.find((s) => s.isFalse) as FalseStatement;
          const accused = round.statements.find((s) => s.id === ans.chosenId);
          const isHintedOnly = ans.hinted && ans.attempts === 1 && accused?.isFalse;
          lieHunterMistakes.push({
            round,
            answer: ans as LieHunterAnswer,
            accusedStatement: accused,
            falseStatement: falseStmt,
            isHintedOnly: Boolean(isHintedOnly),
          });
        }
      }
    });
  }

  // Status Banner Details
  const getBannerDetails = () => {
    if (result.practiceMode) {
      return {
        text: 'Practice Complete',
        class: 'text-[#2DD4BF] border-[#2DD4BF]/50 bg-teal-950/50',
      };
    }
    if (result.status === 'out_of_lives' || result.status === 'outOfLives') {
      return {
        text: 'Out of Lives',
        class: 'text-[#EF4444] border-[#EF4444]/50 bg-red-950/50',
      };
    }
    return {
      text: 'Level Complete!',
      class: 'text-[#F5C542] border-[#F5C542]/50 bg-amber-950/50',
    };
  };

  const banner = getBannerDetails();

  // Highlight helper for altered and true parts
  const renderAlteredText = (falseStmt: FalseStatement) => {
    const text = falseStmt.text;
    const altered = falseStmt.alteredPart;
    if (!altered || !text.toLowerCase().includes(altered.toLowerCase())) {
      return <span className="line-through text-red-400">{text}</span>;
    }
    const idx = text.toLowerCase().indexOf(altered.toLowerCase());
    return (
      <span>
        {text.slice(0, idx)}
        <span className="line-through decoration-red-500 decoration-2 text-red-400 bg-red-950/70 px-1 py-0.5 rounded font-bold">
          {text.slice(idx, idx + altered.length)}
        </span>
        {text.slice(idx + altered.length)}
      </span>
    );
  };

  const renderCorrectedText = (falseStmt: FalseStatement) => {
    const orig = falseStmt.original;
    const truePart = falseStmt.truePart;
    if (!truePart || !orig.toLowerCase().includes(truePart.toLowerCase())) {
      return <span className="text-emerald-300">{orig}</span>;
    }
    const idx = orig.toLowerCase().indexOf(truePart.toLowerCase());
    return (
      <span>
        {orig.slice(0, idx)}
        <span className="text-emerald-300 bg-emerald-950/70 px-1 py-0.5 rounded font-bold underline decoration-emerald-400 decoration-2">
          {orig.slice(idx, idx + truePart.length)}
        </span>
        {orig.slice(idx + truePart.length)}
      </span>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col items-center">
      {/* 1. Status Banner */}
      <div className={`w-full py-4 px-6 rounded-xl border-2 text-center shadow-xl mb-4 ${banner.class}`}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="font-pixel text-xl sm:text-2xl md:text-3xl tracking-wide uppercase drop-shadow-sm">
            {banner.text}
          </h1>
        </div>

        {/* Game Mode Chip near title */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0C101F] border border-[#232B4C] text-[11px] font-mono text-slate-300 mb-1">
          {isLieHunter ? (
            <>
              <FileSearch className="w-3.5 h-3.5 text-[#F5C542]" />
              <span className="font-bold text-[#F5C542]">Lie Hunter</span>
            </>
          ) : (
            <>
              <Gamepad2 className="w-3.5 h-3.5 text-[#2DD4BF]" />
              <span className="font-bold text-[#2DD4BF]">Concept Runner</span>
            </>
          )}
        </div>

        <p className="text-xs font-mono text-slate-300">
          {result.level.chapterTitle} · Level {result.level.levelNumber}
        </p>
      </div>

      {/* 2. Large Pixel Stars (0 to 3) */}
      <div
        className="flex items-center justify-center gap-3 sm:gap-4 mb-6"
        aria-label={`Stars earned: ${result.stars} of 3`}
      >
        {[1, 2, 3].map((starIdx) => {
          const isFilled = starIdx <= result.stars;
          return (
            <div
              key={starIdx}
              className={`p-3 sm:p-4 rounded-xl border-2 transition-all transform ${
                isFilled
                  ? 'bg-amber-950/80 border-[#F5C542] text-[#F5C542] shadow-[0_0_20px_rgba(245,197,66,0.35)] scale-105'
                  : 'bg-[#101426] border-[#202747] text-slate-600'
              }`}
            >
              <Star
                className={`w-8 h-8 sm:w-10 sm:h-10 ${isFilled ? 'fill-[#F5C542]' : 'fill-transparent'}`}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>

      {/* 3. Stats Row */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3.5 rounded-lg bg-[#12162B] border border-[#232A47] text-center">
          <p className="text-[11px] font-mono text-slate-400 uppercase">Score</p>
          <p className="text-xl sm:text-2xl font-bold text-white font-mono">{result.score}</p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#12162B] border border-[#232A47] text-center">
          <p className="text-[11px] font-mono text-slate-400 uppercase">Accuracy</p>
          <p className="text-xl sm:text-2xl font-bold text-[#2DD4BF] font-mono">
            {result.accuracyPercent}%
          </p>
          <p className="text-[10px] text-slate-400">
            {result.correctCount}/{result.totalQuestions || result.answers.length}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#12162B] border border-[#232A47] text-center">
          <p className="text-[11px] font-mono text-slate-400 uppercase">Best Streak</p>
          <p className="text-xl sm:text-2xl font-bold text-[#F5C542] font-mono">
            {result.bestStreak}x
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#12162B] border border-[#232A47] text-center">
          <p className="text-[11px] font-mono text-slate-400 uppercase">XP Earned</p>
          <p className="text-xl sm:text-2xl font-bold text-[#F5C542] font-mono flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4 text-[#F5C542]" />
            <span>{result.practiceMode ? 0 : animatedXp}</span>
          </p>
          {result.practiceMode && <p className="text-[10px] text-slate-500">Practice</p>}
        </div>
      </div>

      {/* 4. Concepts Review Section */}
      <div className="w-full bg-[#12162B] border-2 border-[#232A47] rounded-xl p-5 mb-6 shadow-lg">
        <h2 className="text-xs font-pixel text-[#F5C542] mb-3 uppercase tracking-wider">
          Concepts Review
        </h2>

        <div className="space-y-2.5">
          {conceptBreakdown.map((item) => (
            <div
              key={item.concept.id}
              className="p-3 rounded-lg bg-[#0C0F1F] border border-[#1E2542] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full ${item.indicator} shrink-0`} />
                <span className="text-sm font-semibold text-white truncate">{item.concept.name}</span>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                  (Page {item.concept.page})
                </span>
              </div>

              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${item.color}`}>
                {isLieHunter
                  ? `${item.correctCount}/2 cases solved first try`
                  : `${item.correctCount}/${item.totalCount} correct`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Mistakes to Review Section */}
      <div className="w-full bg-[#12162B] border-2 border-[#232A47] rounded-xl p-5 mb-8 shadow-lg">
        <h2 className="text-xs font-pixel text-[#EF4444] mb-3 uppercase tracking-wider">
          Mistakes to Review
        </h2>

        {/* LIE HUNTER FORMAT */}
        {isLieHunter ? (
          lieHunterMistakes.length === 0 ? (
            <div className="p-4 rounded-lg bg-[#0B151F] border border-[#143247] text-center text-xs sm:text-sm text-[#2DD4BF] font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>No mistakes. Great job!</span>
            </div>
          ) : (
            <div className="space-y-4">
              {lieHunterMistakes.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-[#0C0F1F] border border-[#302133] text-left space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-[#212845] pb-1.5">
                    <span className="font-bold text-[#F5C542]">
                      Case {idx + 1} ({item.round.difficulty} case)
                    </span>
                    <span className="text-teal-400">Page {item.round.page}</span>
                  </div>

                  {/* Wrong accusation (omitted for hinted-only) */}
                  {!item.isHintedOnly && item.accusedStatement && !item.accusedStatement.isFalse && (
                    <div className="text-xs p-2.5 rounded bg-red-950/30 border border-red-500/30 text-red-300">
                      <span className="font-bold text-red-400 uppercase block mb-0.5 font-mono text-[10px]">
                        You Accused (Actually True):
                      </span>
                      &ldquo;{item.accusedStatement.text}&rdquo;
                    </div>
                  )}

                  {/* The Lie */}
                  <div className="text-xs p-2.5 rounded bg-[#181220] border border-[#422336] text-slate-200">
                    <span className="font-bold text-red-400 uppercase block mb-0.5 font-mono text-[10px]">
                      The Lie Was:
                    </span>
                    {renderAlteredText(item.falseStatement)}
                  </div>

                  {/* Correct Version */}
                  <div className="text-xs p-2.5 rounded bg-[#0E1B1E] border border-[#1E433C] text-slate-200">
                    <span className="font-bold text-emerald-400 uppercase block mb-0.5 font-mono text-[10px]">
                      Correct Version:
                    </span>
                    {renderCorrectedText(item.falseStatement)}
                  </div>

                  {/* Explanation */}
                  <p className="text-xs text-slate-300 bg-[#060914] p-2.5 rounded border border-[#1C223D] leading-relaxed">
                    {item.falseStatement.explanation}
                  </p>

                  {/* Source quote */}
                  <div className="text-[11px] text-teal-300 italic pt-1 pl-3 border-l-2 border-teal-500/40">
                    From the PDF (Page {item.round.page}): &ldquo;{item.round.sourceQuote}&rdquo;
                  </div>
                </div>
              ))}
            </div>
          )
        ) : /* CONCEPT RUNNER FORMAT */
        wrongRunnerQuestions.length === 0 ? (
          <div className="p-4 rounded-lg bg-[#0B151F] border border-[#143247] text-center text-xs sm:text-sm text-[#2DD4BF] font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>No mistakes. Great job!</span>
          </div>
        ) : (
          <div className="space-y-3">
            {wrongRunnerQuestions.map(({ q, chosenIndex }, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-[#0C0F1F] border border-[#2A1B28] text-left">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                  <span>Question {idx + 1}</span>
                  <span className="text-teal-400">Page {q.page}</span>
                </div>

                <p className="text-sm font-semibold text-white mb-2 leading-snug">{q.question}</p>

                <div className="text-xs space-y-1 mb-2">
                  <p className="text-red-400 font-medium">
                    &bull; Your choice: {['A', 'B', 'C'][chosenIndex]}: {q.options[chosenIndex]}
                  </p>
                  <p className="text-emerald-400 font-semibold">
                    &bull; Correct answer: {['A', 'B', 'C'][q.correctIndex]}: {q.options[q.correctIndex]}
                  </p>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-[#060914] p-2.5 rounded border border-[#1C223D] mb-2 font-sans">
                  {q.explanation}
                </p>

                <div className="text-[11px] text-teal-300 italic">&ldquo;{q.sourceQuote}&rdquo;</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Navigation Buttons */}
      <div className="w-full flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {/* Next level button */}
        {hasNextLevel && result.stars >= 1 && (
          <button
            type="button"
            onClick={onNextLevel}
            className="btn-pixel-gold px-6 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
          >
            <span>Next level</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>
        )}

        {/* Play again */}
        <button
          type="button"
          onClick={onPlayAgain}
          className="btn-pixel-teal px-5 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-black" />
          <span>Play again</span>
        </button>

        {/* Review concepts */}
        <button
          type="button"
          onClick={onReviewConcepts}
          className="btn-pixel-dark px-5 py-3 rounded-lg text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2 cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-[#F5C542]" />
          <span>Review concepts</span>
        </button>

        {/* World Map */}
        {onOpenWorldMap && (
          <button
            type="button"
            onClick={onOpenWorldMap}
            className="btn-pixel-teal px-5 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Compass className="w-4 h-4 text-[#2DD4BF]" />
            <span>World Map</span>
          </button>
        )}

        {/* Back to course */}
        <button
          type="button"
          onClick={onBackToCourse}
          className="btn-pixel-dark px-5 py-3 rounded-lg text-xs sm:text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to course</span>
        </button>
      </div>
    </div>
  );
};
