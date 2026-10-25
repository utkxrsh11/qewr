import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabledReason?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabledReason,
      disabled = false,
      className = '',
      children,
      title,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;
    const computedTitle = isDisabled && disabledReason ? disabledReason : title;

    // Size styles
    const sizeClasses = {
      sm: 'px-2.5 py-1 text-xs font-mono',
      md: 'px-4 py-2 text-xs sm:text-sm font-mono',
      lg: 'px-6 py-3 text-sm sm:text-base font-pixel',
    }[size];

    // Variant styles
    const variantClasses = {
      primary: 'btn-pixel-gold',
      secondary: 'btn-pixel-dark',
      danger: 'btn-pixel-red',
      ghost:
        'bg-transparent text-slate-300 hover:text-white hover:bg-[#1A203C] border border-transparent rounded-md transition-colors',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        title={computedTitle}
        aria-disabled={isDisabled}
        className={`inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C542] select-none ${sizeClasses} ${variantClasses} ${
          isDisabled ? 'opacity-60 cursor-not-allowed' : ''
        } ${className}`}
        {...props}
      >
        {isLoading && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-current" aria-hidden="true" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
