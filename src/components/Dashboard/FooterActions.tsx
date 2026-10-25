import React, { useState } from 'react';
import { Course, StudyQuestProgress } from '../../types/course.ts';
import { Download, Trash2, Sparkles, AlertTriangle, X } from 'lucide-react';
import { downloadProgressReport } from '../../services/progressService.ts';

interface FooterActionsProps {
  course: Course;
  progress: StudyQuestProgress;
  onResetProgress: () => void;
  onSeedDemo: () => void;
  onClearAllProgress?: () => void;
  isDebugMode: boolean;
}

export const FooterActions: React.FC<FooterActionsProps> = ({
  course,
  progress,
  onResetProgress,
  onSeedDemo,
  onClearAllProgress,
  isDebugMode,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-[#1F2748] text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => downloadProgressReport(course, progress)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#2B355E] bg-[#141A33] hover:bg-[#1C2548] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Download progress report</span>
          </button>

          {isDebugMode && (
            <>
              <button
                type="button"
                onClick={onSeedDemo}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-purple-600/50 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 transition-colors cursor-pointer"
                title="Seed realistic demo data for testing (?debug=1)"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Seed demo progress</span>
              </button>

              <button
                type="button"
                onClick={onClearAllProgress || onResetProgress}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-800/50 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 transition-colors cursor-pointer"
                title="Clear all progress (?debug=1)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear all progress</span>
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowConfirmReset(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-red-500/50 hover:border-red-500 bg-transparent text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer ml-auto"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
          <span>Reset progress</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmReset && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm rounded-2xl border-2 border-red-600/60 bg-[#141221] p-6 shadow-2xl text-left">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-pixel text-sm text-white">Reset Progress?</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  This clears XP, stars, and review history for this course. Your course stays.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="px-4 py-2 rounded-lg border border-[#2B355E] bg-[#141A33] hover:bg-[#1C2548] text-slate-300 text-xs font-mono transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmReset(false);
                  onResetProgress();
                }}
                className="btn-pixel-red px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
              >
                Reset Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
