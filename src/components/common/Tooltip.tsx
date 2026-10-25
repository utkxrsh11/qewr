import React, { useState } from 'react';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const posClasses =
    position === 'top'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
      : 'top-full left-1/2 -translate-x-1/2 mt-2';

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div
          role="tooltip"
          className={`absolute ${posClasses} z-50 px-2.5 py-1 text-xs font-mono text-slate-200 bg-[#0E1224] border border-[#2B355E] rounded shadow-lg whitespace-nowrap pointer-events-none animate-fade-in`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
