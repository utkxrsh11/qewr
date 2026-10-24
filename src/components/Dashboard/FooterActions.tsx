import React, { useState } from 'react';
import { Download, Trash2, Sparkles, AlertTriangle, X } from 'lucide-react';
import { exportProgressJson } from '../../services/progressService.ts';

interface FooterActionsProps {
  onResetProgress: () => void;
  onSeedDemo: () => void;
  isDebugMode: boolean;
}

export const FooterActions: React.FC<FooterActionsProps> = ({
  onResetProgress,
  onSeedDemo,
  isDebugMode,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1F2748] text-xs font-mono">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportProgressJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#2B355E] bg-[#141A33] hover:bg-[#1C2548] text-slate-300 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export Progress (JSON)</span>
          </button>

          {isDebugMode && (
            <button
              type="button"
              onClick={onSeedDemo}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-purple-600/50 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Seed Demo Progress (?debug=1)</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowConfirmReset(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-900/40 bg-red-950/20 hover:bg-red-900/40 text-red-400 transition-colors cursor-pointer ml-auto"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
          <span>Reset Progress</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmReset && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm rounded-2xl border-2 border-red-600/60 bg-[#141221] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowConfirmReset(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-pixel text-xs text-white">Reset All Progress?</h3>
                <p className="text-[11px] text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              This will erase all XP, level completion stars, mastery history, spaced repetition intervals, and exam target dates.
            </p>

            <div className="flex items-center justify-end gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="px-3 py-1.5 rounded-lg border border-[#2E3A6E] bg-[#161B33] text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmReset(false);
                  onResetProgress();
                }}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                Yes, Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
