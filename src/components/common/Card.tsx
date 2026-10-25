import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'raised' | 'overlay' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  variant = 'surface',
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6 sm:p-8',
  }[padding];

  const variantClasses = {
    surface: 'bg-[#12162B] border border-[#232A47]',
    raised: 'bg-[#1A203C] border border-[#2D365C] shadow-lg',
    overlay: 'bg-[#20284D] border border-[#384370] shadow-2xl',
    interactive:
      'bg-[#12162B] border-2 border-[#232A47] hover:border-[#384370] hover:shadow-[0_0_16px_rgba(45,212,191,0.12)] transition-all duration-150',
  }[variant];

  return (
    <div className={`rounded-xl ${paddingClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </div>
  );
}
