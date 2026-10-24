import React, { useEffect, useRef } from 'react';
import { FalseStatement, Statement } from '../../types/course.ts';
import { CheckCircle2, AlertCircle, ArrowRight, BookOpen, Quote, Sparkles } from 'lucide-react';

interface CaseSolvedPanelProps {
  falseStatement: FalseStatement;
  pageNumber: number;
  sourceQuote: string;
  isLastRound: boolean;
  isGameOverOutOfLives?: boolean;
  scoreGained: number;
  streak: number;
  onContinue: () => void;
}

export const CaseSolvedPanel: React.FC<CaseSolvedPanelProps> = ({
  falseStatement,
  pageNumber,
  sourceQuote,
  isLastRound,
  isGameOverOutOfLives = false,
  scoreGained,
  streak,
  onContinue,
}) => {
  const continueBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Auto-focus continue button for immediate Enter key continuation
    continueBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onContinue]);

  // Construct highlighted false statement and corrected statement
  const renderAlteredStatement = () => {
    const text = falseStatement.text;
    const altered = falseStatement.alteredPart;

    if (!altered || !text.toLowerCase().includes(altered.toLowerCase())) {
      return <span className="line-through text-red-400">{text}</span>;
    }

    const startIdx = text.toLowerCase().indexOf(altered.toLowerCase());
    const before = text.slice(0, startIdx);
    const target = text.slice(startIdx, startIdx + altered.length);
    const after = text.slice(startIdx + altered.length);

    return (
      <span>
        {before}
        <span className="line-through decoration-red-500 decoration-2 text-red-400 bg-red-950/70 px-1 py-0.5 rounded font-bold">
          {target}
        </span>
        {after}
      </span>
    );
  };

  const renderCorrectedStatement = () => {
    const original = falseStatement.original;
    const truePart = falseStatement.truePart;

    if (!truePart || !original.toLowerCase().includes(truePart.toLowerCase())) {
      return <span className="text-emerald-300">{original}</span>;
    }

    const startIdx = original.toLowerCase().indexOf(truePart.toLowerCase());
    const before = original.slice(0, startIdx);
    const target = original.slice(startIdx, startIdx + truePart.length);
    const after = original.slice(startIdx + truePart.length);

    return (
      <span>
        {before}
        <span className="text-emerald-300 bg-emerald-950/70 px-1 py-0.5 rounded font-bold underline decoration-emerald-400 decoration-2">
          {target}
        </span>
        {after}
      </span>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-solved-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-xl bg-[#0F1426] border-2 border-[#F5C542] rounded-xl p-5 sm:p-7 shadow-[0_0_40px_rgba(245,197,66,0.3)] flex flex-col gap-4 text-left max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#242F55]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-amber-950/80 border border-[#F5C542] flex items-center justify-center text-[#F5C542]">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="case-solved-title" className="font-pixel text-sm sm:text-base text-[#F5C542]">
                {isGameOverOutOfLives ? 'CASE REVEALED' : 'CASE SOLVED!'}
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
                {isGameOverOutOfLives ? 'Out of lives — here was the deception' : 'The lie has been exposed'}
              </p>
            </div>
          </div>

          {!isGameOverOutOfLives && scoreGained > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/60 border border-amber-500/40 text-xs font-mono font-bold text-[#F5C542]">
              <span>+{scoreGained} PTS</span>
              {streak > 1 && <span className="text-amber-300">({streak}x)</span>}
            </div>
          )}
        </div>

        {/* 1. The Lie */}
        <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-500/40">
          <div className="text-[11px] font-mono text-red-400 font-bold uppercase tracking-wider mb-1">
            TAMPERED LIE (DISPROVED):
          </div>
          <p className="text-sm text-slate-200 leading-relaxed font-sans">{renderAlteredStatement()}</p>
        </div>

        {/* 2. The Truth */}
        <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/40">
          <div className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider mb-1">
            ACTUAL FACT (ORIGINAL MATERIAL):
          </div>
          <p className="text-sm text-slate-200 leading-relaxed font-sans">{renderCorrectedStatement()}</p>
        </div>

        {/* 3. Teacher Explanation */}
        <div className="p-3.5 rounded-lg bg-[#141B33] border border-[#2B3760]">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            WHY IT MATTERS:
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{falseStatement.explanation}</p>
        </div>

        {/* 4. Page citation & Source quote */}
        <div className="p-3 rounded-lg bg-[#0C101F] border border-[#1E2644] text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-300 font-mono mb-1">
            <BookOpen className="w-3.5 h-3.5 text-[#F5C542]" aria-hidden="true" />
            <span>From the PDF: Page {pageNumber}</span>
          </div>
          <p className="italic text-slate-400 pl-5 border-l-2 border-[#2B3760] leading-relaxed">
            &ldquo;{sourceQuote}&rdquo;
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            ref={continueBtnRef}
            type="button"
            onClick={onContinue}
            className="btn-pixel-gold w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
          >
            <span>
              {isGameOverOutOfLives
                ? 'See results'
                : isLastRound
                ? 'See results'
                : 'Next case (Enter)'}
            </span>
            <ArrowRight className="w-4 h-4 text-black" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface CardVerifiedPanelProps {
  verifiedStatement: Statement;
  pageNumber: number;
  onContinue: () => void;
}

export const CardVerifiedPanel: React.FC<CardVerifiedPanelProps> = ({
  verifiedStatement,
  pageNumber,
  onContinue,
}) => {
  const continueBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    continueBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onContinue]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verified-panel-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
    >
      <div className="w-full max-w-md bg-[#0F1426] border-2 border-emerald-500 rounded-xl p-5 sm:p-6 shadow-[0_0_30px_rgba(34,197,94,0.25)] flex flex-col gap-3 text-left">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#242F55]">
          <div className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-500 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 id="verified-panel-title" className="font-pixel text-xs text-emerald-400">
              ACCUSATION REJECTED
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              That statement is accurate.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#141B33] border border-[#2B3760]">
          <p className="text-xs text-slate-300 italic mb-2 leading-relaxed">
            &ldquo;{verifiedStatement.text}&rdquo;
          </p>
          <div className="pt-2 border-t border-[#232C4E] text-[11px] font-mono text-slate-400">
            <span className="text-emerald-400 font-semibold">Verified basis quote: </span>
            <span>&ldquo;{verifiedStatement.basis}&rdquo;</span>
            <span className="ml-2 text-slate-500">(Page {pageNumber})</span>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          This card is now locked as verified. You lost 1 life. Look closely at the remaining suspect cards!
        </p>

        <div className="pt-2 flex justify-end">
          <button
            ref={continueBtnRef}
            type="button"
            onClick={onContinue}
            className="btn-pixel-teal w-full sm:w-auto px-5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
          >
            <span>Keep investigating (Enter)</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
