import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'gold' | 'teal' | 'purple' | 'red' | 'green' | 'muted';
  size?: 'sm' | 'md';
}

export function Badge({
  variant = 'gold',
  size = 'md',
  className = '',
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    gold: 'bg-[#F5C542]/15 text-[#F5C542] border border-[#F5C542]/30',
    teal: 'bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30',
    purple: 'bg-[#C084FC]/15 text-[#C084FC] border border-[#C084FC]/30',
    red: 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30',
    green: 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30',
    muted: 'bg-[#1E2542] text-slate-400 border border-[#2B355E]',
  }[variant];

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded-md uppercase tracking-wider select-none ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
