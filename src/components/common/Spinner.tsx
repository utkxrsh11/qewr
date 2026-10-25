import React from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function Spinner({ size = 'md', label, className = '' }: SpinnerProps) {
  const pixelSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`} role="status">
      <div className={`relative ${pixelSizes} animate-spin`}>
        <div className="absolute top-0 left-0 w-2 h-2 bg-[#F5C542] rounded-xs" />
        <div className="absolute top-0 right-0 w-2 h-2 bg-[#2DD4BF] rounded-xs" />
        <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#F5C542] rounded-xs" />
        <div className="absolute bottom-0 left-0 w-2 h-2 bg-[#2DD4BF] rounded-xs" />
      </div>
      {label && <span className="font-pixel text-[10px] text-slate-400 tracking-wider">{label}</span>}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
