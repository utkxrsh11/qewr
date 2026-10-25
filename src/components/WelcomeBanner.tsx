import React, { useState } from 'react';
import { Sparkles, HelpCircle, X } from 'lucide-react';
import { Button } from './common/Button.tsx';

export interface WelcomeBannerProps {
  onOpenHowItWorks: () => void;
  onDismiss?: () => void;
}

export function WelcomeBanner({ onOpenHowItWorks, onDismiss }: WelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('studyquest_welcomed') === 'true';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem('studyquest_welcomed', 'true');
    } catch (e) {
      console.warn('Failed to save welcome dismiss flag:', e);
    }
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 mb-4 animate-fade-in">
      <div className="relative p-4 sm:p-5 bg-gradient-to-r from-[#12162B] via-[#1A203C] to-[#12162B] border-2 border-[#F5C542]/50 rounded-xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#F5C542]/15 border border-[#F5C542]/30 text-[#F5C542] shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-pixel text-xs text-[#F5C542] tracking-wider">
                WELCOME TO STUDYQUEST
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/40">
                PHASE 7 POLISHED
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed max-w-2xl">
              Turn any study material into interactive dungeon levels. Test your mastery across Concept Runner, Lie Hunter, and Process Platformer while intelligent spaced repetition keeps you exam-ready.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenHowItWorks}
            className="flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#2DD4BF]" />
            How it works
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#232A47] transition-colors cursor-pointer"
            aria-label="Dismiss welcome banner"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
