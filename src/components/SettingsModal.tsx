import React, { useState, useEffect } from 'react';
import { Modal } from './common/Modal.tsx';
import { Button } from './common/Button.tsx';
import { ConfirmDialog } from './common/ConfirmDialog.tsx';
import { useToast } from './common/ToastContext.tsx';
import {
  getAudioVolume,
  setAudioVolume,
  isAudioMuted,
  setAudioMuted,
  playSound,
} from '../services/soundEffects.ts';
import {
  getStorageUsageKB,
  clearAllQuestionCaches,
} from '../services/storageManager.ts';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Database,
  Trash2,
  RotateCcw,
  Sliders,
  Type,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetAllProgress?: () => void;
}

export type UiScale = 'normal' | 'large' | 'xlarge';

export function SettingsModal({
  isOpen,
  onClose,
  onResetAllProgress,
}: SettingsModalProps) {
  const { success, info } = useToast();

  const [volume, setVolume] = useState(getAudioVolume());
  const [muted, setMuted] = useState(isAudioMuted());
  const [reducedMotion, setReducedMotion] = useState(() => {
    try {
      return localStorage.getItem('studyquest_reduce_motion') === 'true';
    } catch {
      return false;
    }
  });

  const [uiScale, setUiScale] = useState<UiScale>(() => {
    try {
      const saved = localStorage.getItem('studyquest_ui_scale');
      if (saved === 'large' || saved === 'xlarge') return saved;
    } catch {}
    return 'normal';
  });

  const [storageStats, setStorageStats] = useState(getStorageUsageKB());
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync storage stats on open
  useEffect(() => {
    if (isOpen) {
      setStorageStats(getStorageUsageKB());
    }
  }, [isOpen]);

  // Apply UI scale to root document
  const handleScaleChange = (scale: UiScale) => {
    setUiScale(scale);
    try {
      localStorage.setItem('studyquest_ui_scale', scale);
      if (scale === 'normal') {
        document.documentElement.removeAttribute('data-ui-scale');
      } else {
        document.documentElement.setAttribute('data-ui-scale', scale);
      }
    } catch (e) {
      console.warn('Failed to save UI scale:', e);
    }
    info(`UI Scale set to ${scale.toUpperCase()}`);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    setAudioVolume(val);
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
    if (!next) {
      playSound('click');
    }
  };

  const handleToggleReducedMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    try {
      localStorage.setItem('studyquest_reduce_motion', next ? 'true' : 'false');
    } catch {}
    info(next ? 'Reduced motion enabled' : 'Reduced motion disabled');
  };

  const handleClearCaches = () => {
    const freedKb = clearAllQuestionCaches();
    setStorageStats(getStorageUsageKB());
    success(`Freed ${freedKb} KB of cached challenges.`);
  };

  const handleConfirmReset = () => {
    setShowResetConfirm(false);
    onResetAllProgress?.();
    setStorageStats(getStorageUsageKB());
    success('All learner progress has been reset.');
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="SETTINGS & PREFERENCES" maxWidth="lg">
        <div className="space-y-6 text-slate-200">
          {/* Section: Audio Settings */}
          <div className="p-4 bg-[#0E1224] border border-[#232A47] rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {muted ? (
                  <VolumeX className="w-5 h-5 text-slate-500" />
                ) : (
                  <Volume2 className="w-5 h-5 text-[#F5C542]" />
                )}
                <div>
                  <h3 className="font-pixel text-xs text-white">SOUND & AUDIO</h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Master Web Audio synthesizer volume
                  </p>
                </div>
              </div>
              <Button
                variant={muted ? 'secondary' : 'primary'}
                size="sm"
                onClick={handleToggleMute}
              >
                {muted ? 'Unmute' : 'Mute'}
              </Button>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Master Volume</span>
                <span className="font-bold text-[#F5C542]">{muted ? 'Muted' : `${volume}%`}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                disabled={muted}
                onChange={handleVolumeChange}
                className="w-full accent-[#F5C542] cursor-pointer disabled:opacity-40"
                aria-label="Volume slider"
              />
            </div>
          </div>

          {/* Section: Display & Accessibility */}
          <div className="p-4 bg-[#0E1224] border border-[#232A47] rounded-xl space-y-4">
            <div className="flex items-center gap-2">
              <Type className="w-5 h-5 text-[#2DD4BF]" />
              <div>
                <h3 className="font-pixel text-xs text-white">DISPLAY & ACCESSIBILITY</h3>
                <p className="text-xs text-slate-400 font-sans">
                  Typography scale and motion preferences
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300">UI Scale</label>
              <div className="grid grid-cols-3 gap-2">
                {(['normal', 'large', 'xlarge'] as UiScale[]).map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => handleScaleChange(scale)}
                    className={`py-2 px-3 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer text-center ${
                      uiScale === scale
                        ? 'bg-[#1D2545] text-[#F5C542] border-[#F5C542]/60 shadow-xs'
                        : 'bg-[#141A33] text-slate-400 border-[#232A47] hover:border-slate-500'
                    }`}
                  >
                    {scale === 'normal' && 'Normal (100%)'}
                    {scale === 'large' && 'Large (110%)'}
                    {scale === 'xlarge' && 'Extra (125%)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1A203C]">
              <div>
                <div className="text-xs font-mono text-slate-200">Reduce Motion</div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Disables screen slides and stamp animations
                </div>
              </div>
              <Button
                variant={reducedMotion ? 'primary' : 'secondary'}
                size="sm"
                onClick={handleToggleReducedMotion}
              >
                {reducedMotion ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>

          {/* Section: Storage & Cache Manager */}
          <div className="p-4 bg-[#0E1224] border border-[#232A47] rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#C084FC]" />
                <div>
                  <h3 className="font-pixel text-xs text-white">STORAGE & CACHE</h3>
                  <p className="text-xs text-slate-400 font-sans">
                    LocalStorage: {storageStats.usedKb} KB used ({storageStats.cacheKb} KB dynamic cache)
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearCaches}
                className="flex items-center gap-1.5"
                title="Free up cache storage without resetting level scores"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                Clear Cache
              </Button>
            </div>

            <div className="pt-2 border-t border-[#1A203C] flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-[#EF4444] font-bold">Reset All Progress</div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Clears all concept streaks, XP, star records, and history
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset All
              </Button>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Dialog for Reset All */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="RESET ALL PROGRESS?"
        message="This action will erase all accumulated XP, concept mastery streaks, and level completions. Your active course structure will remain intact."
        confirmLabel="Reset All Progress"
        variant="danger"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </>
  );
}
