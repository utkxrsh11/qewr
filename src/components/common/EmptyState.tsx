import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button.tsx';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 bg-[#12162B]/60 border border-[#232A47] rounded-xl ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-[#1A203C] border border-[#2D365C] flex items-center justify-center text-[#F5C542] mb-3">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="font-pixel text-xs sm:text-sm text-slate-200 mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-4 leading-relaxed font-sans">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
