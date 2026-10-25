import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const TIPS = [
  'Every question links back to a specific concept in your course material.',
  'Spaced repetition schedules reviews just before concepts fade from memory.',
  'Mastery streaks increase when you achieve 80%+ accuracy on first tries.',
  'The World Map highlights which concepts need urgent review with glowing danger nodes.',
  'Lie Hunter sharpens critical analysis by asking you to identify subtly falsified facts.',
  'Process Platformer tests sequential logic and step-by-step understanding.',
  'Exam readiness calculates retention strength decayed over time across all concepts.',
  'Tip: Press 1-4 on your keyboard during Concept Runner for lightning-fast answers.',
  'Smart Revision automatically prioritizes weak and overdue concepts in new game formats.',
  'Tip: Press "?" at any time to open the keyboard shortcuts reference.',
];

export function RotatingTips({ className = '' }: { className?: string }) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`flex items-center justify-center gap-2 text-xs font-mono text-slate-400 bg-[#12162B]/70 border border-[#232A47] px-4 py-2.5 rounded-lg max-w-lg mx-auto transition-opacity duration-300 animate-fade-in ${className}`}
      aria-live="polite"
    >
      <Sparkles className="w-3.5 h-3.5 text-[#F5C542] shrink-0" aria-hidden="true" />
      <span className="text-center">{TIPS[tipIndex]}</span>
    </div>
  );
}
