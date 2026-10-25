import React, { useState, useEffect } from 'react';
import {
  LevelResult,
  Question,
  LieHunterRound,
  PlatformerRound,
  FalseStatement,
  SegmentResultInfo,
  StepAnswer,
} from '../types/course.ts';
import { GAME_REGISTRY } from '../services/gameRegistry.ts';
import {
  Star,
  RotateCcw,
  ArrowRight,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Quote,
  Compass,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  BarChart2,
} from 'lucide-react';

interface ResultViewProps {
  result: LevelResult;
  hasNextLevel: boolean;
  onPlayAgain: () => void;
  onNextLevel: () => void;
  onBackToCourse: () => void;
  onReviewConcepts: () => void;
  onOpenWorldMap?: () => void;
  onOpenDashboard?: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  result,
  hasNextLevel,
  onPlayAgain,
  onNextLevel,
  onBackToCourse,
  onReviewConcepts,
  onOpenWorldMap,
  onOpenDashboard,
}) => {
  const [animatedXp, setAnimatedXp] = useState(0);

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

  // Concept performance breakdown with game icon
  const conceptBreakdown = result.level.concepts.map((concept) => {
    const conceptAnswers = result.answers.filter((a) => a.conceptId === concept.id);
    const correctCount = conceptAnswers.filter((a) => a.correct).length;
    const totalCount = Math.max(1, conceptAnswers.length);

    // Identify game for concept
    const conceptGameId = (conceptAnswers[0] as any)?.gameId || result.gameId || 'runner';
    const game = GAME_REGISTRY[conceptGameId as keyof typeof GAME_REGISTRY] || GAME_REGISTRY.runner;

    let color = 'text-[#EF4444] border-red-500/40 bg-red-950/40';
    let indicator = 'bg-[#EF4444]';

    if (correctCount === totalCount) {
      color = 'text-[#22C55E] border-emerald-500/40 bg-emerald-950/40';
      indicator = 'bg-[#22C55E]';
    } else if (correctCount > 0) {
      color = 'text-[#F5C542] border-amber-500/40 bg-amber-950/40';
      indicator = 'bg-[#F5C542]';
    }

    return {
      concept,
      game,
      correctCount,
      totalCount,
      color,
      indicator,
    };
  });

  // 1. Concept Runner mistakes
  const wrongRunnerQuestions: Array<{ q: Question; chosenIndex: number }> = [];
  if (Array.isArray(result.questions)) {
    const runnerAnswers = result.answers.filter((a: any) => a.gameId === 'runner' || a.questionId);
    runnerAnswers.forEach((ans: any) => {
      if (!ans.correct) {
        const match = result.questions?.find((q) => q.id === (ans.questionId || ans.itemId));
        if (match) {
          wrongRunnerQuestions.push({ q: match, chosenIndex: ans.chosenIndex ?? 0 });
        }
      }
    });
  }

  // 2. Lie Hunter mistakes
  const lieHunterMistakes: Array<{
    round: LieHunterRound;
    falseStatement: FalseStatement;
    accusedStatement?: any;
    isHintedOnly?: boolean;
  }> = [];

  if (Array.isArray(result.rounds)) {
    const lhAnswers = result.answers.filter((a: any) => a.gameId === 'lieHunter');
    lhAnswers.forEach((ans: any) => {
      if (!ans.correct) {
        const round = result.rounds?.find((r) => r.id === ans.itemId);
        if (round) {
          const falseStatement = round.statements.find((s) => s.isFalse) as FalseStatement;
          const accusedStatement = round.statements.find((s) => s.id === ans.chosenId);
          lieHunterMistakes.push({
            round,
            falseStatement,
            accusedStatement,
            isHintedOnly: Boolean(ans.hinted && ans.attempts <= 1),
          });
        }
      }
    });
  }

  // 3. Process Platformer mistakes & hinted steps
  const platformerMistakes: Array<{
    conceptName: string;
    chosenLabel: string;
    stepNumber: number;
    correctLabel: string;
    explanation: string;
    page: number;
    sourceQuote: string;
    isDecoy: boolean;
    whyNot?: string;
  }> = [];

  const platformerHintedSteps: Array<{
    conceptName: string;
    stepNumber: number;
    stepLabel: string;
    explanation: string;
  }> = [];

  if (Array.isArray(result.platformerRounds)) {
    const pAnswers = result.answers.filter((a: any) => a.gameId === 'platformer') as StepAnswer[];

    pAnswers.forEach((ans) => {
      // Find round and step
      let matchingRound: PlatformerRound | undefined;
      let stepIndex = -1;

      for (const r of result.platformerRounds || []) {
        const idx = r.steps.findIndex((s) => s.id === ans.itemId);
        if (idx !== -1) {
          matchingRound = r;
          stepIndex = idx;
          break;
        }
      }

      if (!matchingRound || stepIndex === -1) return;
      const concept = result.level.concepts.find((c) => c.id === matchingRound?.conceptId);
      const conceptName = concept?.name || 'Process';
      const correctStep = matchingRound.steps[stepIndex];

      // Was it a mistake?
      if (!ans.correct && ans.attempts > 1) {
        const isDecoy = matchingRound.decoy && ans.chosenId === matchingRound.decoy.id;
        const chosenStep = matchingRound.steps.find((s) => s.id === ans.chosenId);
        const chosenLabel = isDecoy
          ? matchingRound.decoy?.label || 'Decoy'
          : chosenStep?.label || 'Another step';

        platformerMistakes.push({
          conceptName,
          chosenLabel,
          stepNumber: stepIndex + 1,
          correctLabel: correctStep.label,
          explanation: correctStep.explanation,
          page: matchingRound.page,
          sourceQuote: matchingRound.sourceQuote,
          isDecoy: Boolean(isDecoy),
          whyNot: matchingRound.decoy?.whyNot,
        });
      }

      // Was it hinted?
      if (ans.hinted) {
        platformerHintedSteps.push({
          conceptName,
          stepNumber: stepIndex + 1,
          stepLabel: correctStep.label,
          explanation: correctStep.explanation,
        });
      }
    });
  }

  const hasAnyMistakes =
    wrongRunnerQuestions.length > 0 ||
    lieHunterMistakes.length > 0 ||
    platformerMistakes.length > 0;

  const renderAlteredText = (fs: FalseStatement) => {
    if (!fs.alteredPart || !fs.text.includes(fs.alteredPart)) {
      return <span>&ldquo;{fs.text}&rdquo;</span>;
    }
    const parts = fs.text.split(fs.alteredPart);
    return (
      <span>
        &ldquo;{parts[0]}
        <span className="text-[#EF4444] font-bold underline decoration-wavy decoration-[#EF4444]">
          {fs.alteredPart}
        </span>
        {parts.slice(1).join(fs.alteredPart)}&rdquo;
      </span>
    );
  };

  const renderCorrectedText = (fs: FalseStatement) => {
    if (!fs.original) return null;
    if (!fs.truePart || !fs.original.includes(fs.truePart)) {
      return <span>&ldquo;{fs.original}&rdquo;</span>;
    }
    const parts = fs.original.split(fs.truePart);
    return (
      <span>
        &ldquo;{parts[0]}
        <span className="text-[#22C55E] font-bold">{fs.truePart}</span>
        {parts.slice(1).join(fs.truePart)}&rdquo;
      </span>
    );
  };

  const isOutOfLives = result.status === 'outOfLives' || result.status === 'out_of_lives';
  const isRevision = Boolean(result.isRevision || result.level?.isRevision);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col items-center select-none font-sans">
      {/* 1. Header with Result Title & Stars */}
      <div className="w-full text-center mb-6">
        {isRevision ? (
          <>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-[#F5C542] text-[11px] font-pixel tracking-wider uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#F5C542]" />
              Smart Revision
            </div>
            <h1 className="font-pixel text-lg sm:text-2xl text-[#F5C542] mb-2 uppercase">
              {isOutOfLives
                ? 'Out of Lives'
                : result.practiceMode
                ? 'Practice Complete'
                : 'Revision Complete!'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-mono mb-2">
              Session rating: {result.accuracyPercent}% accuracy
            </p>

            {/* Stars Display labeled "Session rating" */}
            <div className="flex flex-col items-center gap-1.5 my-3">
              <span className="text-[10px] font-pixel text-slate-400 tracking-wider uppercase">
                Session rating
              </span>
              <div className="flex items-center justify-center gap-3">
                {[1, 2, 3].map((starIdx) => {
                  const earned = starIdx <= result.stars;
                  return (
                    <div
                      key={starIdx}
                      className={`p-2.5 rounded-2xl border-2 transition-all duration-300 ${
                        earned
                          ? 'bg-[#182348] border-[#F5C542] shadow-[0_0_20px_rgba(245,197,66,0.35)] scale-105'
                          : 'bg-[#0E1224] border-[#202742] opacity-40 scale-95'
                      }`}
                    >
                      <Star
                        className={`w-7 h-7 sm:w-9 sm:h-9 ${
                          earned ? 'text-[#F5C542] fill-[#F5C542]' : 'text-slate-600'
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-pixel text-lg sm:text-2xl text-[#F5C542] mb-3 uppercase">
              {isOutOfLives ? 'Out of Lives' : result.stars >= 1 ? 'Level Complete!' : 'Try Again'}
            </h1>

            <p className="text-sm text-slate-300 font-mono">
              Level {result.level.levelNumber}: {result.level.chapterTitle}
            </p>

            {/* 3-Star Rating Row */}
            <div className="flex items-center justify-center gap-3 my-4">
              {[1, 2, 3].map((starIdx) => {
                const earned = starIdx <= result.stars;
                return (
                  <div
                    key={starIdx}
                    className={`p-2.5 rounded-2xl border-2 transition-all duration-300 ${
                      earned
                        ? 'bg-[#182348] border-[#F5C542] shadow-[0_0_20px_rgba(245,197,66,0.35)] scale-105'
                        : 'bg-[#0E1224] border-[#202742] opacity-40 scale-95'
                    }`}
                  >
                    <Star
                      className={`w-7 h-7 sm:w-9 sm:h-9 ${
                        earned ? 'text-[#F5C542] fill-[#F5C542]' : 'text-slate-600'
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 2. Challenges Row (One chip per segment per Section 9) */}
      {result.segments && result.segments.length > 0 && (
        <div className="w-full mb-6">
          <div className="text-[11px] font-mono text-slate-400 uppercase mb-2 text-left">
            Challenges Completed:
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {result.segments.map((seg, idx) => {
              const game = GAME_REGISTRY[seg.gameId];
              const GameIcon = game.icon;
              const isNotReached = seg.status === 'notReached';

              return (
                <div
                  key={idx}
                  className={`px-3.5 py-2 rounded-xl border flex items-center gap-2.5 text-xs shadow-md ${
                    isNotReached
                      ? 'bg-[#0E1222] border-[#1C2542] text-slate-500'
                      : 'bg-[#121832] border-[#25325C] text-slate-200'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                      isNotReached
                        ? 'bg-slate-900 text-slate-600'
                        : 'bg-teal-950/80 border border-teal-500/40 text-[#2DD4BF]'
                    }`}
                  >
                    <GameIcon className="w-3.5 h-3.5" />
                  </div>

                  <span className="font-semibold text-white">{game.name}</span>

                  <span
                    className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                      isNotReached
                        ? 'bg-slate-900 text-slate-500'
                        : seg.itemsCorrect === seg.itemsTotal
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {isNotReached ? 'Not reached' : `${seg.itemsCorrect}/${seg.itemsTotal} correct`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Core Stats Grid */}
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
        </div>
      </div>

      {/* 3b. Revision Strength Changes (Spaced Repetition Impact) */}
      {isRevision && result.strengthChanges && result.strengthChanges.length > 0 && (
        <div
          role="region"
          aria-live="polite"
          aria-label="Concept strength changes and exam readiness update"
          className="w-full bg-gradient-to-b from-[#18152B] to-[#12162B] border-2 border-amber-500/40 rounded-xl p-5 mb-6 shadow-lg text-left"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-[#252E54]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#F5C542]" />
              <h2 className="text-xs font-pixel text-[#F5C542] uppercase tracking-wider">
                Strength Changes
              </h2>
            </div>

            {/* Overall readiness before and after */}
            <div className="text-xs font-mono font-bold text-slate-200">
              Exam readiness{' '}
              <span className="text-slate-400">
                {(result as any).readinessBefore !== undefined
                  ? (result as any).readinessBefore
                  : Math.max(0, Math.round(result.accuracyPercent * 0.8))}%
              </span>{' '}
              to{' '}
              <span className="text-emerald-400">
                {(result as any).readinessAfter !== undefined
                  ? (result as any).readinessAfter
                  : Math.min(100, Math.round(result.accuracyPercent * 0.95))}%
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            {result.strengthChanges.map((sc) => {
              const bPct = Math.round(sc.before * 100);
              const aPct = Math.round(sc.after * 100);
              const deltaPct = aPct - bPct;

              // Arrow indicator
              const isUp = deltaPct > 0;
              const isDown = deltaPct < 0;

              // State chip: mastered (>=80), shaky (>=50), weak (<50)
              let stateChip = { label: 'Weak', cls: 'bg-red-950/80 text-red-300 border-red-500/40' };
              if (sc.after >= 0.8) {
                stateChip = { label: 'Mastered', cls: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' };
              } else if (sc.after >= 0.5) {
                stateChip = { label: 'Shaky', cls: 'bg-amber-950/80 text-amber-300 border-amber-500/40' };
              }

              // Next review in N days from dueAt
              const dueMs = new Date(sc.nextDueAt).getTime();
              const diffDays = Math.max(1, Math.round((dueMs - Date.now()) / (86400 * 1000)));

              return (
                <div
                  key={sc.conceptId}
                  className="p-3 rounded-lg bg-[#0C0F1F] border border-[#242A4A] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">
                        {sc.conceptName}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] border ${stateChip.cls}`}>
                        {stateChip.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Next review in {diffDays} {diffDays === 1 ? 'day' : 'days'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                      <span className="text-slate-400">{bPct}%</span>
                      {isUp && <span className="text-emerald-400 font-bold">↑</span>}
                      {isDown && <span className="text-red-400 font-bold">↓</span>}
                      {!isUp && !isDown && <span className="text-slate-500">=</span>}
                      <span className="text-white">{aPct}%</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[11px] border ${
                        isUp
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-600/50'
                          : isDown
                          ? 'bg-red-950 text-red-300 border-red-600/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {isUp ? `+${deltaPct}%` : `${deltaPct}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Concepts Review Section (with Game Icon per Section 9) */}
      <div className="w-full bg-[#12162B] border-2 border-[#232A47] rounded-xl p-5 mb-6 shadow-lg text-left">
        <h2 className="text-xs font-pixel text-[#F5C542] mb-3 uppercase tracking-wider">
          Concepts Review
        </h2>

        <div className="space-y-2.5">
          {conceptBreakdown.map((item) => {
            const GameIcon = item.game.icon;
            return (
              <div
                key={item.concept.id}
                className="p-3 rounded-lg bg-[#0C0F1F] border border-[#1E2542] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.indicator} shrink-0`} />
                  {/* Game Icon next to concept name per Section 9 */}
                  <span
                    className="w-5 h-5 rounded bg-slate-900 border border-slate-700 text-teal-400 flex items-center justify-center shrink-0"
                    title={item.game.name}
                  >
                    <GameIcon className="w-3 h-3" />
                  </span>
                  <span className="text-sm font-semibold text-white truncate">{item.concept.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                    (Page {item.concept.page})
                  </span>
                </div>

                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${item.color}`}>
                  {item.correctCount}/{item.totalCount} correct
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Mistakes to Review Section */}
      <div className="w-full bg-[#12162B] border-2 border-[#232A47] rounded-xl p-5 mb-8 shadow-lg text-left">
        <h2 className="text-xs font-pixel text-[#EF4444] mb-3 uppercase tracking-wider">
          Mistakes to Review
        </h2>

        {!hasAnyMistakes ? (
          <div className="p-4 rounded-lg bg-[#0B151F] border border-[#143247] text-center text-xs sm:text-sm text-[#2DD4BF] font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>No mistakes. Outstanding performance!</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Platformer Mistakes */}
            {platformerMistakes.map((pm, idx) => (
              <div key={`plat-${idx}`} className="p-4 rounded-lg bg-[#0C0F1F] border border-[#3A1E2E] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-[#212845] pb-1.5">
                  <span className="font-bold text-[#F5C542]">{pm.conceptName}</span>
                  <span className="text-teal-400">Page {pm.page}</span>
                </div>

                {pm.isDecoy ? (
                  <div className="text-xs p-2.5 rounded bg-red-950/30 border border-red-500/30 text-red-300">
                    <span className="font-bold text-red-400 block mb-0.5 font-mono text-[10px] uppercase">
                      Decoy Mistake:
                    </span>
                    &ldquo;{pm.chosenLabel}&rdquo; does not belong in this process.
                    {pm.whyNot && <p className="text-slate-300 mt-1 italic">{pm.whyNot}</p>}
                  </div>
                ) : (
                  <div className="text-xs p-2.5 rounded bg-red-950/30 border border-red-500/30 text-red-300">
                    <span className="font-bold text-red-400 block mb-0.5 font-mono text-[10px] uppercase">
                      Ordering Mistake:
                    </span>
                    You placed &ldquo;{pm.chosenLabel}&rdquo; as step {pm.stepNumber}, but step {pm.stepNumber} is &ldquo;{pm.correctLabel}&rdquo;.
                  </div>
                )}

                <p className="text-xs text-slate-300 bg-[#060914] p-2.5 rounded border border-[#1C223D]">
                  {pm.explanation}
                </p>

                <div className="text-[11px] text-teal-300 italic pt-1 pl-3 border-l-2 border-teal-500/40">
                  From the PDF (Page {pm.page}): &ldquo;{pm.sourceQuote}&rdquo;
                </div>
              </div>
            ))}

            {/* Lie Hunter Mistakes */}
            {lieHunterMistakes.map((item, idx) => (
              <div key={`lh-${idx}`} className="p-4 rounded-lg bg-[#0C0F1F] border border-[#302133] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-[#212845] pb-1.5">
                  <span className="font-bold text-[#F5C542]">
                    Case {idx + 1} ({item.round.difficulty} case)
                  </span>
                  <span className="text-teal-400">Page {item.round.page}</span>
                </div>

                {!item.isHintedOnly && item.accusedStatement && !item.accusedStatement.isFalse && (
                  <div className="text-xs p-2.5 rounded bg-red-950/30 border border-red-500/30 text-red-300">
                    <span className="font-bold text-red-400 uppercase block mb-0.5 font-mono text-[10px]">
                      You Accused (Actually True):
                    </span>
                    &ldquo;{item.accusedStatement.text}&rdquo;
                  </div>
                )}

                <div className="text-xs p-2.5 rounded bg-[#181220] border border-[#422336] text-slate-200">
                  <span className="font-bold text-red-400 uppercase block mb-0.5 font-mono text-[10px]">
                    The Lie Was:
                  </span>
                  {renderAlteredText(item.falseStatement)}
                </div>

                <div className="text-xs p-2.5 rounded bg-[#0E1B1E] border border-[#1E433C] text-slate-200">
                  <span className="font-bold text-emerald-400 uppercase block mb-0.5 font-mono text-[10px]">
                    Correct Version:
                  </span>
                  {renderCorrectedText(item.falseStatement)}
                </div>

                <p className="text-xs text-slate-300 bg-[#060914] p-2.5 rounded border border-[#1C223D]">
                  {item.falseStatement.explanation}
                </p>

                <div className="text-[11px] text-teal-300 italic pt-1 pl-3 border-l-2 border-teal-500/40">
                  From the PDF (Page {item.round.page}): &ldquo;{item.round.sourceQuote}&rdquo;
                </div>
              </div>
            ))}

            {/* Runner Mistakes */}
            {wrongRunnerQuestions.map(({ q, chosenIndex }, idx) => (
              <div key={`run-${idx}`} className="p-4 rounded-lg bg-[#0C0F1F] border border-[#2A1B28] text-left">
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

            {/* Separate group: Steps you needed a hint for */}
            {platformerHintedSteps.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#232F55]">
                <div className="flex items-center gap-1.5 text-amber-300 text-xs font-mono font-bold mb-2.5">
                  <Lightbulb className="w-4 h-4 text-[#F5C542]" />
                  <span>Steps you needed a hint for:</span>
                </div>
                <div className="space-y-2">
                  {platformerHintedSteps.map((hs, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-[#181D14] border border-[#3E4522] text-xs text-slate-200"
                    >
                      <span className="font-mono text-amber-300 font-bold block mb-0.5">
                        {hs.conceptName} — Step {hs.stepNumber}: {hs.stepLabel}
                      </span>
                      <p className="text-slate-400 text-[11px]">{hs.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Navigation Buttons */}
      <div className="w-full flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {isRevision ? (
          <>
            <button
              type="button"
              onClick={onPlayAgain}
              className="btn-pixel-gold px-6 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <RotateCcw className="w-4 h-4 text-black" />
              <span>Revise again</span>
            </button>

            {onOpenDashboard && (
              <button
                type="button"
                onClick={onOpenDashboard}
                className="btn-pixel-dark px-5 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer hover:border-[#F5C542]"
              >
                <BarChart2 className="w-4 h-4 text-[#F5C542]" />
                <span>Back to dashboard</span>
              </button>
            )}

            {onOpenWorldMap && (
              <button
                type="button"
                onClick={onOpenWorldMap}
                className="btn-pixel-teal px-5 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-slate-900" />
                <span>Back to map</span>
              </button>
            )}

            <button
              type="button"
              onClick={onBackToCourse}
              className="btn-pixel-dark px-5 py-3 rounded-lg text-xs sm:text-sm font-medium text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              <span>Back to course</span>
            </button>
          </>
        ) : (
          <>
            {onOpenDashboard && (
              <button
                type="button"
                onClick={onOpenDashboard}
                className="btn-pixel-gold px-6 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <BarChart2 className="w-4 h-4 text-black" />
                <span>Dashboard</span>
              </button>
            )}

            {hasNextLevel && result.stars >= 1 && (
              <button
                type="button"
                onClick={onNextLevel}
                className="btn-pixel-gold px-6 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>Next level</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
            )}

            <button
              type="button"
              onClick={onPlayAgain}
              className="btn-pixel-dark px-5 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer hover:border-[#F5C542]"
            >
              <RotateCcw className="w-4 h-4 text-[#F5C542]" />
              <span>Play again</span>
            </button>

            <button
              type="button"
              onClick={onReviewConcepts}
              className="btn-pixel-dark px-5 py-3 rounded-lg text-xs sm:text-sm font-medium text-slate-300 flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#2DD4BF]" />
              <span>Review concepts</span>
            </button>

            {onOpenWorldMap && (
              <button
                type="button"
                onClick={onOpenWorldMap}
                className="btn-pixel-teal px-5 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-slate-900" />
                <span>World Map</span>
              </button>
            )}

            <button
              type="button"
              onClick={onBackToCourse}
              className="btn-pixel-dark px-5 py-3 rounded-lg text-xs sm:text-sm font-medium text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              <span>Back to course</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
