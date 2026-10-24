import React, { useState } from 'react';
import { Calendar, Target, X, Check } from 'lucide-react';
import { ExamInfo } from '../../types/course.ts';

interface ExamCountdownModalProps {
  currentInfo: ExamInfo;
  onSave: (info: ExamInfo) => void;
  onClose: () => void;
}

export const ExamCountdownModal: React.FC<ExamCountdownModalProps> = ({
  currentInfo,
  onSave,
  onClose,
}) => {
  const [examDate, setExamDate] = useState(currentInfo.examDate || '');
  const [targetReadiness, setTargetReadiness] = useState(currentInfo.targetReadiness || 85);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      examDate: examDate || undefined,
      targetReadiness: Number(targetReadiness) || 85,
    });
  };

  const handleClear = () => {
    onSave({
      examDate: undefined,
      targetReadiness: 85,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exam-modal-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl border-2 border-[#2B355E] bg-[#12162B] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 id="exam-modal-title" className="font-pixel text-sm text-white">
              Exam Target Planner
            </h2>
            <p className="text-xs text-slate-400">
              Set your target date to calculate daily revision goals
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="exam-date-input" className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
              Exam Date
            </label>
            <input
              id="exam-date-input"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#2E3A6E] bg-[#161B33] text-white font-mono text-sm focus:outline-none focus:border-[#F5C542]"
            />
          </div>

          <div>
            <label htmlFor="readiness-target-input" className="block text-xs font-mono uppercase text-slate-300 mb-1.5">
              Target Readiness ({targetReadiness}%)
            </label>
            <input
              id="readiness-target-input"
              type="range"
              min="50"
              max="100"
              step="5"
              value={targetReadiness}
              onChange={(e) => setTargetReadiness(Number(e.target.value))}
              className="w-full accent-[#F5C542] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>50% Basic</span>
              <span>85% Recommended</span>
              <span>100% Mastery</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#232B4E] flex items-center justify-between gap-3">
            {currentInfo.examDate ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-mono text-red-400 hover:text-red-300 underline cursor-pointer"
              >
                Clear date
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-[#2E3A6E] bg-[#161B33] hover:bg-[#1E2548] text-xs font-mono text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#F5C542] hover:bg-amber-400 text-black font-pixel text-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
