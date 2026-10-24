import React, { useState } from 'react';
import { resetMasteryProgress } from '../services/masteryStore.ts';
import { X, RotateCcw, AlertTriangle, Check, ShieldAlert } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetSuccess?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onResetSuccess,
}) => {
  const [confirmStep, setConfirmStep] = useState(false);
  const [showDoneMessage, setShowDoneMessage] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    resetMasteryProgress();
    setConfirmStep(false);
    setShowDoneMessage(true);
    setTimeout(() => {
      setShowDoneMessage(false);
      onResetSuccess?.();
      onClose();
    }, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#0F1326] border-2 border-[#2B355A] shadow-2xl p-6 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1E2644] pb-3 mb-4">
          <h2 id="settings-dialog-title" className="font-pixel text-sm sm:text-base text-white">
            SETTINGS & MASTERY
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {showDoneMessage ? (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center text-emerald-400 mb-2">
              <Check className="w-6 h-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-white">Mastery Progress Reset!</p>
            <p className="text-xs text-slate-400">All concept nodes have returned to unexplored.</p>
          </div>
        ) : !confirmStep ? (
          <div className="space-y-5">
            <div className="p-3.5 rounded-xl bg-[#0A0D1B] border border-[#1C2340]">
              <div className="flex items-start gap-3">
                <RotateCcw className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Reset Mastery Progress</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Resets all concept mastery scores (0–100), answer histories, and weak-concept flags back to unattempted.
                    Your uploaded course and PDF structure will stay intact.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-pixel-dark px-4 py-2 rounded-lg text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setConfirmStep(true)}
                className="btn-pixel-red px-4 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset Mastery</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-200 text-xs leading-relaxed flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong className="block font-bold text-red-100 mb-1">Are you sure?</strong>
                This action is irreversible. All your current scores and streak stats across every chapter will be set back to zero.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmStep(false)}
                className="btn-pixel-dark px-4 py-2 rounded-lg text-xs font-semibold text-slate-300"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="btn-pixel-red px-4 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow"
              >
                <span>Yes, Reset Progress</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
