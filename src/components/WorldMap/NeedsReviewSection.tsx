import React from 'react';
import { Course, Concept, Chapter } from '../../types/course.ts';
import { getWeakConcepts, WeakConceptItem } from '../../services/masteryStore.ts';
import { AlertTriangle, Play, Sparkles, BookOpen, Clock } from 'lucide-react';

interface NeedsReviewSectionProps {
  course: Course;
  onPracticeConcept: (concept: Concept, chapter: Chapter) => void;
}

export const NeedsReviewSection: React.FC<NeedsReviewSectionProps> = ({
  course,
  onPracticeConcept,
}) => {
  const weakConcepts: WeakConceptItem[] = getWeakConcepts(course);

  if (weakConcepts.length === 0) {
    return (
      <div className="mb-6 p-4 rounded-xl bg-[#10192A]/70 border border-[#1E2E4A] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-emerald-300">
              Retention In Good Standing
            </h3>
            <p className="text-xs text-slate-400">
              No concepts currently meet review distress criteria. Keep adventuring through the map!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="needs-review-heading"
      className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#181124] to-[#12162B] border-2 border-red-900/60 shadow-[0_4px_25px_rgba(239,68,68,0.15)]"
    >
      <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-950 border border-red-500/70 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-4 h-4 animate-pulse" aria-hidden="true" />
          </div>
          <div>
            <h2 id="needs-review-heading" className="text-sm font-bold text-red-200 tracking-wide font-pixel">
              PRIORITY REVIEW
            </h2>
            <p className="text-xs text-slate-400">
              Reinforce these concepts before retention decays further.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-700/60">
          {weakConcepts.length} {weakConcepts.length === 1 ? 'Concept' : 'Concepts'} Flagged
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {weakConcepts.map(({ concept, chapter, mastery, reason }) => (
          <div
            key={concept.id}
            className="p-3.5 rounded-xl bg-[#0D1122]/90 border border-red-900/50 hover:border-red-500/70 transition-all flex flex-col justify-between gap-3 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span className="truncate max-w-[140px] text-teal-400">{chapter.title}</span>
                <span className="px-1.5 py-0.2 bg-red-950 text-red-300 rounded border border-red-800 text-[10px] font-bold">
                  {mastery}% Mastery
                </span>
              </div>

              <h3 className="text-sm font-semibold text-white line-clamp-1 mb-1" title={concept.name}>
                {concept.name}
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{reason}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1F2642]">
              <span className="text-[10px] font-mono text-slate-400">Page {concept.page}</span>

              <button
                type="button"
                onClick={() => onPracticeConcept(concept, chapter)}
                className="btn-pixel-gold px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow"
                aria-label={`Review now: ${concept.name}`}
              >
                <Play className="w-3 h-3 fill-current text-black" aria-hidden="true" />
                <span>Review Now</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
