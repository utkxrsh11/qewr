import React from 'react';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showPercent?: boolean;
  color?: 'gold' | 'teal' | 'green' | 'red';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = false,
  color = 'gold',
  size = 'md',
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[size];

  const colorClasses = {
    gold: 'bg-[#F5C542]',
    teal: 'bg-[#2DD4BF]',
    green: 'bg-[#22C55E]',
    red: 'bg-[#EF4444]',
  }[color];

  return (
    <div className={`w-full ${className}`} role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Progress'}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-1">
          {label && <span>{label}</span>}
          {showPercent && <span className="font-bold text-slate-200">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-[#1A203C] border border-[#232A47] rounded-full overflow-hidden ${heightClasses}`}>
        <div
          className={`${heightClasses} ${colorClasses} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
