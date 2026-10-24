import React, { useState } from 'react';
import { Concept } from '../types/course.ts';
import { Quote, ChevronDown, ChevronUp, Layers, CheckCircle2 } from 'lucide-react';

interface ConceptCardProps {
  concept: Concept;
}

export const ConceptCard: React.FC<ConceptCardProps> = ({ concept }) => {
  const [showSource, setShowSource] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // Type badge styling
  const getTypeBadge = () => {
    switch (concept.type) {
      case 'fact':
        return {
          label: 'Fact',
          classes: 'bg-teal-950/80 text-[#2DD4BF] border border-teal-500/40',
          dot: 'bg-[#2DD4BF]',
        };
      case 'process':
        return {
          label: 'Process',
          classes: 'bg-amber-950/80 text-[#F5C542] border border-amber-500/40',
          dot: 'bg-[#F5C542]',
        };
      case 'detail':
        return {
          label: 'Detail',
          classes: 'bg-purple-950/80 text-[#C084FC] border border-purple-500/40',
          dot: 'bg-[#C084FC]',
        };
      default:
        return {
          label: 'Fact',
          classes: 'bg-slate-900 text-slate-300 border border-slate-700',
          dot: 'bg-slate-400',
        };
    }
  };

  const badge = getTypeBadge();

  return (
    <article
      className="dungeon-card p-4 sm:p-5 flex flex-col justify-between relative group"
      aria-label={`Concept: ${concept.name}`}
    >
      <div>
        {/* Top Meta Header: Type badge & Page tag */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${badge.classes}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
            {badge.label}
          </span>

          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#1B213D] text-slate-300 border border-[#2B355E]">
            Page {concept.page}
          </span>
        </div>

        {/* Concept Name */}
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mb-2 leading-snug group-hover:text-[#F5C542] transition-colors">
          {concept.name}
        </h3>

        {/* Concept Summary */}
        <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 mb-4">
          {concept.summary}
        </p>

        {/* Process Steps Accordion (if type is process and steps exist) */}
        {concept.type === 'process' && concept.steps && concept.steps.length > 0 && (
          <div className="mb-3 pt-2 border-t border-[#1F2642]">
            <button
              type="button"
              onClick={() => setShowSteps(!showSteps)}
              className="w-full flex items-center justify-between py-1 text-xs font-semibold text-[#F5C542] hover:text-amber-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542] rounded"
              aria-expanded={showSteps}
            >
              <span className="inline-flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Process Steps ({concept.steps.length})</span>
              </span>
              {showSteps ? (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>

            {showSteps && (
              <ol className="mt-2 space-y-1.5 bg-[#0D1021] p-2.5 rounded border border-[#222A4A] text-xs text-slate-300">
                {concept.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-4 h-4 rounded bg-[#1C2344] text-[#F5C542] font-mono text-[10px] font-bold flex items-center justify-center border border-amber-500/30">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      {/* Source Quote Section with Toggle */}
      <div className="pt-3 border-t border-[#1C223D] mt-2">
        <button
          type="button"
          onClick={() => setShowSource(!showSource)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded px-1 -mx-1 py-0.5"
          aria-expanded={showSource}
          aria-label={`${showSource ? 'Hide' : 'Show'} source quote for ${concept.name}`}
        >
          <Quote className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
          <span>{showSource ? 'Hide source quote' : 'Show source'}</span>
          {showSource ? (
            <ChevronUp className="w-3 h-3 ml-0.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-0.5" aria-hidden="true" />
          )}
        </button>

        {showSource && (
          <div className="mt-2 p-2.5 rounded bg-[#0A0D1A] border-l-2 border-teal-500/60 border-y border-r border-[#1B223B] text-xs italic text-teal-200/90 leading-relaxed font-sans">
            &ldquo;{concept.sourceQuote}&rdquo;
          </div>
        )}
      </div>
    </article>
  );
};
